import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "@supabase/supabase-js/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `Sən vizual axtarış assistentisən. İstifadəçinin göndərdiyi şəkli analiz et və bu məhsulu tapmaq üçün ən uyğun axtarış sözlərini Azərbaycan dilində ver. 
Cavabını yalnız JSON formatında ver: {"keywords": "axtarış sözləri", "category": "kateqoriya_slug_or_empty", "description": "qısa təsvir"}
Kateqoriya slug-ları: electronics, clothing, home, vehicles, sports, books, toys, beauty, food, services, animals, garden
Əgər heç bir kateqoriyaya uyğun deyilsə boş string qaytar.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Bu şəkildəki məhsulu analiz et və axtarış sözlərini ver." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API call failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result = { keywords: "", category: "", description: "" };
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        result.keywords = content.replace(/[{}"\n]/g, "").trim();
      }
    } else {
      result.keywords = content.trim();
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Visual search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
