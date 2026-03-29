import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY)
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: corsHeaders,
    });

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY)
    return new Response(JSON.stringify({ error: "TELEGRAM_API_KEY not configured" }), {
      status: 500,
      headers: corsHeaders,
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;
  let currentOffset: number;

  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500, headers: corsHeaders });
  }

  currentOffset = state.update_offset;
  const pendingMediaGroups: Record<string, { updates: any[]; lastSeen: number }> = {};

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ["message"] }),
    });

    const data = await response.json();
    if (!response.ok) break;

    const updates = data.result ?? [];
    const now = Date.now();

    // Albomları (Media Group) yığmaq üçün 2.5 saniyəlik gözləmə məntiqi
    for (const [groupId, group] of Object.entries(pendingMediaGroups)) {
      if (now - group.lastSeen > 2500) {
        await processMediaGroup(group.updates, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        totalProcessed += group.updates.length;
        delete pendingMediaGroups[groupId];
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        const groupId = update.message?.media_group_id;
        if (groupId) {
          if (!pendingMediaGroups[groupId]) pendingMediaGroups[groupId] = { updates: [], lastSeen: now };
          pendingMediaGroups[groupId].updates.push(update);
          pendingMediaGroups[groupId].lastSeen = now;
        } else {
          await processUpdate(update, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          totalProcessed++;
        }
      }
      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase.from("telegram_bot_state").update({ update_offset: newOffset }).eq("id", 1);
      currentOffset = newOffset;
    }
  }

  // Qalan qrupları təmizlə
  for (const [groupId, group] of Object.entries(pendingMediaGroups)) {
    await processMediaGroup(group.updates, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    totalProcessed += group.updates.length;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), { headers: corsHeaders });
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

  if (message.photo || message.video || message.document) {
    await processProductMessage(message, chatId, supabase, lovableKey, telegramKey);
  }
}

async function processProductMessage(
  message: any,
  chatId: number,
  supabase: any,
  lovableKey: string,
  telegramKey: string,
) {
  const { data: settings } = await supabase
    .from("telegram_bot_settings")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (!settings || !settings.store_id) {
    await sendMessage(chatId, "⚠️ Mağaza seçilməyib. /store istifadə edin.", lovableKey, telegramKey);
    return;
  }

  await sendMessage(chatId, "⏳ Məhsul emal olunur...", lovableKey, telegramKey);

  try {
    const imageUrls: string[] = [];
    if (message.photo) {
      const url = await downloadAndUploadFile(
        message.photo[message.photo.length - 1].file_id,
        "listing-images",
        supabase,
        lovableKey,
        telegramKey,
      );
      if (url) imageUrls.push(url);
    }

    const caption = message.caption || "";
    const aiResult = await analyzeWithAI(imageUrls[0], caption, lovableKey);

    // AI bypass - Əgər tapmasa mətndən götür
    let title = aiResult.title || parseCaption(caption).title || "Telegram məhsulu";
    let price = aiResult.price || parseCaption(caption).price || 0;
    let description = aiResult.description || caption;

    const costPrice = price;
    let sellingPrice = price;
    if (costPrice > 0) {
      sellingPrice =
        settings.markup_type === "percent"
          ? Math.round(costPrice * (1 + settings.markup_value / 100))
          : costPrice + settings.markup_value;
    }

    await supabase.from("listings").insert({
      user_id: settings.user_id,
      store_id: settings.store_id,
      title,
      description,
      price: sellingPrice,
      cost_price: costPrice,
      image_urls: imageUrls,
      category: settings.target_category,
      location: settings.target_location,
      status: "pending",
    });

    await sendMessage(
      chatId,
      `✅ <b>Elan yaradıldı!</b>\n\n📝 Ad: ${title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)`,
      lovableKey,
      telegramKey,
    );
  } catch (err) {
    await sendMessage(chatId, "❌ Xəta baş verdi.", lovableKey, telegramKey);
  }
}

async function processMediaGroup(updates: any[], supabase: any, lovableKey: string, telegramKey: string) {
  const mainMessage = updates.find((u) => u.message?.caption)?.message || updates[0].message;
  const chatId = mainMessage.chat.id;
  const { data: settings } = await supabase
    .from("telegram_bot_settings")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  const imageUrls: string[] = [];
  let caption = mainMessage.caption || "";

  for (const update of updates) {
    if (update.message?.photo) {
      const url = await downloadAndUploadFile(
        update.message.photo[update.message.photo.length - 1].file_id,
        "listing-images",
        supabase,
        lovableKey,
        telegramKey,
      );
      if (url) imageUrls.push(url);
    }
  }

  const aiResult = await analyzeWithAI(imageUrls[0], caption, lovableKey);
  let title = aiResult.title || parseCaption(caption).title || "Qrup Məhsulu";
  let price = aiResult.price || parseCaption(caption).price || 0;
  let description = aiResult.description || caption;

  const costPrice = price;
  const sellingPrice =
    settings.markup_type === "percent"
      ? Math.round(costPrice * (1 + settings.markup_value / 100))
      : costPrice + settings.markup_value;

  await supabase.from("listings").insert({
    user_id: settings.user_id,
    store_id: settings.store_id,
    title,
    description,
    price: sellingPrice,
    cost_price: costPrice,
    image_urls: imageUrls,
    category: settings.target_category,
    location: settings.target_location,
    status: "pending",
  });

  await sendMessage(
    chatId,
    `✅ <b>Qrup Elanı yaradıldı!</b>\n\n📝 Ad: ${title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📸 Şəkillər: ${imageUrls.length}`,
    lovableKey,
    telegramKey,
  );
}

// Köməkçi funksiyalar (download, analyze, parse s.) eyni qaydada qalır...
// (Yuxarıdakı məntiqlə birləşdirilmişdir)

async function analyzeWithAI(imageUrl: string, caption: string, lovableKey: string) {
  try {
    const response = await fetch("https://ai-gateway.lovable.dev/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sən e-ticarət məhsul analitikisisən. JSON cavab ver: {"title": "ad", "description": "təsvir (qiymət yazma!)", "price": rəqəm}. 
          Təsviri mətndən yox, şəkildən uydur.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: caption },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return {};
  }
}

function parseCaption(caption: string) {
  const lines = caption.split("\n").filter((l) => l.trim());
  const priceMatch = caption.match(/(\d+[\.,]?\d*)/);
  return { title: lines[0], price: priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0 };
}

async function downloadAndUploadFile(
  fileId: string,
  bucket: string,
  supabase: any,
  lovableKey: string,
  telegramKey: string,
) {
  const fileRes = await fetch(`${GATEWAY_URL}/getFile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id: fileId }),
  });
  const fileData = await fileRes.json();
  const downloadRes = await fetch(`${GATEWAY_URL}/file/${fileData.result.file_path}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": telegramKey },
  });
  const fileBytes = await downloadRes.arrayBuffer();
  const fileName = `telegram/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  await supabase.storage.from(bucket).upload(fileName, fileBytes, { contentType: "image/jpeg" });
  return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

async function sendMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
