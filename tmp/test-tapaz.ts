const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,az;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

async function fetchWithRetry(url: string, retries = 3, customHeaders?: Record<string, string>, extraOpts?: RequestInit): Promise<Response> {
  const headers = customHeaders || BROWSER_HEADERS;
  for (let i = 0; i <= retries; i++) {
    try {
      const fetchOptions: any = { headers, redirect: 'follow', ...extraOpts };
      const resp = await fetch(url, fetchOptions);
      if (resp.ok) return resp;
      if (i < retries) {
        console.log(`Got ${resp.status}, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`HTTP ${resp.status} for ${url}`);
    } catch (e) {
      if (i < retries) { console.log('Retrying error:', e); await new Promise(r => setTimeout(r, 1000)); continue; }
      throw e;
    }
  }
  throw new Error('Failed');
}

async function fetchTapAzDetail(url: string): Promise<any> {
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

    const result: any = {};
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
  } catch (e) { console.error(e); return null; }
}

async function scrapeTapAz(url: string, limit: number, fetchDetails: boolean): Promise<any[]> {
  const listings: any[] = [];
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
  } catch (e) { console.error(`Tap.az GraphQL fetch failed: ${e}`); }

  if (fetchDetails && listings.length > 0) {
    console.log(`Fetching details for ${listings.length} listings...`);
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        try {
          const detail = await fetchTapAzDetail(listing.source_url);
          if (detail) listings[idx] = { ...listings[idx], ...detail };
        } catch (e) { console.error(e); }
      });
      await Promise.all(promises);
    }
  }

  return listings;
}

scrapeTapAz('https://tap.az/elanlar/elektronika/telefonlar', 2, true).then(l => {
  console.log('Final Result:', JSON.stringify(l, null, 2));
});
