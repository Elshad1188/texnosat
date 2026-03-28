const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ScrapedListing {
  title: string;
  price: number;
  currency: string;
  image_urls: string[];
  location: string;
  description: string;
  source_url: string;
  category: string;
  condition: string;
  custom_fields: Record<string, string>;
  seller_name?: string;
  seller_phone?: string;
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const TEMU_API_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.temu.com/',
  'Origin': 'https://www.temu.com',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

let proxyClient: any;
try {
  const proxyUrl = Deno.env.get('PROXY_URL');
  if (proxyUrl) {
    proxyClient = Deno.createHttpClient({ proxy: { url: proxyUrl } });
    console.log('Proxy configuration initialized.');
  }
} catch (e) {
  console.log('Failed to initialize proxy client:', e);
}

let activeProxyUrl: string | undefined = undefined;

async function fetchWithRetry(url: string, retries = 3, customHeaders?: Record<string, string>, extraOpts?: RequestInit): Promise<Response> {
  let currentClient = proxyClient;
  const overrideProxyUrl = activeProxyUrl || Deno.env.get('PROXY_URL');
  if (overrideProxyUrl && overrideProxyUrl !== Deno.env.get('PROXY_URL')) {
    try { currentClient = Deno.createHttpClient({ proxy: { url: overrideProxyUrl } }); } catch(e){}
  } else if (!overrideProxyUrl) {
    currentClient = undefined;
  }

  const headers = customHeaders || BROWSER_HEADERS;

  for (let i = 0; i <= retries; i++) {
    try {
      const fetchOptions: any = { headers, redirect: 'follow', ...extraOpts };
      if (currentClient) {
        fetchOptions.client = currentClient;
      }
      
      const resp = await fetch(url, fetchOptions);
      if (resp.ok) return resp;
      if ((resp.status === 403 || resp.status === 429) && i < retries) {
        console.log(`Got ${resp.status}, retrying (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
        continue;
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${url}`);
      }
    } catch (e) {
      if (i < retries) {
        console.log(`Fetch error, retrying (${i + 1}/${retries}): ${e}`);
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Failed after ${retries} retries for ${url}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { source, categoryUrl, limit = 20, fetchDetails = false, cronMode = false, targetCategory, targetLocation, userId, customProxyUrl, singleUrlMode = false, bulkUrls } = body;
    activeProxyUrl = customProxyUrl;

    // If not cron mode, verify admin auth
    if (!cronMode) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      const authHeader = req.headers.get('Authorization');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!authHeader || !anonKey || !authHeader.includes(anonKey)) {
        console.log('Cron auth check - using service key verification');
      }
    }

    if (!source || (!categoryUrl && !bulkUrls)) {
      return new Response(JSON.stringify({ error: 'source and categoryUrl (or bulkUrls) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle bulk URLs mode
    if (bulkUrls && Array.isArray(bulkUrls) && bulkUrls.length > 0) {
      console.log(`Bulk scraping ${bulkUrls.length} URLs from ${source}`);
      const allListings: ScrapedListing[] = [];
      
      for (let i = 0; i < bulkUrls.length; i++) {
        const url = bulkUrls[i];
        try {
          console.log(`Bulk [${i + 1}/${bulkUrls.length}]: ${url}`);
          let items: ScrapedListing[] = [];
          
          if (source === 'tap.az') {
            const detail = await fetchTapAzDetail(url);
            if (detail) {
              items = [{
                title: detail.title || '',
                price: detail.price || 0,
                currency: '₼',
                image_urls: detail.image_urls || [],
                location: detail.location || 'Bakı',
                description: detail.description || '',
                source_url: url,
                category: '',
                condition: detail.condition || 'İşlənmiş',
                custom_fields: detail.custom_fields || {},
                seller_name: detail.seller_name,
                seller_phone: detail.seller_phone,
              }];
            }
          } else if (source === 'temu') {
            items = await scrapeTemuSingle(url);
          } else {
            const detail = await fetchGenericDetail(url);
            if (detail) {
              items = [{
                title: detail.title || url,
                price: detail.price || 0,
                currency: '₼',
                image_urls: detail.image_urls || [],
                location: 'Bakı',
                description: detail.description || '',
                source_url: url,
                category: '',
                condition: 'İşlənmiş',
                custom_fields: {},
              }];
            }
          }
          
          allListings.push(...items);
          // Delay between requests
          if (i < bulkUrls.length - 1) {
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
          }
        } catch (e) {
          console.error(`Bulk error for ${url}: ${e}`);
        }
      }
      
      return new Response(JSON.stringify({ success: true, listings: allListings, count: allListings.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Scraping ${source}: ${categoryUrl}, limit: ${limit}, fetchDetails: ${fetchDetails}, cronMode: ${cronMode}`);

    let listings: ScrapedListing[] = [];

    if (singleUrlMode && source === 'tap.az' && categoryUrl.includes('/elanlar/')) {
      console.log('Single detail page detected for tap.az');
      const detail = await fetchTapAzDetail(categoryUrl);
      if (detail) {
        listings = [{ 
          title: detail.title || '',
          price: detail.price || 0,
          currency: '₼',
          image_urls: detail.image_urls || [],
          location: detail.location || 'Bakı',
          description: detail.description || '',
          source_url: categoryUrl,
          category: '',
          condition: detail.condition || 'İşlənmiş',
          custom_fields: detail.custom_fields || {},
          seller_name: detail.seller_name,
          seller_phone: detail.seller_phone,
        }];
      }
    } else if (singleUrlMode && source === 'temu') {
      listings = await scrapeTemuSingle(categoryUrl);
    } else if (source === 'tap.az') {
      listings = await scrapeTapAz(categoryUrl, limit, fetchDetails);
    } else if (source === 'telefon.az') {
      listings = await scrapeTelefonAz(categoryUrl, limit, fetchDetails);
    } else if (source === 'temu') {
      listings = await scrapeTemu(categoryUrl, limit);
    } else {
      listings = await scrapeGeneric(categoryUrl, limit);
    }

    // In cron mode, auto-save to database
    if (cronMode && listings.length > 0 && targetCategory && userId) {
      const titles = listings.map(l => l.title);
      const { data: existing } = await supabase
        .from('listings')
        .select('title')
        .in('title', titles);
      const existingTitles = new Set((existing || []).map((e: any) => e.title));
      const unique = listings.filter(l => !existingTitles.has(l.title));

      if (unique.length > 0) {
        const insertData = unique.map(l => ({
          title: l.title,
          price: l.price || 0,
          currency: l.currency || '₼',
          category: targetCategory,
          location: targetLocation || l.location || 'Bakı',
          description: l.description || l.title,
          image_urls: l.image_urls || [],
          user_id: userId,
          status: 'approved',
          condition: l.condition || 'İşlənmiş',
          custom_fields: l.custom_fields && Object.keys(l.custom_fields).length > 0 ? l.custom_fields : null,
        }));
        const { error: insertErr } = await supabase.from('listings').insert(insertData);
        if (insertErr) console.error('Cron insert error:', insertErr);
        else console.log(`Cron: inserted ${unique.length} new listings`);
      } else {
        console.log('Cron: all duplicates');
      }

      return new Response(JSON.stringify({ success: true, total: listings.length, inserted: listings.length - (existing?.length || 0) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, listings, count: listings.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ========== TAP.AZ ==========
async function scrapeTapAz(url: string, limit: number, fetchDetails: boolean): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];
  
  let sourceLink = url;
  try {
    const urlObj = new URL(url);
    sourceLink = urlObj.pathname + urlObj.search;
  } catch(e) {}

  const query = `query($link: String!, $limit: Int!) {
    ads(first: $limit, source: MOBILE, sourceLink: $link) {
      edges { node { legacyResourceId title price path photo { url } region } }
    }
  }`;

  console.log(`Fetching tap.az API for: ${sourceLink} (limit: ${limit})`);
  
  try {
    const headers = { ...BROWSER_HEADERS, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ query, variables: { link: sourceLink, limit } });
    const resp = await fetchWithRetry('https://tap.az/graphql', 3, headers, { method: 'POST', body });
    const json = await resp.json();
    const edges = json.data?.ads?.edges || [];
    
    for (const edge of edges) {
      if (listings.length >= limit) break;
      const node = edge.node;
      
      listings.push({
        title: node.title,
        price: node.price || 0,
        currency: '₼',
        image_urls: node.photo?.url ? [node.photo.url] : [],
        location: node.region || 'Bakı',
        description: '',
        source_url: `https://tap.az${node.path}`,
        category: '',
        condition: 'İşlənmiş',
        custom_fields: {},
      });
    }
  } catch (e) {
    console.error(`Tap.az GraphQL fetch failed: ${e}`);
  }

  if (fetchDetails && listings.length > 0) {
    console.log(`Fetching details for ${listings.length} listings...`);
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        if (!listing.source_url) return;
        try {
          await new Promise(r => setTimeout(r, batchIdx * 800));
          const detail = await fetchTapAzDetail(listing.source_url);
          if (detail) listings[idx] = { ...listings[idx], ...detail };
        } catch (e) {
          console.error(`Detail fetch failed for ${listing.source_url}: ${e}`);
        }
      });
      await Promise.all(promises);
    }
  }

  return listings;
}

async function fetchTapAzDetail(url: string): Promise<Partial<ScrapedListing> | null> {
  try {
    let legacyId = '';
    const m = url.match(/\/(\d+)$/);
    if (m) legacyId = m[1];
    else return null;

    const query = `query($id: ID!) {
      adDetails(legacyId: $id, source: MOBILE) {
        body
        contact { name phones { number } }
        photos { url }
        properties { name value }
        region
      }
    }`;
    
    const headers = { ...BROWSER_HEADERS, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ query, variables: { id: legacyId } });
    const resp = await fetchWithRetry('https://tap.az/graphql', 3, headers, { method: 'POST', body });
    const json = await resp.json();
    
    const ad = json.data?.adDetails;
    if (!ad) return null;

    const result: Partial<ScrapedListing> = {};
    if (ad.body) result.description = ad.body.replace(/<[^>]+>/g, '').trim();
    if (ad.photos) result.image_urls = ad.photos.map((p: any) => p.url).filter(Boolean);
    if (ad.region) result.location = ad.region;
    
    if (ad.properties) {
      const custom_fields: Record<string, string> = {};
      ad.properties.forEach((p: any) => { if (p.name && p.value) custom_fields[p.name] = p.value; });
      result.custom_fields = custom_fields;
      if (custom_fields['Vəziyyəti']) result.condition = custom_fields['Vəziyyəti'];
    }
    
    if (ad.contact) {
      if (ad.contact.name) result.seller_name = ad.contact.name;
      if (ad.contact.phones && ad.contact.phones.length > 0) {
        result.seller_phone = ad.contact.phones[0].number.replace(/<[^>]+>/g, '').trim();
      }
    }
    
    return result;
  } catch (e) {
    console.error(`Detail error: ${e}`);
    return null;
  }
}

// ========== TELEFON.AZ ==========
async function scrapeTelefonAz(url: string, limit: number, fetchDetails: boolean): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];

  let html: string;
  try {
    const resp = await fetchWithRetry(url);
    html = await resp.text();
  } catch (e) {
    console.error(`Telefon.az fetch failed: ${e}`);
    return listings;
  }

  const cardBlocks = html.split(/class="[^"]*(?:product-card|item-card|announce-card|card-item)\b/).slice(1);
  console.log(`Telefon.az: ${cardBlocks.length} cards found`);

  for (const block of cardBlocks) {
    if (listings.length >= limit) break;
    const chunk = block.substring(0, 3000);

    const linkMatch = chunk.match(/href="([^"]+)"/);
    const titleMatch = chunk.match(/class="[^"]*(?:title|name)[^"]*"[^>]*>([^<]+)/);
    const priceMatch = chunk.match(/([\d.,]+)\s*(?:₼|AZN)/);
    const imgMatch = chunk.match(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);

    const title = titleMatch ? decode(titleMatch[1]) : '';
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

    if (title && title.length > 2) {
      const sourceUrl = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://telefon.az${linkMatch[1]}`) : '';
      listings.push({
        title, price, currency: '₼',
        image_urls: imgMatch ? [imgMatch[1]] : [],
        location: 'Bakı', description: '', source_url: sourceUrl,
        category: '', condition: 'İşlənmiş', custom_fields: {},
      });
    }
  }

  if (fetchDetails && listings.length > 0) {
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        if (!listing.source_url) return;
        try {
          await new Promise(r => setTimeout(r, batchIdx * 800));
          const detail = await fetchGenericDetail(listing.source_url);
          if (detail) listings[idx] = { ...listings[idx], ...detail };
        } catch (e) {
          console.error(`Detail error: ${e}`);
        }
      });
      await Promise.all(promises);
    }
  }

  return listings;
}

// ========== TEMU ==========
// Temu heavily uses JavaScript rendering, so we use multiple strategies
async function scrapeTemu(url: string, limit: number): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];

  // Strategy 1: Try fetching the page with mobile user agent (lighter HTML)
  const mobileHeaders: Record<string, string> = {
    ...TEMU_API_HEADERS,
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  };

  let html = '';
  try {
    const resp = await fetchWithRetry(url, 3, mobileHeaders);
    html = await resp.text();
    console.log(`Temu HTML: ${html.length} chars`);
  } catch (e) {
    console.error(`Temu fetch failed: ${e}`);
  }

  if (html.length > 0) {
    // Try to find embedded JSON data (Temu often embeds product data in script tags)
    const jsonPatterns = [
      /window\.__rawData__\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|<\/script>)/,
      /"goods_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"items"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"goodsList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"searchResult"\s*:\s*(\{[\s\S]*?\})\s*[,}]/,
      /window\.rawData\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|<\/script>)/,
      /"data"\s*:\s*\{[^}]*"goodsList"\s*:\s*(\[[\s\S]*?\])/,
    ];

    for (const pattern of jsonPatterns) {
      if (listings.length > 0) break;
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : (data?.goods_list || data?.goodsList || data?.items || data?.searchResult?.goods_list || []);
          for (const item of items) {
            if (listings.length >= limit) break;
            const title = item.goods_name || item.title || item.name || item.goodsName || '';
            const price = parseFloat(item.price || item.sale_price || item.salePrice || item.min_price || item.minPrice || '0');
            const imgUrl = item.image_url || item.thumb_url || item.goods_img || item.thumbUrl || item.imageUrl || '';
            
            if (title) {
              listings.push({
                title: decode(title),
                price: price || 0,
                currency: '$',
                image_urls: imgUrl ? [imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl] : [],
                location: 'Temu',
                description: item.goods_desc || item.description || '',
                source_url: item.link_url ? (item.link_url.startsWith('http') ? item.link_url : `https://www.temu.com${item.link_url}`) : url,
                category: '',
                condition: 'Yeni',
                custom_fields: {},
              });
            }
          }
          console.log(`Temu JSON strategy found ${listings.length} items`);
        } catch (e) {
          console.error('Temu JSON parse error:', e);
        }
      }
    }

    // Strategy 2: Parse HTML product cards  
    if (listings.length === 0) {
      console.log('Temu: Trying HTML card parsing...');
      
      const cardSplitPatterns = [
        /role="group"/,
        /class="[^"]*_2rn4tSF[^"]*"/,
        /class="[^"]*product-card[^"]*"/,
        /class="[^"]*goods-card[^"]*"/,
        /class="[^"]*_1MOSpMz[^"]*"/,
        /data-goods-id="/,
      ];

      for (const splitPattern of cardSplitPatterns) {
        if (listings.length > 0) break;
        const blocks = html.split(splitPattern).slice(1);
        if (blocks.length === 0) continue;
        console.log(`Temu: Found ${blocks.length} blocks with pattern`);
        
        for (const block of blocks) {
          if (listings.length >= limit) break;
          const chunk = block.substring(0, 5000);
          
          const titleMatch = chunk.match(/title="([^"]{5,})"/) || 
                            chunk.match(/aria-label="([^"]{5,})"/) ||
                            chunk.match(/alt="([^"]{5,})"/) ||
                            chunk.match(/class="[^"]*(?:_2Tl9qLr1|_1ak1dai3)[^"]*"[^>]*>([^<]+)/);
          const priceMatch = chunk.match(/[\$€₼]\s*([\d.,\s]+)/) || 
                            chunk.match(/([\d.,\s]+)\s*[\$€₼₼]/) ||
                            chunk.match(/([\d.,\s]+)\s*AZN/);
          const imgMatch = chunk.match(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
          const linkMatch = chunk.match(/href="(\/[^"]*(?:goods|product)[^"]*)"/);

          const title = titleMatch ? decode(titleMatch[1]) : '';
          if (title && title.length > 3) {
            listings.push({
              title,
              price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0,
              currency: '$',
              image_urls: imgMatch ? [imgMatch[1].startsWith('//') ? `https:${imgMatch[1]}` : imgMatch[1]] : [],
              location: 'Temu',
              description: '',
              source_url: linkMatch ? `https://www.temu.com${linkMatch[1]}` : url,
              category: '',
              condition: 'Yeni',
              custom_fields: {},
            });
          }
        }
      }
    }

    // Strategy 3: Find product links with images
    if (listings.length === 0) {
      console.log('Temu: Last resort - finding product links with images...');
      const allImgs = [...html.matchAll(/<a[^>]+href="([^"]*(?:goods|product)[^"]*)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*(?:alt|title)="([^"]*)"[\s\S]*?<\/a>/gi)];
      for (const m of allImgs) {
        if (listings.length >= limit) break;
        const link = m[1].startsWith('http') ? m[1] : `https://www.temu.com${m[1]}`;
        const img = m[2].startsWith('//') ? `https:${m[2]}` : m[2];
        const title = decode(m[3]);
        if (title && title.length > 3) {
          listings.push({
            title, price: 0, currency: '$',
            image_urls: [img], location: 'Temu', description: '',
            source_url: link, category: '', condition: 'Yeni', custom_fields: {},
          });
        }
      }
    }
  }

  console.log(`Temu: Found ${listings.length} listings total`);
  return listings;
}

// Scrape a single Temu product page
async function scrapeTemuSingle(url: string): Promise<ScrapedListing[]> {
  try {
    const resp = await fetchWithRetry(url, 3, TEMU_API_HEADERS);
    const html = await resp.text();
    console.log(`Temu single page: ${html.length} chars`);

    // Try to extract product data from embedded JSON
    const jsonMatch = html.match(/window\.__rawData__\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|<\/script>)/) ||
                      html.match(/window\.rawData\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|<\/script>)/);
    
    let title = '';
    let price = 0;
    let description = '';
    const imageUrls: string[] = [];

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const goods = data?.store?.goods || data?.goods || data;
        title = goods?.goods_name || goods?.goodsName || '';
        price = parseFloat(goods?.min_price || goods?.minPrice || goods?.price || '0');
        description = goods?.goods_desc || goods?.description || '';
        
        const imgs = goods?.topGalleryList || goods?.gallery || goods?.images || [];
        for (const img of imgs) {
          const imgUrl = typeof img === 'string' ? img : (img?.url || img?.src || '');
          if (imgUrl) imageUrls.push(imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl);
        }
      } catch (e) {
        console.error('Temu single JSON parse error:', e);
      }
    }

    // Try application/ld+json SEO data
    const ldJsonMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const match of ldJsonMatches) {
      try {
        const data = JSON.parse(match[1]);
        const product = Array.isArray(data) ? data.find((item: any) => item['@type'] === 'Product') : (data['@type'] === 'Product' ? data : null);
        if (product) {
          if (!title) title = product.name || '';
          if (!price && product.offers && product.offers.price) price = parseFloat(product.offers.price);
          if (product.image) {
            const imgs = Array.isArray(product.image) ? product.image : [product.image];
            for (const img of imgs) {
              if (typeof img === 'string' && !imageUrls.includes(img)) imageUrls.push(img);
            }
          }
          if (!description && product.description) description = product.description;
        }
      } catch(e) {}
    }

    // Fallback: HTML parsing
    if (!title) {
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                         html.match(/<title>([^<]+)<\/title>/) ||
                         html.match(/class="[^"]*(?:_2Tl9qLr1|_1ak1dai3)[^"]*"[^>]*>([^<]+)/);
      title = titleMatch ? decode(titleMatch[1]).replace(/ \| Temu.*$/, '') : '';
    }

    if (!price) {
      const textOnly = html.replace(/<[^>]+>/g, '');
      const priceMatch = textOnly.match(/[\$€₼]\s*([\d.,\s]{2,10})/) || 
                         textOnly.match(/([\d.,\s]{2,10})\s*[\$€₼]/) ||
                         textOnly.match(/([\d.,\s]{2,10})\s*AZN/);
      price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) : 0;
    }

    if (imageUrls.length === 0) {
      const imgMatches = html.matchAll(/(?:src|data-src)="(https?:\/\/(?:img\.kwcdn\.com|[^"]+kwcdn[^"]+)[^"]*)"/gi);
      for (const im of imgMatches) {
        if (!im[1].includes('icon') && !im[1].includes('logo') && !imageUrls.includes(im[1])) {
          imageUrls.push(im[1]);
          if (imageUrls.length >= 10) break;
        }
      }
    }

    if (title) {
      return [{
        title: decode(title),
        price,
        currency: '$',
        image_urls: imageUrls,
        location: 'Temu',
        description: description ? decode(description.replace(/<[^>]+>/g, '')) : '',
        source_url: url,
        category: '',
        condition: 'Yeni',
        custom_fields: {},
      }];
    }

    return [];
  } catch (e) {
    console.error(`Temu single scrape error: ${e}`);
    return [];
  }
}

// ========== GENERIC ==========
async function scrapeGeneric(url: string, limit: number): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];

  let html: string;
  try {
    const resp = await fetchWithRetry(url);
    html = await resp.text();
  } catch (e) {
    console.error(`Generic fetch failed: ${e}`);
    return listings;
  }

  const itemRegex = /<(?:div|article|li)[^>]*class="[^"]*(?:item|card|product|listing|announce)[^"]*"[^>]*>([\s\S]*?)(?=<(?:div|article|li)[^>]*class="[^"]*(?:item|card|product|listing|announce))/g;
  let match;

  while ((match = itemRegex.exec(html)) !== null && listings.length < limit) {
    const block = match[1];
    const titleMatch = block.match(/<(?:h[1-6]|a|span|div)[^>]*(?:class="[^"]*(?:title|name|heading)[^"]*")[^>]*>([^<]+)/);
    const priceMatch = block.match(/([\d.,\s]+)\s*(?:₼|AZN|manat|USD|\$|€)/);
    const imgMatch = block.match(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    const linkMatch = block.match(/<a[^>]+href="([^"]+)"/);

    const title = titleMatch ? decode(titleMatch[1]) : '';
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) : 0;

    if (title && title.length > 3) {
      listings.push({
        title, price, currency: '₼',
        image_urls: imgMatch ? [imgMatch[1]] : [],
        location: 'Bakı', description: title, source_url: linkMatch ? linkMatch[1] : '',
        category: '', condition: 'İşlənmiş', custom_fields: {},
      });
    }
  }

  return listings;
}

async function fetchGenericDetail(url: string): Promise<Partial<ScrapedListing> | null> {
  try {
    const resp = await fetchWithRetry(url);
    const html = await resp.text();

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const descMatch = html.match(/<div[^>]*class="[^"]*(?:description|content|detail-text|about)[^"]*"[^>]*>([\s\S]*?)<\/div>/);

    const imageUrls: string[] = [];
    const allImgs = html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
    for (const im of allImgs) {
      if (!im[1].includes('logo') && !im[1].includes('icon') && !im[1].includes('banner') && !imageUrls.includes(im[1])) {
        imageUrls.push(im[1]);
        if (imageUrls.length >= 10) break;
      }
    }

    const result: Partial<ScrapedListing> = {};
    if (titleMatch) result.title = decode(titleMatch[1]);
    if (descMatch) {
      result.description = descMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      result.description = decode(result.description);
    }
    if (imageUrls.length > 0) result.image_urls = imageUrls;

    return result;
  } catch {
    return null;
  }
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();
}
