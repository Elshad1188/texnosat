import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    // Check admin or moderator role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMod } = await supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" });
    
    // If not admin/mod, check store premium status and daily limit
    if (!isAdmin && !isMod) {
      const { data: stores } = await supabase.from("stores").select("id, is_premium, premium_until").eq("user_id", user.id);
      const hasPremiumStore = stores?.some((s: any) => s.is_premium && (!s.premium_until || new Date(s.premium_until) > new Date()));
      
      if (!hasPremiumStore) {
        // Check daily AI usage limit
        const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: settingsRow } = await serviceSupabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
        const dailyLimit = (settingsRow?.value as any)?.ai_autofill_daily_limit ?? 3;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await serviceSupabase.from("listings").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", today.toISOString());
        
        if ((count || 0) >= dailyLimit) {
          return new Response(JSON.stringify({ error: `Gündəlik ${dailyLimit} AI doldurma limiti dolub. Premium mağaza alın limitsiz istifadə edin.` }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { image_url } = await req.json();
    if (!image_url) throw new Error("image_url is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch available categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, name")
      .eq("is_active", true)
      .is("parent_id", null);

    const categoryList = (categories || []).map((c: any) => c.slug).join(", ");
    const categoryNames = (categories || []).map((c: any) => `${c.slug} (${c.name})`).join(", ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sən məhsul tanıyan AI köməkçisisən. Şəkildəki məhsulu analiz et və aşağıdakı sahələri Azərbaycan dilində doldur. Mövcud kateqoriyalar: ${categoryNames}. Vəziyyət seçimləri: Yeni, Yeni kimi, İşlənmiş. Qiyməti AZN ilə ver. Cavabı yalnız JSON formatında qaytar, əlavə mətn olmasın.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Bu şəkildəki məhsulu analiz et və JSON formatında cavab ver:
{
  "title": "Məhsulun adı (qısa və dəqiq)",
  "description": "Məhsulun ətraflı təsviri (2-3 cümlə)",
  "price": "təxmini qiymət (yalnız rəqəm)",
  "category": "uyğun kateqoriya slug (${categoryList})",
  "condition": "Yeni / Yeni kimi / İşlənmiş"
}`,
              },
              {
                type: "image_url",
                image_url: { url: image_url },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_product_info",
              description: "Extract product information from image",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Product title in Azerbaijani" },
                  description: { type: "string", description: "Product description in Azerbaijani" },
                  price: { type: "string", description: "Estimated price number only" },
                  category: { type: "string", description: "Category slug from available categories" },
                  condition: { type: "string", enum: ["Yeni", "Yeni kimi", "İşlənmiş"] },
                },
                required: ["title", "description", "price", "category", "condition"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_product_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çox sorğu göndərildi, bir az gözləyin" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI xidməti üçün kredit tələb olunur" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI xidmətindən cavab alınmadı");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const productInfo = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(productInfo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
    const content = result.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return new Response(JSON.stringify(JSON.parse(jsonMatch[0])), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("AI cavabı düzgün formatda deyil");
  } catch (e) {
    console.error("autofill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Xəta baş verdi" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
