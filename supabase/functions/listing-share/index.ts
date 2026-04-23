import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://elan24.az";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const absoluteUrl = (url?: string | null) => {
  if (!url) return `${SITE_URL}/pwa-512.png`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

serve(async (req) => {
  const requestUrl = new URL(req.url);
  const id = requestUrl.searchParams.get("id");

  if (!id) {
    return Response.redirect(SITE_URL, 302);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,price,currency,image_urls")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return Response.redirect(`${SITE_URL}/product/${encodeURIComponent(id)}`, 302);
  }

  const productUrl = `${SITE_URL}/product/${listing.id}`;
  const price = `${Number(listing.price).toLocaleString("az-AZ")} ${listing.currency || "AZN"}`;
  const title = `${listing.title} — ${price}`;
  const imageUrl = absoluteUrl(Array.isArray(listing.image_urls) ? listing.image_urls[0] : null);

  return new Response(`<!doctype html>
<html lang="az">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(price)}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(price)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(price)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
</head>
<body>
  <script>location.replace(${JSON.stringify(productUrl)});</script>
  <a href="${escapeHtml(productUrl)}">${escapeHtml(title)}</a>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
});