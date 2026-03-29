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

  const pendingMediaGroups: Record<string, { updates: any[], lastSeen: number }> = {};

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
    
    // Check pending media groups that haven't seen an update in > 2.5 seconds
    const now = Date.now();
    for (const [groupId, group] of Object.entries(pendingMediaGroups)) {
      if (now - group.lastSeen > 2500) {
        try {
          if (group.updates.length === 1 && !group.updates[0].message?.media_group_id) {
            await processUpdate(group.updates[0], supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          } else {
            await processMediaGroup(group.updates, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
          totalProcessed += group.updates.length;
        } catch (err) {
          console.error('Error processing pending media group:', err);
        }
        delete pendingMediaGroups[groupId];
      }
    }

    if (updates.length > 0) {
      for (const update of updates) {
        const groupId = update.message?.media_group_id;
        if (groupId) {
          if (!pendingMediaGroups[groupId]) {
            pendingMediaGroups[groupId] = { updates: [], lastSeen: now };
          }
          pendingMediaGroups[groupId].updates.push(update);
          pendingMediaGroups[groupId].lastSeen = now;
        } else {
          try {
            await processUpdate(update, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
            totalProcessed++;
          } catch (err) {
            console.error('Error processing update:', err);
          }
        }
      }

      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase
        .from('telegram_bot_state')
        .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
        .eq('id', 1);

      currentOffset = newOffset;
    }
  }

  // Force-flush any remaining pending media groups before the script terminates
  for (const [groupId, group] of Object.entries(pendingMediaGroups)) {
    try {
      if (group.updates.length === 1 && !group.updates[0].message?.media_group_id) {
        await processUpdate(group.updates[0], supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      } else {
        await processMediaGroup(group.updates, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      totalProcessed += group.updates.length;
    } catch (err) {
      console.error('Error processing pending media group on exit:', err);
    }
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
  const { error: updateError } = await supabase
    .from('telegram_bot_settings')
    .update({ store_id: selectedStore.id, updated_at: new Date().toISOString() })
    .eq('id', settings.id);

  if (updateError) {
    await sendMessage(chatId, `❌ Verilənlər bazası xətası: ${updateError.message}`, lovableKey, telegramKey);
    return;
  }

  // Double check if it actually saved
  const { data: verifyData } = await supabase
    .from('telegram_bot_settings')
    .select('store_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!verifyData?.store_id) {
    await sendMessage(chatId, `❌ Naməlum xəta qeydə alındı, ID yadda saxlanılmadı! (${verifyData ? 'Bos deyil' : 'Bosdur'})`, lovableKey, telegramKey);
    return;
  }

  await sendMessage(chatId, `✅ Mağaza uğurla seçildi və yadda saxlanıldı: <b>${selectedStore.name}</b>\n\nİndi məhsul şəklini və ya forward mesajını göndərə bilərsiniz.`, lovableKey, telegramKey);
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
    .eq('id', settings.id);

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
    .eq('id', settings.id);

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
      
      // Fallback if AI fails parsing name/price
      if (title === 'Telegram məhsulu' || price === 0) {
        const parsed = parseCaption(caption);
        if (title === 'Telegram məhsulu' && parsed.title) title = parsed.title;
        if (price === 0 && parsed.price) price = parsed.price;
      }
    } else {
      // Parse from caption
      const parsed = parseCaption(caption);
      title = parsed.title || 'Telegram məhsulu';
      description = caption;
      price = parsed.price || 0;
    }

    const costPrice = price;
    let sellingPrice = price;

    if (costPrice > 0) {
      if (settings.markup_type === 'percent') {
        sellingPrice = Math.round(costPrice * (1 + settings.markup_value / 100));
      } else {
        sellingPrice = costPrice + settings.markup_value;
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
        price: sellingPrice || 0,
        cost_price: costPrice || 0,
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
      `✅ <b>Elan yaradıldı!</b>\n\n📝 Ad: ${title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📂 Kateqoriya: ${settings.target_category}\n🏪 Mağaza: Seçilmiş mağaza\n📸 Şəkillər: ${imageUrls.length}\n🎥 Video: ${videoUrl ? 'Bəli' : 'Xeyr'}\n\n⏳ Elan admin təsdiqi gözləyir.`,
      lovableKey, telegramKey);

  } catch (err) {
    console.error('Error processing product:', err);
    await sendMessage(chatId, `❌ Xəta baş verdi: ${err instanceof Error ? err.message : 'Naməlum xəta'}`, lovableKey, telegramKey);
  }
}

async function processMediaGroup(updates: any[], supabase: any, lovableKey: string, telegramKey: string) {
  // Try to find the message with a caption
  const messageWithCaption = updates.find(u => u.message?.caption) || updates[0];
  const mainMessage = messageWithCaption.message;
  const chatId = mainMessage.chat.id;

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

  await sendMessage(chatId, `⏳ Media qrupu (${updates.length} fayl) emal olunur...`, lovableKey, telegramKey);

  try {
    const imageUrls: string[] = [];
    let videoUrl: string | null = null;
    let caption = mainMessage.caption || mainMessage.text || '';

    // Download all files in the group sequentially
    for (const update of updates) {
      const msg = update.message;
      if (!msg) continue;
      
      if (msg.photo && msg.photo.length > 0) {
        const photo = msg.photo[msg.photo.length - 1]; // highest res
        const url = await downloadAndUploadFile(photo.file_id, 'listing-images', supabase, lovableKey, telegramKey);
        if (url) imageUrls.push(url);
      } else if (msg.video) {
        const url = await downloadAndUploadFile(msg.video.file_id, 'listing-videos', supabase, lovableKey, telegramKey, true);
        if (url && !videoUrl) videoUrl = url;
      } else if (msg.document) {
        const mime = msg.document.mime_type || '';
        if (mime.startsWith('image/')) {
          const url = await downloadAndUploadFile(msg.document.file_id, 'listing-images', supabase, lovableKey, telegramKey);
          if (url) imageUrls.push(url);
        } else if (mime.startsWith('video/')) {
          const url = await downloadAndUploadFile(msg.document.file_id, 'listing-videos', supabase, lovableKey, telegramKey, true);
          if (url && !videoUrl) videoUrl = url;
        }
      }
      
      // Merge caption if other messages have small text parts
      if (msg.caption && msg !== mainMessage) {
        caption += '\\n' + msg.caption;
      }
    }

    let title = '';
    let description = '';
    let price = 0;
    let condition = 'Yeni';

    if (imageUrls.length > 0) {
      // Use AI to analyze the first image with the merged caption
      const aiResult = await analyzeWithAI(imageUrls[0], caption, lovableKey);
      title = aiResult.title || 'Telegram məhsulu (Qrup)';
      description = aiResult.description || caption || 'Əlavə məlumat yoxdur.';
      price = aiResult.price || 0;
      condition = aiResult.condition || 'Yeni';

      if (title === 'Telegram məhsulu (Qrup)' || price === 0) {
        const parsed = parseCaption(caption);
        if (title === 'Telegram məhsulu (Qrup)' && parsed.title) title = parsed.title;
        if (price === 0 && parsed.price) price = parsed.price;
      }
    } else {
      const parsed = parseCaption(caption);
      title = parsed.title || 'Telegram məhsulu (Qrup)';
      description = caption || 'Əlavə məlumat yoxdur.';
      price = parsed.price || 0;
    }

    const costPrice = price;
    let sellingPrice = price;

    if (costPrice > 0) {
      if (settings.markup_type === 'percent') {
        sellingPrice = Math.round(costPrice * (1 + settings.markup_value / 100));
      } else {
        sellingPrice = costPrice + settings.markup_value;
      }
    }

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        user_id: settings.user_id,
        store_id: settings.store_id,
        title,
        description,
        price: sellingPrice || 0,
        cost_price: costPrice || 0,
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
      console.error('Error creating group listing:', error);
      await sendMessage(chatId, `❌ Qrup elanı yaradılarkən xəta: ${error.message}`, lovableKey, telegramKey);
      return;
    }

    const markupInfo = settings.markup_type === 'percent' ? `+${settings.markup_value}%` : `+${settings.markup_value}₼`;

    await sendMessage(chatId,
      `✅ <b>Qrup Elanı yaradıldı!</b>\n\n📝 Ad: ${title}\n💰 Satış Qiyməti: ${sellingPrice}₼ (Maya: ${costPrice}₼)\n📂 Kateqoriya: ${settings.target_category}\n📸 Şəkillər: ${imageUrls.length}\n🎥 Video: ${videoUrl ? 'Bəli' : 'Xeyr'}\n\n⏳ Elan admin təsdiqi gözləyir.`,
      lovableKey, telegramKey);

  } catch (err) {
    console.error('Error processing media group:', err);
    await sendMessage(chatId, `❌ Qrup xətası: ${err instanceof Error ? err.message : 'Naməlum xəta'}`, lovableKey, telegramKey);
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
            content: `Sən e-ticarət məhsul analitikisisən. Göndərilən şəkil və mətni analiz edərək Azərbaycan dilində JSON formatında cavab ver:
{"title": "məhsulun adı", "description": "məhsul haqqında cəlbedici satış mətni (QİYMƏT BURADA YAZILMAMALIDIR)", "price": rəqəm, "condition": "Yeni/Yeni kimi/İşlənmiş"}
Çox vacib qaydalar: 
1. "description" sahəsində qətiyyən orijinal mətnin kopyasını və kommersiya rəqəmlərini (qiymət, məbləğ) yazma! Yalnız şəklə əsaslanan gözəl və yaradıcı təqdimat/təsvir uydur və onu yaz.
2. Mətndə olan obyekti "title" üçün qısa və aydın saxla.
3. Mətndə olan rəqəmi (tapılsa) yalnız "price" sahəsinə yaz! Əgər qiymət heç cür təyin edilə bilmirsə 0 yaz.`,
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
  if (!caption) return {};
  const lines = caption.split('\n').filter((l: string) => l.trim().length > 0);
  const title = lines.length > 0 ? lines[0] : undefined;
  
  // Try to find any number in the text for the price
  const priceMatch = caption.match(/(\d+[\.,]?\d*)/);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined;

  return { title, price };
}
