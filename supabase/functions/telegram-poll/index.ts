import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 8_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getBotToken(supabase: any): Promise<string> {
  // First try site_settings (admin-managed)
  const { data } = await supabase.from("site_settings").select("value").eq("key", "telegram_bot").maybeSingle();
  const token = data?.value?.bot_token;
  if (token) return token;
  // Fallback to env var
  const envToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (envToken) return envToken;
  throw new Error("Telegram bot token tapılmadı. Admin paneldən bot tokenini daxil edin.");
}

function telegramUrl(token: string, method: string) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let botToken: string;
  try {
    botToken = await getBotToken(supabase);
  } catch (e: any) {
    console.error(e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }

  const { data: state } = await supabase.from("telegram_bot_state").select("update_offset").eq("id", 1).single();
  let currentOffset = state?.update_offset || 0;

  const categoryTree = await loadCategoryTree(supabase);
  const mediaGroupMap = new Map<string, { messages: any[]; chatId: number; lastSeen: number }>();

  while (Date.now() - startTime < MAX_RUNTIME_MS - MIN_REMAINING_MS) {
    const resp = await fetch(telegramUrl(botToken, "getUpdates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset: currentOffset, timeout: 10, allowed_updates: ["message"] }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      if (data.error_code === 409) {
        return new Response(JSON.stringify({ ok: true, skipped: "another instance running" }), { headers: corsHeaders });
      }
      console.error("Telegram API error:", JSON.stringify(data));
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const updates = data.result ?? [];
    const now = Date.now();

    for (const [gid, grp] of mediaGroupMap) {
      if (now - grp.lastSeen > 3000) {
        await handleGroup(gid, grp.messages, grp.chatId, supabase, lovableKey, botToken, categoryTree);
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

    for (const msg of singles) await handleSingle(msg, supabase, lovableKey, botToken, categoryTree);
    currentOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from("telegram_bot_state").update({ update_offset: currentOffset }).eq("id", 1);
  }

  for (const [gid, grp] of mediaGroupMap) {
    await handleGroup(gid, grp.messages, grp.chatId, supabase, lovableKey, botToken, categoryTree);
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
async function handleGroup(groupId: string, messages: any[], chatId: number, supabase: any, lovableKey: string, botToken: string, categoryTree: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) return;

  const photoMsgs = messages.filter(m => m.photo);
  const videoMsgs = messages.filter(m => m.video);
  const caption = messages.find(m => m.caption)?.caption || "";

  const imageUploads = photoMsgs.map(m =>
    downloadAndUpload(m.photo[m.photo.length - 1].file_id, "listing-images", "image/jpeg", botToken, supabase)
  );
  const imageUrls = (await Promise.all(imageUploads)).filter(Boolean) as string[];

  let videoUrl: string | null = null;
  if (videoMsgs.length > 0) {
    const vid = videoMsgs[0].video;
    const mime = vid.mime_type || "video/mp4";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    videoUrl = await downloadAndUpload(vid.file_id, "listing-videos", mime, botToken, supabase, ext);
    if (!imageUrls.length && vid.thumbnail) {
      const thumbUrl = await downloadAndUpload(vid.thumbnail.file_id, "listing-images", "image/jpeg", botToken, supabase);
      if (thumbUrl) imageUrls.push(thumbUrl);
    }
  }

  if (!imageUrls.length && !videoUrl) return;
  await sendMessage(chatId, `⏳ ${imageUrls.length} şəkil${videoUrl ? " + 1 video" : ""} emal olunur...`, botToken);
  await createListing(chatId, imageUrls, videoUrl, caption, groupId, settings, supabase, lovableKey, botToken, categoryTree);
}

// ─── Single message handler ─────────────────────────────────
async function handleSingle(msg: any, supabase: any, lovableKey: string, botToken: string, categoryTree: string) {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption || "";

  if (text === "/ping") { await sendMessage(chatId, "🟢 v9.0 - Direct API + Admin Token", botToken); return; }
  if (text.startsWith("/start")) return handleStart(chatId, text, supabase, botToken);
  if (text.startsWith("/store")) return handleStoreSelect(chatId, text, supabase, botToken);
  if (text.startsWith("/markup")) return handleMarkup(chatId, text, supabase, botToken);
  if (text === "/settings") return handleSettings(chatId, supabase, botToken);

  const hasPhoto = !!msg.photo;
  const hasVideo = !!msg.video;
  const hasVideoDoc = msg.document?.mime_type?.startsWith("video/");
  const hasImageDoc = msg.document?.mime_type?.startsWith("image/");

  if (!hasPhoto && !hasVideo && !hasVideoDoc && !hasImageDoc) return;

  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) { await sendMessage(chatId, "⚠️ /store ilə mağaza seçin.", botToken); return; }
  await sendMessage(chatId, "⏳ Emal olunur...", botToken);

  let imageUrls: string[] = [];
  let videoUrl: string | null = null;

  if (hasPhoto) {
    const url = await downloadAndUpload(msg.photo[msg.photo.length - 1].file_id, "listing-images", "image/jpeg", botToken, supabase);
    if (url) imageUrls.push(url);
  }
  if (hasImageDoc) {
    const url = await downloadAndUpload(msg.document.file_id, "listing-images", msg.document.mime_type, botToken, supabase);
    if (url) imageUrls.push(url);
  }
  if (hasVideo) {
    videoUrl = await downloadAndUpload(msg.video.file_id, "listing-videos", msg.video.mime_type || "video/mp4", botToken, supabase, "mp4");
    if (!imageUrls.length && msg.video.thumbnail) {
      const thumbUrl = await downloadAndUpload(msg.video.thumbnail.file_id, "listing-images", "image/jpeg", botToken, supabase);
      if (thumbUrl) imageUrls.push(thumbUrl);
    }
  }
  if (hasVideoDoc) {
    videoUrl = await downloadAndUpload(msg.document.file_id, "listing-videos", msg.document.mime_type, botToken, supabase, "mp4");
    if (!imageUrls.length && msg.document.thumbnail) {
      const thumbUrl = await downloadAndUpload(msg.document.thumbnail.file_id, "listing-images", "image/jpeg", botToken, supabase);
      if (thumbUrl) imageUrls.push(thumbUrl);
    }
  }

  await createListing(chatId, imageUrls, videoUrl, msg.caption || "", undefined, settings, supabase, lovableKey, botToken, categoryTree);
}

// ─── Check store limits ─────────────────────────────────────
async function checkStoreLimit(storeId: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  const { data: store } = await supabase.from("stores").select("is_premium, premium_until").eq("id", storeId).single();
  if (store?.is_premium && (!store.premium_until || new Date(store.premium_until) > new Date())) {
    return { allowed: true };
  }

  const { data: settingsRow } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
  const limits = settingsRow?.value || {};
  const dailyLimit = limits.telegram_bot_daily_limit ?? 5;
  const totalLimit = limits.store_listing_limit ?? 20;

  const { count: totalCount } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("store_id", storeId);
  if ((totalCount || 0) >= totalLimit) {
    return { allowed: false, reason: `Mağazanızda maksimum ${totalLimit} elan limiti dolub. Premium olun limitsiz istifadə edin.` };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: dailyCount } = await supabase.from("listings").select("id", { count: "exact", head: true })
    .eq("store_id", storeId).gte("created_at", today.toISOString());
  if ((dailyCount || 0) >= dailyLimit) {
    return { allowed: false, reason: `Gündəlik ${dailyLimit} elan limiti dolub. Premium olun limitsiz istifadə edin.` };
  }

  return { allowed: true };
}

// ─── Create listing ─────────────────────────────────────────
async function createListing(chatId: number, imageUrls: string[], videoUrl: string | null, caption: string, groupId: string | undefined, settings: any, supabase: any, lovableKey: string, botToken: string, categoryTree: string) {
  const limitCheck = await checkStoreLimit(settings.store_id, supabase);
  if (!limitCheck.allowed) {
    await sendMessage(chatId, `⚠️ ${limitCheck.reason}`, botToken);
    return;
  }

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
    await sendMessage(chatId, `✅ <b>Elan yaradıldı!</b>\n📝 ${ai.title}\n📁 ${ai.subcategory || ai.category}\n💰 ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📸 ${imageUrls.length} şəkil${videoInfo}\n⏳ Admin təsdiqi gözləyir.`, botToken);
  } else {
    console.error(error.message);
    await sendMessage(chatId, `❌ Xəta: ${error.message}`, botToken);
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

// ─── File download & upload via Direct API ──────────────────
async function downloadAndUpload(fileId: string, bucket: string, contentType: string, botToken: string, supabase: any, ext?: string): Promise<string | null> {
  try {
    const fr = await fetch(telegramUrl(botToken, "getFile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const fd = await fr.json();
    const filePath = fd.result?.file_path;
    if (!filePath) return null;

    const dr = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
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

// ─── Telegram helpers via Direct API ────────────────────────
async function sendMessage(chatId: number, text: string, botToken: string) {
  await fetch(telegramUrl(botToken, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function handleStart(chatId: number, text: string, supabase: any, botToken: string) {
  const token = text.split(" ")[1];
  if (token) {
    await supabase.from("telegram_bot_settings").upsert({ telegram_chat_id: chatId, user_id: token }, { onConflict: "telegram_chat_id" });
    const { data: stores } = await supabase.from("stores").select("id,name").eq("user_id", token).eq("status", "approved");
    await sendMessage(chatId, `✅ Hesab bağlandı!\n\n${stores?.map((s: any, i: number) => `${i + 1}. ${s.name}`).join("\n") || "Mağaza yoxdur"}\n\nSeçmək: /store 1`, botToken);
  }
}

async function handleStoreSelect(chatId: number, text: string, supabase: any, botToken: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("user_id").eq("telegram_chat_id", chatId).single();
  if (!s) return;
  const { data: stores } = await supabase.from("stores").select("id,name").eq("user_id", s.user_id).eq("status", "approved");
  const idx = parseInt(text.split(" ")[1]) - 1;
  if (stores?.[idx]) {
    await supabase.from("telegram_bot_settings").update({ store_id: stores[idx].id }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, `✅ ${stores[idx].name} seçildi`, botToken);
  } else {
    await sendMessage(chatId, (stores?.map((s: any, i: number) => `${i + 1}. ${s.name}`).join("\n") || "") + "\n\nMisal: /store 1", botToken);
  }
}

async function handleMarkup(chatId: number, text: string, supabase: any, botToken: string) {
  const p = text.split(" "); if (p.length < 3) return;
  await supabase.from("telegram_bot_settings").update({ markup_type: p[1] === "faiz" ? "percent" : "fixed", markup_value: parseFloat(p[2]) }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Qiymət əlavəsi: ${p[1] === "faiz" ? p[2] + "%" : p[2] + "₼"}`, botToken);
}

async function handleSettings(chatId: number, supabase: any, botToken: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("*, stores(name)").eq("telegram_chat_id", chatId).single();
  if (s) await sendMessage(chatId, `⚙️ Mağaza: ${(s as any).stores?.name || "Yox"}\nMarkup: ${s.markup_value}${s.markup_type === "percent" ? "%" : "₼"}`, botToken);
}
