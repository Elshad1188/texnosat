import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
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
    if (updates.length > 0) {
      for (const update of updates) {
        await processUpdate(update, supabase, LOVABLE_API_KEY!, TELEGRAM_API_KEY!);
      }
      currentOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase.from("telegram_bot_state").update({ update_offset: currentOffset }).eq("id", 1);
    } else {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});

async function processUpdate(update: any, supabase: any, lovableKey: string, telegramKey: string) {
  const message = update.message;
  if (!message) return;
  const chatId = message.chat.id;
  const text = message.text || message.caption || "";

  if (text.startsWith("/start")) return handleStart(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/store")) return handleStoreSelect(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/markup")) return handleMarkup(chatId, text, supabase, lovableKey, telegramKey);
  if (text.startsWith("/category")) return handleCategory(chatId, text, supabase, lovableKey, telegramKey);
  if (text === "/settings") return handleSettings(chatId, supabase, lovableKey, telegramKey);

  const groupId = message.media_group_id;

  if (groupId) {
    let imageUrl = null;
    if (message.photo) imageUrl = await downloadAndUploadFile(message.photo[message.photo.length - 1].file_id, "listing-images", supabase, lovableKey, telegramKey);
    else if (message.document && message.document.mime_type?.startsWith("image/")) imageUrl = await downloadAndUploadFile(message.document.file_id, "listing-images", supabase, lovableKey, telegramKey);
    
    if (imageUrl) {
      await supabase.from("telegram_media_buffer").insert({ media_group_id: groupId, image_url: imageUrl, chat_id: chatId, caption: message.caption || null });
    }

    // Parallel gələn şəkilləri gözlə (Database buffer)
    await new Promise(r => setTimeout(r, 4000)); 

    // Unikal ID yoxlaması (Dublikat yaratmamaq üçün)
    const { data: existing } = await supabase.from("listings").select("id").eq("telegram_media_group_id", groupId).maybeSingle();
    if (existing) return;

    const { data: buffer } = await supabase.from("telegram_media_buffer").select("*").eq("media_group_id", groupId).order("created_at", { ascending: true });
    if (!buffer || buffer.length === 0) return;

    const imageUrls = buffer.map(r => r.image_url);
    const caption = buffer.find(r => r.caption)?.caption || "";

    await createAutoListing(chatId, imageUrls, caption, supabase, lovableKey, telegramKey, groupId);
    await supabase.from("telegram_media_buffer").delete().eq("media_group_id", groupId);
  } else if (message.photo || message.video) {
    await sendMessage(chatId, "⏳ Ağıllı emal olunur...", lovableKey, telegramKey);
    const imageUrl = message.photo ? await downloadAndUploadFile(message.photo[message.photo.length - 1].file_id, "listing-images", supabase, lovableKey, telegramKey) : null;
    await createAutoListing(chatId, imageUrl ? [imageUrl] : [], message.caption || "", supabase, lovableKey, telegramKey);
  }
}

async function createAutoListing(chatId: number, imageUrls: string[], caption: string, supabase: any, lovableKey: string, telegramKey: string, groupId?: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!settings?.store_id) return;

  // Ağıllı AI Analizi (ai-listing-autofill məntiqi)
  const productInfo = await analyzeWithAIFull(imageUrls.length > 0 ? imageUrls[0] : null, caption, lovableKey, supabase);
  
  if (!productInfo) {
    await sendMessage(chatId, "❌ AI analizi alınmadı.", lovableKey, telegramKey);
    return;
  }

  const costPrice = parseFloat(productInfo.price) || 0;
  let sellingPrice = costPrice;
  if (costPrice > 0) {
    sellingPrice = settings.markup_type === "percent" ? Math.round(costPrice * (1 + settings.markup_value / 100)) : costPrice + settings.markup_value;
  }

  // Kateqoriya: Əgər bot parametri "Avto" kimidirsə və ya AI tapıbsa
  const finalCategory = settings.target_category !== "Other" ? settings.target_category : productInfo.category;

  const { error: insertError } = await supabase.from("listings").insert({
    user_id: settings.user_id,
    store_id: settings.store_id,
    title: productInfo.title,
    description: productInfo.description,
    price: sellingPrice,
    cost_price: costPrice,
    condition: productInfo.condition || "Yeni",
    category: finalCategory,
    location: settings.target_location,
    image_urls: imageUrls,
    telegram_media_group_id: groupId,
    is_active: false // Admin təsdiqi üçün
  });

  if (!insertError) {
    await sendMessage(chatId, `✅ <b>Ağıllı Elan yaradıldı!</b>\n\n📝 Ad: ${productInfo.title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📂 Kateqoriya: ${finalCategory}\n📸 Şəkillər: ${imageUrls.length}\n\n⏳ Elan admin təsdiqi gözləyir.`, lovableKey, telegramKey);
  } else {
    console.error("Insert error:", insertError);
  }
}

// MODERN AI İNTEQRASİYASI (ai-listing-autofill sistemindən köçürülmüşdür)
async function analyzeWithAIFull(imageUrl: string | null, caption: string, lovableKey: string, supabase: any) {
  try {
    // Mövcud kateqoriyaları bazadan çəkirik (AI-nin düzgün seçməsi üçün)
    const { data: categories } = await supabase.from("categories").select("slug, name").eq("is_active", true).is("parent_id", null);
    const categoryNames = (categories || []).map((c: any) => `${c.slug} (${c.name})`).join(", ");

    const inputMsg = imageUrl 
      ? [{ type: "image_url", image_url: { url: imageUrl } }, { type: "text", text: caption || "Analiz et" }]
      : [{ type: "text", text: caption }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: `Sən məhsul tanıyan AI köməkçisisən. Şəkil və/və ya mətni analiz et. Mövcud kateqoriyalar: ${categoryNames}. Qiyməti AZN-lə ver (mətn daxilində tapılsa). Təsvirdə qətiyyən qiymət və rəqəm yazma, yalnız şəkilə əsaslanan bədii mətn yaz.`,
          },
          { role: "user", content: inputMsg }
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
                price: { type: "string" },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    return null;
  } catch (err) {
    console.error("AI Full Error:", err);
    return null;
  }
}

async function downloadAndUploadFile(fileId: string, bucket: string, supabase: any, lovableKey: string, telegramKey: string) {
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

// Yardımsı handlers (handleStart, handleStoreSelect və s.) eyni qaydada qalır, ID-ləri bazadan idarə edir.
async function handleStart(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const parts = text.split(" ");
  const token = parts[1];
  if (token) {
    await supabase.from("telegram_bot_settings").upsert({ telegram_chat_id: chatId, user_id: token }, { onConflict: "telegram_chat_id" });
    const { data: stores } = await supabase.from("stores").select("id, name").eq("user_id", token).eq("status", "approved");
    let storeMsg = stores?.length ? "\n\nSeçmək üçün: /store [nömrə]\n" + stores.map((s, i) => `${i+1}. ${s.name}`).join("\n") : "";
    await sendMessage(chatId, `✅ Bağlandı!${storeMsg}`, lovableKey, telegramKey);
  }
}

async function handleStoreSelect(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase.from("telegram_bot_settings").select("user_id").eq("telegram_chat_id", chatId).single();
  const { data: stores } = await supabase.from("stores").select("id, name").eq("user_id", settings.user_id).eq("status", "approved");
  const idx = parseInt(text.split(" ")[1]) - 1;
  if (stores?.[idx]) {
    await supabase.from("telegram_bot_settings").update({ store_id: stores[idx].id }).eq("telegram_chat_id", chatId);
    await sendMessage(chatId, `✅ Seçildi: ${stores[idx].name}`, lovableKey, telegramKey);
  }
}

async function handleMarkup(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const p = text.split(" ");
  await supabase.from("telegram_bot_settings").update({ markup_type: p[1] === "faiz" ? "percent" : "fixed", markup_value: parseFloat(p[2]) }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, "✅ Yeniləndi", lovableKey, telegramKey);
}

async function handleCategory(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  await supabase.from("telegram_bot_settings").update({ target_category: text.split(" ").slice(1).join(" ") }).eq("telegram_chat_id", chatId);
  await sendMessage(chatId, "✅ Yeniləndi", lovableKey, telegramKey);
}

async function handleSettings(chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: s } = await supabase.from("telegram_bot_settings").select("*").eq("telegram_chat_id", chatId).single();
  await sendMessage(chatId, `⚙️ Kateqoriya: ${s.target_category}\nMarkup: ${s.markup_value}`, lovableKey, telegramKey);
}
