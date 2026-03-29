import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;
  let currentOffset: number;

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500, headers: corsHeaders });
  }

  currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Telegram getUpdates failed:', data);
      return new Response(JSON.stringify({ error: data }), { status: 502, headers: corsHeaders });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      try {
        await processUpdate(update, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        totalProcessed++;
      } catch (err) {
        console.error('Error processing update:', update.update_id, err);
      }
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

async function sendMessage(chatId: number, text: string, lovableKey: string, telegramKey: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function processUpdate(update: any, supabase: any, lovableKey: string, telegramKey: string) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text || message.caption || '';

  // Handle /start command
  if (text.startsWith('/start')) {
    await handleStart(chatId, text, supabase, lovableKey, telegramKey);
    return;
  }

  // Handle /store command to select store
  if (text.startsWith('/store')) {
    await handleStoreSelect(chatId, text, supabase, lovableKey, telegramKey);
    return;
  }

  // Handle /markup command
  if (text.startsWith('/markup')) {
    await handleMarkup(chatId, text, supabase, lovableKey, telegramKey);
    return;
  }

  // Handle /category command
  if (text.startsWith('/category')) {
    await handleCategory(chatId, text, supabase, lovableKey, telegramKey);
    return;
  }

  // Handle /settings command
  if (text === '/settings') {
    await handleSettings(chatId, supabase, lovableKey, telegramKey);
    return;
  }

  // If message has photo or video, process as product
  if (message.photo || message.video || message.document) {
    await processProductMessage(message, chatId, supabase, lovableKey, telegramKey);
    return;
  }

  // If forwarded text-only message, try to process
  if (message.forward_date || message.forward_from || message.forward_from_chat) {
    await sendMessage(chatId, '⚠️ Bu mesajda şəkil və ya video yoxdur. Zəhmət olmasa məhsul şəkli olan mesaj göndərin.', lovableKey, telegramKey);
    return;
  }
}

async function handleStart(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  // Check if user has linked account via token in /start command
  const parts = text.split(' ');
  const token = parts[1]; // /start <user_id>

  if (token) {
    // Link telegram chat to user
    const { data: existingSettings } = await supabase
      .from('telegram_bot_settings')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    if (existingSettings) {
      await supabase
        .from('telegram_bot_settings')
        .update({ user_id: token, updated_at: new Date().toISOString() })
        .eq('telegram_chat_id', chatId);
    } else {
      await supabase
        .from('telegram_bot_settings')
        .insert({ user_id: token, telegram_chat_id: chatId });
    }

    // Get user stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', token)
      .eq('status', 'approved');

    let storeMsg = '';
    if (stores && stores.length > 0) {
      storeMsg = '\n\n🏪 Mağazalarınız:\n' + stores.map((s: any, i: number) => `${i + 1}. ${s.name}`).join('\n');
      storeMsg += '\n\nMağaza seçmək üçün: /store [nömrə]';
    } else {
      storeMsg = '\n\n⚠️ Heç bir təsdiqlənmiş mağazanız yoxdur. Əvvəlcə saytda mağaza yaradın.';
    }

    await sendMessage(chatId, 
      `✅ Hesab uğurla bağlandı!\n\n🤖 <b>Elan24 Bot</b>-a xoş gəlmisiniz!\n\nBu bot vasitəsilə Telegram qruplarından forward etdiyiniz məhsulları avtomatik saytda elan kimi paylaşa bilərsiniz.\n\n📋 <b>Komandalar:</b>\n/store [nömrə] — Mağaza seçin\n/markup [faiz/sabit] [dəyər] — Qiymət əlavəsi\n/category [kateqoriya] — Kateqoriya seçin\n/settings — Cari parametrləri göstərin${storeMsg}`,
      lovableKey, telegramKey);
    return;
  }

  await sendMessage(chatId,
    '🤖 <b>Elan24 Bot</b>\n\nBu bot sayta bağlanmaq üçün Elan24 saytından mağaza idarəetmə panelindən "Telegram Bot Bağla" düyməsinə basın.',
    lovableKey, telegramKey);
}

async function handleStoreSelect(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase
    .from('telegram_bot_settings')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!settings) {
    await sendMessage(chatId, '⚠️ Əvvəlcə hesabınızı bağlayın. Saytda mağaza panelindən "Telegram Bot Bağla" düyməsinə basın.', lovableKey, telegramKey);
    return;
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('user_id', settings.user_id)
    .eq('status', 'approved');

  if (!stores || stores.length === 0) {
    await sendMessage(chatId, '⚠️ Təsdiqlənmiş mağazanız yoxdur.', lovableKey, telegramKey);
    return;
  }

  const parts = text.split(' ');
  const storeIndex = parseInt(parts[1]) - 1;

  if (isNaN(storeIndex) || storeIndex < 0 || storeIndex >= stores.length) {
    let msg = '🏪 Mağaza seçin:\n\n';
    stores.forEach((s: any, i: number) => { msg += `${i + 1}. ${s.name}\n`; });
    msg += '\nMisal: /store 1';
    await sendMessage(chatId, msg, lovableKey, telegramKey);
    return;
  }

  const selectedStore = stores[storeIndex];
  await supabase
    .from('telegram_bot_settings')
    .update({ store_id: selectedStore.id, updated_at: new Date().toISOString() })
    .eq('telegram_chat_id', chatId);

  await sendMessage(chatId, `✅ Mağaza seçildi: <b>${selectedStore.name}</b>\n\nİndi məhsul şəklini və ya forward mesajını göndərə bilərsiniz.`, lovableKey, telegramKey);
}

async function handleMarkup(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase
    .from('telegram_bot_settings')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!settings) {
    await sendMessage(chatId, '⚠️ Əvvəlcə hesabınızı bağlayın.', lovableKey, telegramKey);
    return;
  }

  // /markup faiz 20 or /markup sabit 10
  const parts = text.split(' ');
  if (parts.length < 3) {
    await sendMessage(chatId, `📊 Cari əlavə: ${settings.markup_type === 'percent' ? settings.markup_value + '%' : settings.markup_value + '₼'}\n\nDəyişmək üçün:\n/markup faiz 20 — 20% əlavə\n/markup sabit 10 — 10₼ sabit əlavə`, lovableKey, telegramKey);
    return;
  }

  const type = parts[1] === 'faiz' ? 'percent' : 'fixed';
  const value = parseFloat(parts[2]);

  if (isNaN(value) || value < 0) {
    await sendMessage(chatId, '⚠️ Düzgün rəqəm daxil edin.', lovableKey, telegramKey);
    return;
  }

  await supabase
    .from('telegram_bot_settings')
    .update({ markup_type: type, markup_value: value, updated_at: new Date().toISOString() })
    .eq('telegram_chat_id', chatId);

  await sendMessage(chatId, `✅ Qiymət əlavəsi yeniləndi: ${type === 'percent' ? value + '%' : value + '₼'}`, lovableKey, telegramKey);
}

async function handleCategory(chatId: number, text: string, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase
    .from('telegram_bot_settings')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!settings) {
    await sendMessage(chatId, '⚠️ Əvvəlcə hesabınızı bağlayın.', lovableKey, telegramKey);
    return;
  }

  const parts = text.split(' ');
  if (parts.length < 2) {
    const { data: categories } = await supabase
      .from('categories')
      .select('name, slug')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('sort_order');

    let msg = `📂 Cari kateqoriya: <b>${settings.target_category}</b>\n\nKateqoriyalar:\n`;
    categories?.forEach((c: any) => { msg += `• /category ${c.slug}\n`; });
    await sendMessage(chatId, msg, lovableKey, telegramKey);
    return;
  }

  const category = parts.slice(1).join(' ');
  await supabase
    .from('telegram_bot_settings')
    .update({ target_category: category, updated_at: new Date().toISOString() })
    .eq('telegram_chat_id', chatId);

  await sendMessage(chatId, `✅ Kateqoriya: <b>${category}</b>`, lovableKey, telegramKey);
}

async function handleSettings(chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase
    .from('telegram_bot_settings')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!settings) {
    await sendMessage(chatId, '⚠️ Hesab bağlı deyil. Saytdan bağlayın.', lovableKey, telegramKey);
    return;
  }

  let storeName = 'Seçilməyib';
  if (settings.store_id) {
    const { data: store } = await supabase.from('stores').select('name').eq('id', settings.store_id).maybeSingle();
    if (store) storeName = store.name;
  }

  await sendMessage(chatId,
    `⚙️ <b>Parametrlər:</b>\n\n🏪 Mağaza: ${storeName}\n📊 Qiymət əlavəsi: ${settings.markup_type === 'percent' ? settings.markup_value + '%' : settings.markup_value + '₼'}\n📂 Kateqoriya: ${settings.target_category}\n📍 Bölgə: ${settings.target_location}\n✅ Aktiv: ${settings.is_active ? 'Bəli' : 'Xeyr'}`,
    lovableKey, telegramKey);
}

async function processProductMessage(message: any, chatId: number, supabase: any, lovableKey: string, telegramKey: string) {
  const { data: settings } = await supabase
    .from('telegram_bot_settings')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!settings) {
    await sendMessage(chatId, '⚠️ Hesab bağlı deyil. Saytdan bağlayın.', lovableKey, telegramKey);
    return;
  }

  if (!settings.store_id) {
    await sendMessage(chatId, '⚠️ Mağaza seçilməyib. /store komandasını istifadə edin.', lovableKey, telegramKey);
    return;
  }

  await sendMessage(chatId, '⏳ Məhsul emal olunur...', lovableKey, telegramKey);

  try {
    // Download images
    const imageUrls: string[] = [];
    let videoUrl: string | null = null;

    if (message.photo && message.photo.length > 0) {
      // Get highest resolution photo
      const photo = message.photo[message.photo.length - 1];
      const url = await downloadAndUploadFile(photo.file_id, 'listing-images', supabase, lovableKey, telegramKey);
      if (url) imageUrls.push(url);
    }

    if (message.video) {
      videoUrl = await downloadAndUploadFile(message.video.file_id, 'listing-videos', supabase, lovableKey, telegramKey, true);
    }

    if (message.document) {
      const mime = message.document.mime_type || '';
      if (mime.startsWith('image/')) {
        const url = await downloadAndUploadFile(message.document.file_id, 'listing-images', supabase, lovableKey, telegramKey);
        if (url) imageUrls.push(url);
      } else if (mime.startsWith('video/')) {
        videoUrl = await downloadAndUploadFile(message.document.file_id, 'listing-videos', supabase, lovableKey, telegramKey, true);
      }
    }

    // Extract text info
    const caption = message.caption || message.text || '';

    // Use AI to analyze the product
    let title = '';
    let description = '';
    let price = 0;
    let condition = 'Yeni';

    if (imageUrls.length > 0) {
      // Use AI to analyze image
      const aiResult = await analyzeWithAI(imageUrls[0], caption, lovableKey);
      title = aiResult.title || 'Telegram məhsulu';
      description = aiResult.description || caption;
      price = aiResult.price || 0;
      condition = aiResult.condition || 'Yeni';
    } else {
      // Parse from caption
      const parsed = parseCaption(caption);
      title = parsed.title || 'Telegram məhsulu';
      description = caption;
      price = parsed.price || 0;
    }

    // Apply markup
    if (price > 0) {
      if (settings.markup_type === 'percent') {
        price = Math.round(price * (1 + settings.markup_value / 100));
      } else {
        price = price + settings.markup_value;
      }
    }

    // Create listing
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        user_id: settings.user_id,
        store_id: settings.store_id,
        title,
        description,
        price: price || 0,
        condition,
        category: settings.target_category,
        location: settings.target_location,
        image_urls: imageUrls,
        video_url: videoUrl,
        status: 'pending',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      await sendMessage(chatId, `❌ Elan yaradılarkən xəta: ${error.message}`, lovableKey, telegramKey);
      return;
    }

    const markupInfo = settings.markup_type === 'percent' ? `+${settings.markup_value}%` : `+${settings.markup_value}₼`;

    await sendMessage(chatId,
      `✅ <b>Elan yaradıldı!</b>\n\n📝 Ad: ${title}\n💰 Qiymət: ${price}₼ (${markupInfo})\n📂 Kateqoriya: ${settings.target_category}\n🏪 Mağaza: Seçilmiş mağaza\n📸 Şəkillər: ${imageUrls.length}\n🎥 Video: ${videoUrl ? 'Bəli' : 'Xeyr'}\n\n⏳ Elan admin təsdiqi gözləyir.`,
      lovableKey, telegramKey);

  } catch (err) {
    console.error('Error processing product:', err);
    await sendMessage(chatId, `❌ Xəta baş verdi: ${err instanceof Error ? err.message : 'Naməlum xəta'}`, lovableKey, telegramKey);
  }
}

async function downloadAndUploadFile(fileId: string, bucket: string, supabase: any, lovableKey: string, telegramKey: string, isVideo = false): Promise<string | null> {
  try {
    // Get file path from Telegram
    const fileResponse = await fetch(`${GATEWAY_URL}/getFile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': telegramKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_id: fileId }),
    });

    const fileData = await fileResponse.json();
    if (!fileResponse.ok) {
      console.error('getFile failed:', fileData);
      return null;
    }

    const filePath = fileData.result.file_path;

    // Download file
    const downloadResponse = await fetch(`${GATEWAY_URL}/file/${filePath}`, {
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': telegramKey,
      },
    });

    if (!downloadResponse.ok) {
      console.error('File download failed:', downloadResponse.status);
      return null;
    }

    const fileBytes = await downloadResponse.arrayBuffer();
    const ext = isVideo ? 'mp4' : 'jpg';
    const fileName = `telegram/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBytes, {
        contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('Download/upload error:', err);
    return null;
  }
}

async function analyzeWithAI(imageUrl: string, caption: string, lovableKey: string): Promise<{ title?: string; description?: string; price?: number; condition?: string }> {
  try {
    const response = await fetch('https://ai-gateway.lovable.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sən e-ticarət məhsul analitikisisən. Göndərilən şəkil və/və ya mətni analiz edərək Azərbaycan dilində JSON formatında cavab ver:
{"title": "məhsulun adı", "description": "təsvir", "price": rəqəm_manat, "condition": "Yeni/Yeni kimi/İşlənmiş"}
Əgər qiymət tapılmırsa price 0 olsun. Mətndə qiymət varsa onu istifadə et. title qısa və aydın olmalıdır.`,
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: caption || 'Bu məhsulu analiz et.' },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('AI analysis failed:', response.status);
      return {};
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return {};
  } catch (err) {
    console.error('AI analysis error:', err);
    return {};
  }
}

function parseCaption(caption: string): { title?: string; price?: number } {
  const lines = caption.split('\n').filter(l => l.trim());
  const title = lines[0] || undefined;
  
  // Try to find price patterns like "100₼", "100 AZN", "100 manat"
  const priceMatch = caption.match(/(\d+[\.,]?\d*)\s*(₼|azn|manat|AZN)/i);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined;

  return { title, price };
}
