import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 8_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function tgUrl(token: string, method: string) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: state } = await supabase.from("telegram_bot_state").select("update_offset").eq("id", 1).single();
  let currentOffset = state?.update_offset || 0;

  // Load categories once for AI
  const categoryTree = await loadCategoryTree(supabase);

  const mediaGroupMap = new Map<string, { messages: any[]; chatId: number; lastSeen: number }>();

  while (Date.now() - startTime < MAX_RUNTIME_MS - MIN_REMAINING_MS) {
    const resp = await fetch(tgUrl(TELEGRAM_API_KEY, "getUpdates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset: currentOffset, timeout: 10, allowed_updates: ["message"] }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      console.error("Telegram API info:", data);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const updates = data.result ?? [];
    const now = Date.now();

    for (const [gid, grp] of mediaGroupMap) {
      if (now - grp.lastSeen > 3000) {
        await handleGroup(gid, grp.messages, grp.chatId, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY, categoryTree);
        mediaGroupMap.delete(gid);
      }
    }

    if (updates.length === 0) { await new Promise(r => setTimeout(r, 500)); continue; }

    const singles: any[] = [];
    for (const u of updates) {
      const msg = u.message; if (!msg) continue;
      if (msg.media_group_id) {
        const gid = msg.media_group_id;
        if (!mediaGroupMap.has(gid)) mediaGroupMap.set(gid, { messages: [], chatId: msg.chat.id, lastSeen: now });
        mediaGroupMap.get(gid)!.messages.push(msg);
        mediaGroupMap.get(gid)!.lastSeen = now;
      } else { singles.push(msg); }
    }

    for (const msg of singles) await handleSingle(msg, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY, categoryTree);
    currentOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from("telegram_bot_state").update({ update_offset: currentOffset }).eq("id", 1);
  }

  for (const [gid, grp] of mediaGroupMap) {
    await handleGroup(gid, grp.messages, grp.chatId, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY, categoryTree);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});

// ─── Category tree ──────────────────────────────────────────
async function loadCategoryTree(supabase: any) {
  const { data: cats } = await supabase.from("categories").select("id,slug,name,parent_id").eq("is_active", true).order("sort_order");
  if (!cats) return "";
  const parents = cats.filter((c: any) => !c.parent_id);
  return parents.map((p: any) => {
    const children = cats.filter((c: any) => c.parent_id === p.id);
    const childStr = children.map((c: any) => c.slug).join(", ");
    return `${p.slug}(${p.name}): [${childStr}]`;
  }).join("\n");
}

// ─── Group (album) handler ──────────────────────────────────
async function handleGroup(groupId: string, messages: any[], chatId: number, supabase: any, lovableKey: string, telegramKey: string, categoryTree: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) return;

  const photoMsgs = messages.filter(m => m.photo);
  const videoMsgs = messages.filter(m => m.video);
  const caption = messages.find(m => m.caption)?.caption || "";

  // Upload all photos in parallel
  const imageUploads = photoMsgs.map(m =>
    downloadAndUpload(m.photo[m.photo.length - 1].file_id, "listing-images", "image/jpeg", telegramKey, supabase)
  );
  const imageUrls = (await Promise.all(imageUploads)).filter(Boolean) as string[];

  // Upload first video if exists
  let videoUrl: string | null = null;
  if (videoMsgs.length > 0) {
    const vid = videoMsgs[0].video;
    const mime = vid.mime_type || "video/mp4";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    videoUrl = await downloadAndUpload(vid.file_id, "listing-videos", mime, telegramKey, supabase, ext);
  }

  if (!imageUrls.length && !videoUrl) return;
  await sendMessage(chatId, `⏳ ${imageUrls.length} şəkil${videoUrl ? " + 1 video" : ""} emal olunur...`, telegramKey);
  await createListing(chatId, imageUrls, videoUrl, caption, groupId, settings, supabase, lovableKey, telegramKey, categoryTree);
}

// ─── Single message handler ─────────────────────────────────
async function handleSingle(msg: any, supabase: any, lovableKey: string, telegramKey: string, categoryTree: string) {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption || "";

  if (text === "/ping") { await sendMessage(chatId, "🟢 v7.0 - Video + Albom + Alt-kateqoriya + Forward dəstəyi", telegramKey); return; }
  if (text.startsWith("/start")) return handleStart(chatId, text, supabase, telegramKey);
  if (text.startsWith("/store")) return handleStoreSelect(chatId, text, supabase, telegramKey);
  if (text.startsWith("/markup")) return handleMarkup(chatId, text, supabase, telegramKey);
  if (text === "/settings") return handleSettings(chatId, supabase, telegramKey);

  // Check if message has media (photo, video, or document with image/video)
  const hasPhoto = !!msg.photo;
  const hasVideo = !!msg.video;
  const hasVideoDoc = msg.document?.mime_type?.startsWith("video/");
  const hasImageDoc = msg.document?.mime_type?.startsWith("image/");

  if (!hasPhoto && !hasVideo && !hasVideoDoc && !hasImageDoc) return;

  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) { await sendMessage(chatId, "⚠️ /store ilə mağaza seçin.", telegramKey); return; }
  await sendMessage(chatId, "⏳ Emal olunur...", telegramKey);

  let imageUrls: string[] = [];
  let videoUrl: string | null = null;

  if (hasPhoto) {
    const url = await downloadAndUpload(msg.photo[msg.photo.length - 1].file_id, "listing-images", "image/jpeg", telegramKey, supabase);
    if (url) imageUrls.push(url);
  }
  if (hasImageDoc) {
    const url = await downloadAndUpload(msg.document.file_id, "listing-images", msg.document.mime_type, telegramKey, supabase);
    if (url) imageUrls.push(url);
  }
  if (hasVideo) {
    videoUrl = await downloadAndUpload(msg.video.file_id, "listing-videos", msg.video.mime_type || "video/mp4", telegramKey, supabase, "mp4");
  }
  if (hasVideoDoc) {
    videoUrl = await downloadAndUpload(msg.document.file_id, "listing-videos", msg.document.mime_type, telegramKey, supabase, "mp4");
  }

  await createListing(chatId, imageUrls, videoUrl, msg.caption || "", undefined, settings, supabase, lovableKey, telegramKey, categoryTree);
}

// ─── Create listing ─────────────────────────────────────────
async function createListing(chatId: number, imageUrls: string[], videoUrl: string | null, caption: string, groupId: string | undefined, settings: any, supabase: any, lovableKey: string, telegramKey: string, categoryTree: string) {
  const ai = await analyzeWithAI(imageUrls[0] || null, caption, lovableKey, categoryTree);
  const costPrice = Number(ai.price) || 0;
  const sellingPrice = costPrice > 0
    ? (settings.markup_type === "percent"
      ? Math.round(costPrice * (1 + settings.markup_value / 100))
      : costPrice + settings.markup_value)
    : 0;

  const insertData: any = {
    user_id: settings.user_id,
    store_id: settings.store_id,
    title: ai.title || "Məhsul",
    description: ai.description || caption,
    price: sellingPrice,
    cost_price: costPrice,
    condition: ai.condition || "Yeni",
    category: ai.subcategory || ai.category || settings.target_category,
    location: settings.target_location,
    image_urls: imageUrls,
    telegram_media_group_id: groupId || null,
    is_active: false,
    status: "pending",
  };

  if (videoUrl) insertData.video_url = videoUrl;

  const { error } = await supabase.from("listings").insert(insertData);
  if (!error) {
    const videoInfo = videoUrl ? "\n🎬 Video əlavə edildi" : "";
    await sendMessage(chatId, `✅ <b>Elan yaradıldı!</b>\n📝 ${ai.title}\n📁 ${ai.subcategory || ai.category}\n💰 ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📸 ${imageUrls.length} şəkil${videoInfo}\n⏳ Admin təsdiqi gözləyir.`, telegramKey);
  } else {
    console.error(error.message);
    await sendMessage(chatId, `❌ Xəta: ${error.message}`, telegramKey);
  }
}

// ─── AI Analysis with subcategory ───────────────────────────
async function analyzeWithAI(imageUrl: string | null, caption: string, lovableKey: string, categoryTree: string) {
  try {
    const content: any[] = imageUrl ? [{ type: "image_url", image_url: { url: imageUrl } }] : [];
    content.push({ type: "text", text: caption || "Bu məhsulu analiz et." });

    const systemPrompt = `Sən e-ticarət məhsul analitikisisən. Azərbaycan dilində cavab ver.

Kateqoriya ağacı (ana_kateqoriya: [alt_kateqoriyalar]):
${categoryTree}

QAYDALAR:
1. "description" sahəsində QİYMƏT və RƏQƏM YAZMA, yalnız şəkilə əsaslanan yaradıcı satış mətni yaz.
2. Mətndəki rəqəmi yalnız "price" sahəsinə yaz.
3. "category" sahəsinə ən uyğun ANA kateqoriyanın SLUG-unu yaz.
4. "subcategory" sahəsinə ən uyğun ALT kateqoriyanın SLUG-unu yaz. Əgər alt kateqoriya tapılmazsa boş string qaytar.
5. Şəkilə diqqətlə bax və məhsulun növünə görə düzgün kateqoriya seç.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content }],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Məhsul məlumatlarını çıxar",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Məhsulun adı" },
                description: { type: "string", description: "Satış mətni (qiymət olmadan)" },
                price: { type: "number", description: "Qiymət (AZN)" },
                category: { type: "string", description: "Ana kateqoriya slug" },
                subcategory: { type: "string", description: "Alt kateqoriya slug (boş ola bilər)" },
                condition: { type: "string", enum: ["Yeni", "Yeni kimi", "İşlənmiş"] },
              },
              required: ["title", "description", "price", "category", "subcategory", "condition"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      }),
    });
    const d = await res.json();
    const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (args) return JSON.parse(args);
  } catch (e) { console.error("AI:", e); }
  const m = caption.match(/(\d+[\.,]?\d*)/);
  return { title: caption.split("\n")[0] || "Məhsul", description: caption, price: m ? parseFloat(m[1].replace(",", ".")) : 0, category: "", subcategory: "", condition: "Yeni" };
}

// ─── File download & upload ─────────────────────────────────
async function downloadAndUpload(fileId: string, bucket: string, contentType: string, telegramKey: string, supabase: any, ext?: string): Promise<string | null> {
  try {
    const fr = await fetch(tgUrl(telegramKey, "getFile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fd = await fr.json();
    const filePath = fd.result?.file_path;
    if (!filePath) return null;

    const dr = await fetch(`https://api.telegram.org/file/bot${telegramKey}/${filePath}`);
    const bytes = await dr.arrayBuffer();

    const fileExt = ext || filePath.split(".").pop() || "jpg";
    const name = `telegram/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    await supabase.storage.from(bucket).upload(name, bytes, { contentType });
    return supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;
  } catch (e) {
    console.error("Upload error:", e);
    return null;
  }
}

// ─── Telegram helpers ───────────────────────────────────────
async function sendMessage(chatId: number, text: string, telegramKey: string) {
  await fetch(tgUrl(telegramKey, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function handleStart(chatId: number, text: string, supabase: any, telegramKey: string) {
  const token = text.split(" ")[1];
  if (token) {
    await supabase.from("telegram_bot_settings").upsert({ telegram_chat_id: chatId, user_id: token }, { onConflict: "telegram_chat_id" });
    const { data: stores } = await supabase.from("stores").select("id,name").eq("user_id", token).eq("status", "approved");
    await sendMessage(chatId, `✅ Hesab bağlandı!\n\n${stores?.map((s: any, i: number) => `${i + 1}. ${s.name}`).join("\n") || "Mağaza yoxdur"}\n\nSeçmək: /store 1`, telegramKey);
  }
}

async function handleStoreSelect(chatId: number, text: string, supabase: any, telegramKey: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("user_id").eq("telegram_chat_id", chatId).single();
  if (!s) return;
  const { data: stores } = await supabase.from("stores").select("id,name").eq("user_id", s.user_id).eq("status", "approved");
  const idx = parseInt(text.split(" ")[1]) - 1;
  if (stores?.[idx]) {
    await supabase.from("telegram_bot_settings").update({ store_id: stores[idx].id }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, `✅ ${stores[idx].name} seçildi`, telegramKey);
  } else {
    await sendMessage(chatId, (stores?.map((s: any, i: number) => `${i + 1}. ${s.name}`).join("\n") || "") + "\n\nMisal: /store 1", telegramKey);
  }
}

async function handleMarkup(chatId: number, text: string, supabase: any, telegramKey: string) {
  const p = text.split(" "); if (p.length < 3) return;
  await supabase.from("telegram_bot_settings").update({ markup_type: p[1] === "faiz" ? "percent" : "fixed", markup_value: parseFloat(p[2]) }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Qiymət əlavəsi: ${p[1] === "faiz" ? p[2] + "%" : p[2] + "₼"}`, telegramKey);
}

async function handleSettings(chatId: number, supabase: any, telegramKey: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("*, stores(name)").eq("telegram_chat_id", chatId).single();
  if (s) await sendMessage(chatId, `⚙️ Mağaza: ${(s as any).stores?.name || "Yox"}\nMarkup: ${s.markup_value}${s.markup_type === "percent" ? "%" : "₼"}`, telegramKey);
}
