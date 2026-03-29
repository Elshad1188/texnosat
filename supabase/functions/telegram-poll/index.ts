import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// BİRBAŞA TELEGRAM API - Lovable gateway bypass (upstream_request_failed həll olundu)
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

  // KRITIK: MAP WHILE-DAN ÇÖLDƏ - bütün iterasiyalarda eyni qrup yaddaşda qalır
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

    // 3 saniyədir yeni şəkil gəlməyən qrupları elan et (flush)
    for (const [gid, grp] of mediaGroupMap) {
      if (now - grp.lastSeen > 3000) {
        await handleGroup(gid, grp.messages, grp.chatId, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
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

    for (const msg of singles) await handleSingle(msg, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    currentOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from("telegram_bot_state").update({ update_offset: currentOffset }).eq("id", 1);
  }

  for (const [gid, grp] of mediaGroupMap) {
    await handleGroup(gid, grp.messages, grp.chatId, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});

async function handleGroup(groupId: string, messages: any[], chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) return;
  const uploads = messages.filter(m => m.photo).map(m =>
    downloadAndUpload(m.photo[m.photo.length - 1].file_id, telegramKey, supabase)
  );
  const imageUrls = (await Promise.all(uploads)).filter(Boolean) as string[];
  if (!imageUrls.length) return;
  const caption = messages.find(m => m.caption)?.caption || "";
  await sendMessage(chatId, `⏳ ${imageUrls.length} şəkil birləşdirilir...`, telegramKey);
  await createListing(chatId, imageUrls, caption, groupId, settings, supabase, lovableKey, telegramKey);
}

async function handleSingle(msg: any, supabase: any, lovableKey: string, telegramKey: string) {
  const chatId = msg.chat.id; const text = msg.text || msg.caption || "";
  if (text === "/ping") { await sendMessage(chatId, "🟢 v6.0 - Direct Telegram API (Final Fix) - Albom dəstəyi aktivdir", telegramKey); return; }
  if (text.startsWith("/start")) return handleStart(chatId, text, supabase, telegramKey);
  if (text.startsWith("/store")) return handleStoreSelect(chatId, text, supabase, telegramKey);
  if (text.startsWith("/markup")) return handleMarkup(chatId, text, supabase, telegramKey);
  if (text === "/settings") return handleSettings(chatId, supabase, telegramKey);
  if (!msg.photo) return;
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) { await sendMessage(chatId, "⚠️ /store ilə mağaza seçin.", telegramKey); return; }
  await sendMessage(chatId, "⏳ Emal olunur...", telegramKey);
  const url = await downloadAndUpload(msg.photo[msg.photo.length - 1].file_id, telegramKey, supabase);
  await createListing(chatId, url ? [url] : [], msg.caption || "", undefined, settings, supabase, lovableKey, telegramKey);
}

async function createListing(chatId: number, imageUrls: string[], caption: string, groupId: string | undefined, settings: any, supabase: any, lovableKey: string, telegramKey: string) {
  const ai = await analyzeWithAI(imageUrls[0] || null, caption, lovableKey, supabase);
  const costPrice = Number(ai.price) || 0;
  const sellingPrice = costPrice > 0 ? (settings.markup_type === "percent" ? Math.round(costPrice * (1 + settings.markup_value / 100)) : costPrice + settings.markup_value) : 0;
  const { error } = await supabase.from("listings").insert({
    user_id: settings.user_id, store_id: settings.store_id,
    title: ai.title || "Məhsul", description: ai.description || caption,
    price: sellingPrice, cost_price: costPrice, condition: ai.condition || "Yeni",
    category: ai.category || settings.target_category, location: settings.target_location,
    image_urls: imageUrls, telegram_media_group_id: groupId || null, is_active: false, status: "pending",
  });
  if (!error) await sendMessage(chatId, `✅ <b>Elan yaradıldı!</b>\n📝 ${ai.title}\n💰 ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📸 ${imageUrls.length} şəkil\n⏳ Admin təsdiqi gözləyir.`, telegramKey);
  else { console.error(error.message); await sendMessage(chatId, `❌ Xəta: ${error.message}`, telegramKey); }
}

async function analyzeWithAI(imageUrl: string | null, caption: string, lovableKey: string, supabase: any) {
  try {
    const { data: cats } = await supabase.from("categories").select("slug,name").eq("is_active", true).is("parent_id", null);
    const catStr = (cats || []).map((c: any) => `${c.slug}(${c.name})`).join(", ");
    const content: any[] = imageUrl ? [{ type: "image_url", image_url: { url: imageUrl } }] : [];
    content.push({ type: "text", text: caption || "Analiz et." });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [{ role: "system", content: `Azerbaycan dilinde cavab ver. Kateqoriyalar: ${catStr}. QAYDA: description sahesinde qiymet ve reqem yazma, yalniz sekile baxaraq yaradici satis metni yaz.` }, { role: "user", content }],
        tools: [{ type: "function", function: { name: "extract", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, price: { type: "number" }, category: { type: "string" }, condition: { type: "string", enum: ["Yeni", "Yeni kimi", "İşlənmiş"] } }, required: ["title", "description", "price", "category", "condition"] } } }],
        tool_choice: { type: "function", function: { name: "extract" } },
      })
    });
    const d = await res.json();
    const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (args) return JSON.parse(args);
  } catch (e) { console.error("AI:", e); }
  const m = caption.match(/(\d+[\.,]?\d*)/);
  return { title: caption.split("\n")[0] || "Məhsul", description: caption, price: m ? parseFloat(m[1].replace(",", ".")) : 0, category: "", condition: "Yeni" };
}

async function downloadAndUpload(fileId: string, telegramKey: string, supabase: any): Promise<string | null> {
  try {
    const fr = await fetch(tgUrl(telegramKey, "getFile"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId }) });
    const fd = await fr.json();
    const filePath = fd.result?.file_path;
    if (!filePath) return null;
    const dr = await fetch(`https://api.telegram.org/file/bot${telegramKey}/${filePath}`);
    const bytes = await dr.arrayBuffer();
    const name = `telegram/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    await supabase.storage.from("listing-images").upload(name, bytes, { contentType: "image/jpeg" });
    return supabase.storage.from("listing-images").getPublicUrl(name).data.publicUrl;
  } catch { return null; }
}

async function sendMessage(chatId: number, text: string, telegramKey: string) {
  await fetch(tgUrl(telegramKey, "sendMessage"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }) });
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
