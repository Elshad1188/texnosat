import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://elan24.az";

serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const [{ data: listings }, { data: stores }, { data: pages }, { data: posts }, { data: cats }] = await Promise.all([
    supabase.from("listings").select("id, updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(5000),
    supabase.from("stores").select("id, updated_at").limit(2000),
    supabase.from("pages").select("slug, updated_at").eq("is_published", true),
    supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true),
    supabase.from("categories").select("slug, updated_at").limit(500),
  ]);

  const urls: { loc: string; lastmod?: string; priority?: string; changefreq?: string }[] = [
    { loc: `${SITE}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${SITE}/products`, priority: "0.9", changefreq: "daily" },
    { loc: `${SITE}/stores`, priority: "0.8", changefreq: "daily" },
    { loc: `${SITE}/blog`, priority: "0.7", changefreq: "weekly" },
  ];

  for (const c of cats || []) urls.push({ loc: `${SITE}/products?category=${c.slug}`, lastmod: c.updated_at, priority: "0.8", changefreq: "daily" });
  for (const l of listings || []) urls.push({ loc: `${SITE}/product/${l.id}`, lastmod: l.updated_at, priority: "0.7", changefreq: "weekly" });
  for (const s of stores || []) urls.push({ loc: `${SITE}/store/${s.id}`, lastmod: s.updated_at, priority: "0.6", changefreq: "weekly" });
  for (const p of pages || []) urls.push({ loc: `${SITE}/page/${p.slug}`, lastmod: p.updated_at, priority: "0.5" });
  for (const p of posts || []) urls.push({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.updated_at, priority: "0.6", changefreq: "monthly" });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}</url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
});
