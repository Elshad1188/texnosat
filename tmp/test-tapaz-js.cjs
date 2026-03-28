const fs = require('fs');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
};

async function fetchWithRetry(url, retries = 3, customHeaders, extraOpts) {
  const headers = customHeaders || BROWSER_HEADERS;
  for (let i = 0; i <= retries; i++) {
    try {
      const fetchOptions = { headers, redirect: 'follow', ...extraOpts };
      const resp = await fetch(url, fetchOptions);
      if (resp.ok) return resp;
      if (i < retries) { await new Promise(r => setTimeout(r, 1000)); continue; }
      throw new Error(`HTTP ${resp.status} for ${url}`);
    } catch (e) {
      if (i < retries) { await new Promise(r => setTimeout(r, 1000)); continue; }
      throw e;
    }
  }
}

async function fetchTapAzDetail(url) {
  try {
    let legacyId = '';
    const m = url.match(/\/(\d+)$/);
    if (m) legacyId = m[1];
    else return null;

    const query = `query($id: ID!) { adDetails(legacyId: $id, source: MOBILE) { body contact { name phones { number } } photos { url } properties { name value } region } }`;
    const headers = { ...BROWSER_HEADERS, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ query, variables: { id: legacyId } });
    const resp = await fetchWithRetry('https://tap.az/graphql', 3, headers, { method: 'POST', body });
    const json = await resp.json();
    const ad = json.data && json.data.adDetails;
    if (!ad) return null;

    const result = {};
    if (ad.body) result.description = ad.body.replace(/<[^>]+>/g, '').trim();
    if (ad.photos) result.image_urls = ad.photos.map(p => p.url).filter(Boolean);
    if (ad.region) result.location = ad.region;
    
    if (ad.properties) {
      const custom_fields = {};
      ad.properties.forEach(p => { if (p.name && p.value) custom_fields[p.name] = p.value; });
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
  } catch (e) { return null; }
}

async function scrapeTapAz(url, limit, fetchDetails) {
  const listings = [];
  let sourceLink = url;
  try {
    const urlObj = new URL(url);
    sourceLink = urlObj.pathname + urlObj.search;
  } catch(e) {}

  const query = `query($link: String!, $limit: Int!) { ads(first: $limit, source: MOBILE, sourceLink: $link) { edges { node { legacyResourceId title price path photo { url } region } } } }`;

  try {
    const headers = { ...BROWSER_HEADERS, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ query, variables: { link: sourceLink, limit } });
    const resp = await fetchWithRetry('https://tap.az/graphql', 3, headers, { method: 'POST', body });
    const json = await resp.json();
    const edges = (json.data && json.data.ads && json.data.ads.edges) ? json.data.ads.edges : [];
    
    for (const edge of edges) {
      if (listings.length >= limit) break;
      const node = edge.node;
      listings.push({
        title: node.title,
        price: node.price || 0,
        currency: '₼',
        image_urls: node.photo && node.photo.url ? [node.photo.url] : [],
        location: node.region || 'Bakı',
        description: '',
        source_url: `https://tap.az${node.path}`,
        category: '', condition: 'İşlənmiş', custom_fields: {},
      });
    }
  } catch (e) {}

  if (fetchDetails && listings.length > 0) {
    for (let i = 0; i < listings.length; i += 3) {
      const batch = listings.slice(i, i + 3);
      const promises = batch.map(async (listing, batchIdx) => {
        const idx = i + batchIdx;
        try {
          const detail = await fetchTapAzDetail(listing.source_url);
          if (detail) listings[idx] = { ...listings[idx], ...detail };
        } catch (e) { }
      });
      await Promise.all(promises);
    }
  }
  return listings;
}

scrapeTapAz('https://tap.az/elanlar/elektronika/telefonlar', 2, true).then(l => {
  console.log('Final Result Tap.az:');
  console.log(JSON.stringify(l, null, 2));
});
