import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 8_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: state } = await supabase.from("telegram_bot_state").select("update_offset").eq("id", 1).single();
  let currentOffset = state?.update_offset || 0;

  while (Date.now() - startTime < MAX_RUNTIME_MS - MIN_REMAINING_MS) {
    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TELEGRAM_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ offset: currentOffset, timeout: 15, allowed_updates: ["message"] }),
    });

    const data = await response.json();
    if (!response.ok) break;

    const updates = data.result ?? [];
    if (updates.length === 0) { await new Promise(r => setTimeout(r, 300)); continue; }

    // =====================================================
    // MƏRHƏLƏ 1: Bütün şəkilləri grupla, heç bir elan yaratma
    // =====================================================
    const seenGroupIds = new Set<string>();
    const singleMessages: any[] = [];
    const mediaGroupMap: Map<string, { messages: any[], chatId: number }> = new Map();

    for (const update of updates) {
      const msg = update.message;
      if (!msg) continue;
      const gid = msg.media_group_id;
      if (gid) {
        if (!mediaGroupMap.has(gid)) mediaGroupMap.set(gid, { messages: [], chatId: msg.chat.id });
        mediaGroupMap.get(gid)!.messages.push(msg);
      } else {
        singleMessages.push(msg);
      }
    }

    // Tək (qrup olmayan) mesajları emal et
    for (const msg of singleMessages) {
      await processNonGroupMessage(msg, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    // =====================================================
    // MƏRHƏLƏ 2: Media qrupları üçün şəkilləri upload et, sonra BİR DƏFƏ elan yarat
    // =====================================================
    for (const [gid, group] of mediaGroupMap.entries()) {
      await processMediaGroupComplete(gid, group.messages, group.chatId, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    currentOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from("telegram_bot_state").update({ update_offset: currentOffset }).eq("id", 1);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});

// =====================================================
// Media Group Funksiyası (Tam birləşdirilib, yalnız bir dəfə elan yaradılır)
// =====================================================
async function processMediaGroupComplete(groupId: string, messages: any[], chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) return;

  // Bütün şəkilləri paralel upload et
  const uploadPromises = messages
    .filter(m => m.photo || (m.document && m.document.mime_type?.startsWith("image/")))
    .map(m => {
      const fileId = m.photo ? m.photo[m.photo.length - 1].file_id : m.document.file_id;
      return downloadAndUploadFile(fileId, "listing-images", supabase, lovableKey, telegramKey);
    });

  const uploadedUrls = await Promise.all(uploadPromises);
  const imageUrls = uploadedUrls.filter(u => !!u) as string[];
  
  if (imageUrls.length === 0) return;

  const caption = messages.find(m => m.caption)?.caption || "";

  await sendMessage(chatId, `⏳ ${imageUrls.length} şəkil birləşdirilir...`, lovableKey, telegramKey);
  
  await createListing(chatId, imageUrls, caption, groupId, settings, supabase, lovableKey, telegramKey);
}

// =====================================================
// Tək Mesaj Funksiyası
// =====================================================
async function processNonGroupMessage(msg: any, supabase: any, lovableKey: string, telegramKey: string) {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption || "";

  if (text.startsWith("/start")) return handleStart(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/store")) return handleStoreSelect(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/markup")) return handleMarkup(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/category")) return handleCategory(chatId, text, supabase, lovableKey, telegramKey);
  if (text === "/settings") return handleSettings(chatId, supabase, lovableKey, telegramKey);

  if (msg.photo || msg.video) {
    const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
    if (!settings?.store_id) {
      await sendMessage(chatId, "⚠️ Mağaza seçilməyib. /store istifadə edin.", lovableKey, telegramKey);
      return;
    }
    await sendMessage(chatId, "⏳ Ağıllı emal olunur...", lovableKey, telegramKey);
    const imageUrl = msg.photo ? await downloadAndUploadFile(msg.photo[msg.photo.length - 1].file_id, "listing-images", supabase, lovableKey, telegramKey) : null;
    await createListing(chatId, imageUrl ? [imageUrl] : [], msg.caption || "", undefined, settings, supabase, lovableKey, telegramKey);
  }
}

// =====================================================
// Elan Yaratma (mərkəzi funksiya)
// =====================================================
async function createListing(chatId: number, imageUrls: string[], caption: string, groupId: string | undefined, settings: any, supabase: any, lovableKey: string, telegramKey: string) {
  const productInfo = await analyzeWithAI(imageUrls[0] || null, caption, lovableKey, supabase);

  const costPrice = parseFloat(productInfo.price?.toString() || "0") || 0;
  const sellingPrice = costPrice > 0
    ? (settings.markup_type === "percent" ? Math.round(costPrice * (1 + settings.markup_value / 100)) : costPrice + settings.markup_value)
    : 0;

  const finalCategory = productInfo.category || settings.target_category;

  const { error } = await supabase.from("listings").insert({
    user_id: settings.user_id,
    store_id: settings.store_id,
    title: productInfo.title || "Telegram məhsulu",
    description: productInfo.description || caption,
    price: sellingPrice,
    cost_price: costPrice,
    condition: productInfo.condition || "Yeni",
    category: finalCategory,
    location: settings.target_location,
    image_urls: imageUrls,
    telegram_media_group_id: groupId || null,
    is_active: false,
    status: "pending",
  });

  if (error) {
    console.error("Insert error:", error.message);
    await sendMessage(chatId, `❌ Xəta: ${error.message}`, lovableKey, telegramKey);
    return;
  }

  await sendMessage(chatId,
    `✅ <b>Elan yaradıldı!</b>\n\n📝 Ad: ${productInfo.title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📂 Kateqoriya: ${finalCategory}\n📸 Şəkillər: ${imageUrls.length}\n\n⏳ Admin təsdiqi gözləyir.`,
    lovableKey, telegramKey
  );
}

// =====================================================
// AI Analiz (tool-calls + kateqoriyalar bazadan)
// =====================================================
async function analyzeWithAI(imageUrl: string | null, caption: string, lovableKey: string, supabase: any) {
  try {
    const { data: cats } = await supabase.from("categories").select("slug, name").eq("is_active", true).is("parent_id", null);
    const catNames = (cats || []).map((c: any) => `${c.slug} (${c.name})`).join(", ");
    const content: any[] = imageUrl ? [{ type: "image_url", image_url: { url: imageUrl } }] : [];
    content.push({ type: "text", text: caption || "Bu məhsulu analiz et." });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: `Sən məhsul analitikisisən. Azərbaycan dilində cavab ver. Mövcud kateqoriyalar: ${catNames}. QAYDA: description-da qiymət və rəqəm yazma! Yalnız şəkilə baxaraq cəlbedici satış mətni yaz.` },
          { role: "user", content }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product_info",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                category: { type: "string" },
                condition: { type: "string", enum: ["Yeni", "Yeni kimi", "İşlənmiş"] },
              },
              required: ["title", "description", "price", "category", "condition"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_product_info" } },
      })
    });

    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (args) return JSON.parse(args);
    return {};
  } catch (e) {
    console.error("AI error:", e);
    return { title: caption.split("\n")[0], description: caption, price: 0 };
  }
}

// =====================================================
// Köməkçi funksiyalar
// =====================================================
async function downloadAndUploadFile(fileId: string, bucket: string, supabase: any, lovableKey: string, telegramKey: string): Promise<string | null> {
  try {
    const fRes = await fetch(`${GATEWAY_URL}/getFile`, { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": telegramKey, "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId }) });
    const fData = await fRes.json();
    const dRes = await fetch(`${GATEWAY_URL}/file/${fData.result.file_path}`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": telegramKey } });
    const bytes = await dRes.arrayBuffer();
    const name = `telegram/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    await supabase.storage.from(bucket).upload(name, bytes, { contentType: "image/jpeg" });
    return supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;
  } catch { return null; }
}

async function sendMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": telegramKey, "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }) });
}

async function handleStart(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const token = text.split(" ")[1];
  if (token) {
    await supabase.from("telegram_bot_settings").upsert({ telegram_chat_id: chatId, user_id: token }, { onConflict: "telegram_chat_id" });
    const { data: stores } = await supabase.from("stores").select("id, name").eq("user_id", token).eq("status", "approved");
    const storeList = stores?.map((s: any, i: number) => `${i+1}. ${s.name}`).join("\n") || "";
    await sendMessage(chatId, `✅ Hesab bağlandı!\n\n🏪 Mağazalar:\n${storeList}\n\nSeçmək üçün: /store [nömrə]`, lovableKey, telegramKey);
  }
}

async function handleStoreSelect(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("user_id").eq("telegram_chat_id", chatId).single();
  if (!settings) return;
  const { data: stores } = await supabase.from("stores").select("id, name").eq("user_id", settings.user_id).eq("status", "approved");
  const idx = parseInt(text.split(" ")[1]) - 1;
  if (stores?.[idx]) {
    await supabase.from("telegram_bot_settings").update({ store_id: stores[idx].id }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, `✅ Mağaza seçildi: <b>${stores[idx].name}</b>`, lovableKey, telegramKey);
  } else {
    const list = stores?.map((s: any, i: number) => `${i+1}. ${s.name}`).join("\n") || "";
    await sendMessage(chatId, `🏪 Mağaza seçin:\n${list}\n\nMisal: /store 1`, lovableKey, telegramKey);
  }
}

async function handleMarkup(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const p = text.split(" ");
  if (p.length < 3) { await sendMessage(chatId, "Misal: /markup faiz 20  və ya  /markup sabit 5", lovableKey, telegramKey); return; }
  await supabase.from("telegram_bot_settings").update({ markup_type: p[1] === "faiz" ? "percent" : "fixed", markup_value: parseFloat(p[2]) }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Qiymət əlavəsi: ${p[1] === "faiz" ? p[2]+"%" : p[2]+"₼"}`, lovableKey, telegramKey);
}

async function handleCategory(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const cat = text.split(" ").slice(1).join(" ");
  await supabase.from("telegram_bot_settings").update({ target_category: cat }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, `✅ Kateqoriya: ${cat}`, lovableKey, telegramKey);
}

async function handleSettings(chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("*, stores(name)").eq("telegram_chat_id", chatId).single();
  if (!s) return;
  await sendMessage(chatId, `⚙️ <b>Parametrlər:</b>\n🏪 Mağaza: ${(s as any).stores?.name || "Seçilməyib"}\n📊 Markup: ${s.markup_value} (${s.markup_type})\n📂 Kateqoriya: ${s.target_category}`, lovableKey, telegramKey);
}
