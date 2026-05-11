// AI Blog Generator - real estate, Azerbaijani, daily via cron
// Generates a draft blog post + image; admin must publish manually.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  { slug: "menziller", name: "Mənzillər", topic: "yeni və köhnə tikili mənzillər, qiymət tendensiyaları" },
  { slug: "evler", name: "Həyət evləri", topic: "həyət evi alqı-satqısı və layihələndirmə" },
  { slug: "ofisler", name: "Ofislər", topic: "ofis kirayəsi və biznes mərkəzləri" },
  { slug: "qarajlar", name: "Qarajlar", topic: "qaraj alqı-satqısı, qiymət və yerləşmə" },
  { slug: "torpaq", name: "Torpaq sahələri", topic: "torpaq sahələrinin alınması və sənədləşmə" },
  { slug: "kommersiya", name: "Kommersiya obyektləri", topic: "kommersiya obyektləri investisiyası" },
  { slug: "qeyri-yasayis", name: "Qeyri-yaşayış", topic: "qeyri-yaşayış sahələri və istifadə qaydaları" },
];

function slugify(t: string) {
  const map: Record<string, string> = { ə:"e", ı:"i", ö:"o", ü:"u", ş:"s", ç:"c", ğ:"g", Ə:"e", İ:"i", I:"i", Ö:"o", Ü:"u", Ş:"s", Ç:"c", Ğ:"g" };
  return t.split("").map(c => map[c] || c).join("").toLowerCase()
    .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,90);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check toggle
    const { data: setting } = await supabase
      .from("site_settings").select("value").eq("key", "ai_blog_auto").maybeSingle();
    const enabled = setting?.value?.enabled === true;
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (!enabled && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pick category (rotation by day)
    const dayIdx = Math.floor(Date.now() / 86400000) % CATEGORIES.length;
    const cat = CATEGORIES[dayIdx];

    // Find/ensure blog category
    let categoryId: string | null = null;
    const { data: bc } = await supabase.from("blog_categories").select("id").eq("slug", cat.slug).maybeSingle();
    if (bc) categoryId = bc.id;
    else {
      const { data: newCat } = await supabase.from("blog_categories")
        .insert({ name: cat.name, slug: cat.slug, is_active: true }).select("id").single();
      categoryId = newCat?.id ?? null;
    }

    // Admin author
    const { data: adminRole } = await supabase.from("user_roles")
      .select("user_id").eq("role", "admin").limit(1).maybeSingle();
    if (!adminRole) throw new Error("No admin user found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // Generate post (JSON)
    const prompt = `Sən Azərbaycanlı daşınmaz əmlak mütəxəssisisən. "${cat.name}" mövzusunda (${cat.topic}) maraqlı, faydalı bir bloq yazısı yarat. Bakı və Azərbaycan bazarına uyğun olsun. JSON formatında qaytar:
{
  "title": "qısa, cəlbedici başlıq (60 simvola qədər)",
  "excerpt": "1-2 cümlə qısa təsvir (160 simvola qədər)",
  "content_html": "tam HTML məzmun: <h2>, <p>, <ul><li>, <strong> taqları ilə, 4-6 paraqraf, faydalı məsləhətlər",
  "image_prompt": "İngiliscə qısa şəkil təsviri - Azerbaijan/Baku real estate səhnəsi"
}
Yalnız JSON qaytar, başqa heç nə.`;

    const txtRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!txtRes.ok) throw new Error(`AI text failed: ${await txtRes.text()}`);
    const txtData = await txtRes.json();
    const raw = txtData.choices?.[0]?.message?.content ?? "{}";
    const post = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));

    // Generate image
    let coverUrl: string | null = null;
    try {
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: `Photorealistic image: ${post.image_prompt}. Baku Azerbaijan setting, professional real estate photo, daylight, no text.` }],
          modalities: ["image", "text"],
        }),
      });
      const imgData = await imgRes.json();
      const dataUrl: string | undefined = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (dataUrl?.startsWith("data:")) {
        const b64 = dataUrl.split(",")[1];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const path = `ai-generated/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("blog-images")
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (!upErr) {
          coverUrl = supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
        }
      }
    } catch (e) {
      console.error("image gen failed", e);
    }

    const title = String(post.title || `${cat.name} - yenilik`).slice(0, 120);
    let slug = slugify(title) + "-" + Date.now().toString(36);
    const content = String(post.content_html || "");
    const reading = Math.max(1, Math.round(content.replace(/<[^>]+>/g," ").split(/\s+/).filter(Boolean).length / 200));

    const { data: inserted, error: insErr } = await supabase.from("blog_posts").insert({
      author_id: adminRole.user_id,
      title,
      slug,
      excerpt: String(post.excerpt || "").slice(0, 300),
      content,
      cover_url: coverUrl,
      category_id: categoryId,
      meta_title: title,
      meta_description: String(post.excerpt || "").slice(0, 160),
      reading_minutes: reading,
      is_published: false,
      is_featured: false,
    }).select("id, title").single();
    if (insErr) throw insErr;

    // Notify admin
    await supabase.from("notifications").insert({
      user_id: adminRole.user_id,
      type: "info",
      title: "Yeni AI bloq yazısı təsdiq gözləyir",
      message: `"${title}" — admin paneldən yoxlayıb dərc edin.`,
      link: "/admin?tab=blog",
    });

    return new Response(JSON.stringify({ ok: true, post: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
