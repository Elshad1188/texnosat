const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
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

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    if (resp.ok) return resp;
    if (resp.status === 403 && i < retries) {
      console.log(`Got 403, retrying (${i + 1})...`);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      continue;
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} for ${url}`);
    }
  }
  throw new Error(`Failed after ${retries} retries for ${url}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const body = await req.json();
    const { source, categoryUrl, limit = 20, fetchDetails = false } = body;

    if (!source || !categoryUrl) {
      return new Response(JSON.stringify({ error: 'source and categoryUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Scraping ${source}: ${categoryUrl}, limit: ${limit}, fetchDetails: ${fetchDetails}`);

    let listings: ScrapedListing[] = [];

    if (source === 'tap.az') {
      listings = await scrapeTapAz(categoryUrl, limit, fetchDetails);
    } else if (source === 'telefon.az') {
      listings = await scrapeTelefonAz(categoryUrl, limit, fetchDetails);
    } else {
      listings = await scrapeGeneric(categoryUrl, limit);
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
  let pageUrl = url;
  let page = 1;

  while (listings.length < limit && page <= 10) {
    console.log(`Fetching tap.az page ${page}: ${pageUrl}`);
    let html: string;
    try {
      const resp = await fetchWithRetry(pageUrl);
      html = await resp.text();
    } catch (e) {
      console.error(`Page fetch failed: ${e}`);
      break;
    }

    console.log(`Got HTML: ${html.length} chars`);

    // tap.az listing structure: each product is inside .products-i
    // Try multiple parsing strategies

    // Strategy 1: Find all product links with data
    const productBlocks = html.split(/class="products-i\b/).slice(1);
    console.log(`Found ${productBlocks.length} product blocks`);

    for (const block of productBlocks) {
      if (listings.length >= limit) break;

      // Get the relevant chunk (until next product or end)
      const chunk = block.substring(0, 3000);

      const linkMatch = chunk.match(/href="(\/elanlar\/[^"]+)"/);
      const sourceUrl = linkMatch ? `https://tap.az${linkMatch[1]}` : '';

      const nameMatch = chunk.match(/class="products-name[^"]*"[^>]*>([^<]+)/);
      const title = nameMatch ? decode(nameMatch[1]) : '';

      // Price: try multiple patterns
      const priceMatch = chunk.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/) ||
                         chunk.match(/([\d\s.,]+)\s*(?:₼|AZN|man)/);
      let price = 0;
      if (priceMatch) {
        const cleaned = priceMatch[1].replace(/<[^>]+>/g, '').replace(/\s/g, '').replace(',', '.');
        price = parseFloat(cleaned) || 0;
      }

      // Image
      const imgMatch = chunk.match(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      const thumbUrl = imgMatch ? imgMatch[1] : null;

      // Location
      const locMatch = chunk.match(/class="products-created[^"]*"[^>]*>([^<]+)/);
      const location = locMatch ? decode(locMatch[1]).split(',')[0].trim() : 'Bakı';

      if (title && title.length > 2) {
        listings.push({
          title,
          price,
          currency: '₼',
          image_urls: thumbUrl ? [thumbUrl] : [],
          location,
          description: '',
          source_url: sourceUrl,
          category: '',
          condition: 'İşlənmiş',
          custom_fields: {},
        });
      }
    }

    // If no products found, try fallback: look for any link to /elanlar/ with surrounding content
    if (listings.length === 0 && page === 1) {
      console.log('Trying fallback parsing...');
      const linkRegex = /href="(\/elanlar\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g;
      let m;
      const seenUrls = new Set<string>();
      while ((m = linkRegex.exec(html)) !== null && listings.length < limit) {
        const href = m[1];
        if (seenUrls.has(href) || href.split('/').length < 4) continue;
        seenUrls.add(href);

        // Try to find title nearby
        const context = html.substring(Math.max(0, m.index - 200), m.index + m[0].length + 500);
        const titleMatch = context.match(/class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]+)/);
        const priceMatch = context.match(/([\d.,]+)\s*(?:₼|AZN)/);

        if (titleMatch) {
          listings.push({
            title: decode(titleMatch[1]),
            price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0,
            currency: '₼',
            image_urls: [],
            location: 'Bakı',
            description: '',
            source_url: `https://tap.az${href}`,
            category: '',
            condition: 'İşlənmiş',
            custom_fields: {},
          });
        }
      }
    }

    // Pagination
    const nextMatch = html.match(/class="[^"]*pagination[^"]*"[\s\S]*?class="[^"]*next[^"]*"[^>]*href="([^"]+)"/);
    if (nextMatch && listings.length < limit) {
      pageUrl = nextMatch[1].startsWith('http') ? nextMatch[1] : `https://tap.az${nextMatch[1]}`;
      page++;
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    } else {
      break;
    }
  }

  // Fetch detail pages for each listing
  if (fetchDetails && listings.length > 0) {
    console.log(`Fetching details for ${listings.length} listings...`);
    // Process in batches of 3 to avoid rate limiting
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        if (!listing.source_url) return;
        try {
          await new Promise(r => setTimeout(r, batchIdx * 800));
          const detail = await fetchTapAzDetail(listing.source_url);
          if (detail) {
            listings[idx] = { ...listings[idx], ...detail };
          }
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
    const resp = await fetchWithRetry(url);
    const html = await resp.text();

    // Title
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? decode(titleMatch[1]) : undefined;

    // Description
    const descMatch = html.match(/class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    let description = '';
    if (descMatch) {
      description = descMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      description = decode(description);
    }

    // All images
    const imageUrls: string[] = [];
    const imgRegex = /class="[^"]*product-photos[^"]*"[\s\S]*?(<\/div>)/;
    const photosBlock = html.match(imgRegex);
    if (photosBlock) {
      const allImgs = photosBlock[0].matchAll(/(?:src|data-src|href)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
      for (const im of allImgs) {
        const imgUrl = im[1];
        if (!imageUrls.includes(imgUrl)) {
          imageUrls.push(imgUrl);
        }
      }
    }
    // Fallback: find all large images on page
    if (imageUrls.length === 0) {
      const allImgs = html.matchAll(/(?:src|data-src)="(https?:\/\/tap\.az\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
      for (const im of allImgs) {
        if (!imageUrls.includes(im[1])) {
          imageUrls.push(im[1]);
        }
      }
    }

    // Properties/specs
    const custom_fields: Record<string, string> = {};
    const propsRegex = /class="[^"]*product-properties[^"]*"[\s\S]*?<\/(?:table|div|ul)>/;
    const propsBlock = html.match(propsRegex);
    if (propsBlock) {
      const rowRegex = /<(?:tr|li|div)[^>]*>\s*<(?:td|span|div)[^>]*>([^<]+)<\/(?:td|span|div)>\s*<(?:td|span|div)[^>]*>([^<]+)/g;
      let propMatch;
      while ((propMatch = rowRegex.exec(propsBlock[0])) !== null) {
        const key = decode(propMatch[1]).trim();
        const val = decode(propMatch[2]).trim();
        if (key && val) {
          custom_fields[key] = val;
        }
      }
    }

    // Price
    const priceMatch = html.match(/class="[^"]*product-price[^"]*"[^>]*>([\s\S]*?)<\//) ||
                       html.match(/([\d\s.,]+)\s*₼/);
    let price: number | undefined;
    if (priceMatch) {
      const cleaned = priceMatch[1].replace(/<[^>]+>/g, '').replace(/\s/g, '').replace(',', '.');
      price = parseFloat(cleaned) || undefined;
    }

    // Location
    const locMatch = html.match(/class="[^"]*product-location[^"]*"[^>]*>([^<]+)/);
    const location = locMatch ? decode(locMatch[1]).trim() : undefined;

    // Condition
    const condMatch = custom_fields['Vəziyyəti'] || custom_fields['Vəziyyət'];

    const result: Partial<ScrapedListing> = {};
    if (title) result.title = title;
    if (description) result.description = description;
    if (imageUrls.length > 0) result.image_urls = imageUrls;
    if (price) result.price = price;
    if (location) result.location = location;
    if (condMatch) result.condition = condMatch;
    if (Object.keys(custom_fields).length > 0) result.custom_fields = custom_fields;

    console.log(`Detail for ${url}: ${imageUrls.length} images, ${Object.keys(custom_fields).length} props`);
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

  // Try multiple patterns for telefon.az
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
        title,
        price,
        currency: '₼',
        image_urls: imgMatch ? [imgMatch[1]] : [],
        location: 'Bakı',
        description: '',
        source_url: sourceUrl,
        category: '',
        condition: 'İşlənmiş',
        custom_fields: {},
      });
    }
  }

  // Fetch details
  if (fetchDetails && listings.length > 0) {
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        if (!listing.source_url) return;
        try {
          await new Promise(r => setTimeout(r, batchIdx * 800));
          const detail = await fetchGenericDetail(listing.source_url);
          if (detail) {
            listings[idx] = { ...listings[idx], ...detail };
          }
        } catch (e) {
          console.error(`Detail error: ${e}`);
        }
      });
      await Promise.all(promises);
    }
  }

  return listings;
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
        title,
        price,
        currency: '₼',
        image_urls: imgMatch ? [imgMatch[1]] : [],
        location: 'Bakı',
        description: title,
        source_url: linkMatch ? linkMatch[1] : '',
        category: '',
        condition: 'İşlənmiş',
        custom_fields: {},
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
