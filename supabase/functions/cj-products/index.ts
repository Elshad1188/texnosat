// CJ Dropshipping public product feed for the homepage.
// Fetches CJ product list, applies admin-configured commission, returns AZN prices.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

// In-memory token cache (per edge instance). CJ tokens are valid ~15 days.
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getCjToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const email = Deno.env.get('CJ_API_EMAIL');
  const password = Deno.env.get('CJ_API_KEY');
  if (!email || !password) throw new Error('CJ credentials missing');

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json?.result || !json?.data?.accessToken) {
    throw new Error('CJ auth failed: ' + (json?.message || 'unknown'));
  }
  tokenCache = {
    token: json.data.accessToken,
    // accessTokenExpiryDate is ISO; fall back to 12 days
    expiresAt: json.data.accessTokenExpiryDate
      ? new Date(json.data.accessTokenExpiryDate).getTime()
      : Date.now() + 12 * 24 * 3600 * 1000,
  };
  return tokenCache.token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: settings } = await supabase
      .from('cj_settings')
      .select('commission_pct, commission_fixed_azn, usd_to_azn')
      .eq('id', 1)
      .maybeSingle();

    const pct = Number(settings?.commission_pct ?? 30);
    const fixed = Number(settings?.commission_fixed_azn ?? 0);
    const rate = Number(settings?.usd_to_azn ?? 1.7);

    const token = await getCjToken();
    const cjRes = await fetch(
      `${CJ_BASE}/product/list?pageNum=${pageNum}&pageSize=${pageSize}`,
      { headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' } },
    );
    const cjJson = await cjRes.json();
    if (!cjJson?.result) {
      return new Response(
        JSON.stringify({ error: cjJson?.message || 'CJ list failed', raw: cjJson }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const list = (cjJson.data?.list || []).map((p: any) => {
      const usd = Number(p.sellPrice?.toString().split('--')[0] || p.sellPrice || 0);
      const finalAzn = usd * rate * (1 + pct / 100) + fixed;
      return {
        pid: p.pid,
        title: p.productNameEn,
        image: p.productImage,
        price_azn: Math.round(finalAzn * 100) / 100,
        price_usd: usd,
        category: p.categoryName,
        sku: p.productSku,
      };
    });

    return new Response(
      JSON.stringify({
        page: pageNum,
        total: cjJson.data?.total ?? list.length,
        items: list,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
