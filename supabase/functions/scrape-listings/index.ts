const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ScrapedListing {
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  location: string;
  description: string;
  source_url: string;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
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

    // Check admin role
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { source, categoryUrl, limit, targetCategory, targetLocation } = await req.json();

    if (!source || !categoryUrl) {
      return new Response(JSON.stringify({ error: 'source and categoryUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Scraping ${source}: ${categoryUrl}, limit: ${limit || 'all'}`);

    let listings: ScrapedListing[] = [];

    if (source === 'tap.az') {
      listings = await scrapeTapAz(categoryUrl, limit || 20);
    } else if (source === 'telefon.az') {
      listings = await scrapeTelefonAz(categoryUrl, limit || 20);
    } else {
      // Generic scraper
      listings = await scrapeGeneric(categoryUrl, limit || 20);
    }

    // If just preview (no save)
    const { save } = await req.json().catch(() => ({ save: false }));

    if (!save) {
      return new Response(JSON.stringify({ success: true, listings, count: listings.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save to database
    const insertData = listings.map(l => ({
      title: l.title,
      price: l.price,
      currency: l.currency || '₼',
      category: targetCategory || 'digər',
      location: targetLocation || l.location || 'Bakı',
      description: l.description || '',
      image_urls: l.image_url ? [l.image_url] : [],
      user_id: user.id,
      status: 'approved',
      condition: 'İşlənmiş',
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert(insertData)
      .select('id');

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, inserted: inserted?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function scrapeTapAz(url: string, limit: number): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];
  let pageUrl = url;
  let page = 1;

  while (listings.length < limit) {
    console.log(`Fetching page ${page}: ${pageUrl}`);
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'az,en;q=0.9',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${pageUrl}: ${response.status}`);
      break;
    }

    const html = await response.text();

    // Parse tap.az listing cards
    // tap.az uses .products-i class for each listing
    const productRegex = /<div class="products-i[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;

    while ((match = productRegex.exec(html)) !== null && listings.length < limit) {
      const card = match[1];

      // Extract title
      const titleMatch = card.match(/<div class="products-name"[^>]*>(.*?)<\/div>/);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

      // Extract price
      const priceMatch = card.match(/<span class="product-price__i--bold">([\d\s,.]+)<\/span>/);
      const priceText = priceMatch ? priceMatch[1].replace(/\s/g, '').replace(',', '.') : '0';
      const price = parseFloat(priceText) || 0;

      // Extract image
      const imgMatch = card.match(/<img[^>]+src="([^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // Extract link
      const linkMatch = card.match(/<a[^>]+href="([^"]+)"/);
      const sourceUrl = linkMatch ? `https://tap.az${linkMatch[1]}` : '';

      // Extract location
      const locationMatch = card.match(/<div class="products-created"[^>]*>([^<]*)/);
      const location = locationMatch ? decodeHtmlEntities(locationMatch[1].trim().split(',')[0]) : 'Bakı';

      if (title && price > 0) {
        listings.push({
          title,
          price,
          currency: '₼',
          image_url: imageUrl,
          location: location || 'Bakı',
          description: title,
          source_url: sourceUrl,
          category: '',
        });
      }
    }

    // If we couldn't parse with the first regex, try alternative
    if (listings.length === 0 && page === 1) {
      // Try simpler pattern for tap.az
      const simpleRegex = /<a[^>]+class="products-link"[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<div class="products-name"[^>]*>([^<]+)<\/div>[\s\S]*?<span class="price-val"[^>]*>([\d\s,.]+)<\/span>/g;
      let simpleMatch;
      while ((simpleMatch = simpleRegex.exec(html)) !== null && listings.length < limit) {
        listings.push({
          title: decodeHtmlEntities(simpleMatch[3].trim()),
          price: parseFloat(simpleMatch[4].replace(/\s/g, '').replace(',', '.')) || 0,
          currency: '₼',
          image_url: simpleMatch[2],
          location: 'Bakı',
          description: decodeHtmlEntities(simpleMatch[3].trim()),
          source_url: `https://tap.az${simpleMatch[1]}`,
          category: '',
        });
      }
    }

    // Even simpler fallback - just find any product-like structure
    if (listings.length === 0 && page === 1) {
      // Extract all links with prices from the page
      const anyProductRegex = /<a[^>]+href="(\/elanlar\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g;
      const priceRegex2 = /([\d.,]+)\s*(?:₼|AZN|manat)/g;
      const titleRegex2 = /<(?:h[1-6]|div|span|p)[^>]*class="[^"]*(?:title|name|heading)[^"]*"[^>]*>([^<]+)</g;

      // Just return the raw HTML structure info for debugging
      console.log('HTML length:', html.length);
      console.log('Sample HTML (first 2000 chars):', html.substring(0, 2000));
    }

    // Check for next page
    const nextPageMatch = html.match(/<a[^>]+class="[^"]*next[^"]*"[^>]+href="([^"]+)"/);
    if (nextPageMatch && listings.length < limit) {
      pageUrl = nextPageMatch[1].startsWith('http') ? nextPageMatch[1] : `https://tap.az${nextPageMatch[1]}`;
      page++;
    } else {
      break;
    }

    if (page > 10) break; // Safety limit
  }

  return listings;
}

async function scrapeTelefonAz(url: string, limit: number): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'az,en;q=0.9',
    }
  });

  if (!response.ok) return listings;
  const html = await response.text();

  // telefon.az product cards
  const cardRegex = /<div class="[^"]*product-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null && listings.length < limit) {
    const card = match[1];
    const titleMatch = card.match(/<[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)/);
    const priceMatch = card.match(/([\d.,]+)\s*(?:₼|AZN)/);
    const imgMatch = card.match(/<img[^>]+src="([^"]+)"/);
    const linkMatch = card.match(/<a[^>]+href="([^"]+)"/);

    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) : 0;

    if (title && price > 0) {
      listings.push({
        title,
        price,
        currency: '₼',
        image_url: imgMatch ? imgMatch[1] : null,
        location: 'Bakı',
        description: title,
        source_url: linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://telefon.az${linkMatch[1]}`) : '',
        category: '',
      });
    }
  }

  return listings;
}

async function scrapeGeneric(url: string, limit: number): Promise<ScrapedListing[]> {
  const listings: ScrapedListing[] = [];
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });

  if (!response.ok) return listings;
  const html = await response.text();

  // Generic: try to find items with price and title
  // Look for common patterns: cards with price and title
  const itemRegex = /<(?:div|article|li)[^>]*class="[^"]*(?:item|card|product|listing|announce)[^"]*"[^>]*>([\s\S]*?)(?=<(?:div|article|li)[^>]*class="[^"]*(?:item|card|product|listing|announce)|\Z)/g;
  let match;

  while ((match = itemRegex.exec(html)) !== null && listings.length < limit) {
    const block = match[1];
    
    // Extract title from headings or title-like elements
    const titleMatch = block.match(/<(?:h[1-6]|a|span|div)[^>]*(?:class="[^"]*(?:title|name|heading)[^"]*"|title="([^"]+)")[^>]*>([^<]+)/);
    const title = titleMatch ? decodeHtmlEntities((titleMatch[2] || titleMatch[1]).trim()) : null;

    // Extract price
    const priceMatch = block.match(/([\d.,\s]+)\s*(?:₼|AZN|manat|USD|\$|€)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) : 0;

    // Extract image
    const imgMatch = block.match(/<img[^>]+(?:src|data-src)="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // Extract link
    const linkMatch = block.match(/<a[^>]+href="([^"]+)"/);

    if (title && title.length > 3) {
      listings.push({
        title,
        price,
        currency: '₼',
        image_url: imageUrl,
        location: 'Bakı',
        description: title,
        source_url: linkMatch ? linkMatch[1] : '',
        category: '',
      });
    }
  }

  return listings;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
