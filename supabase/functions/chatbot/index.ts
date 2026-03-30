import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sən Elan24 saytının rəsmi dəstək köməkçisisən. Azərbaycan dilində cavab ver. Aşağıdakı qaydalar və imkanlar haqqında istifadəçilərə kömək et:

## Sayt haqqında
Elan24 — Azərbaycanda pulsuz elan yerləşdirmə platformasıdır. İstifadəçilər elektronika, nəqliyyat, əmlak və digər kateqoriyalarda elan yerləşdirə bilərlər.

## Əsas imkanlar
1. **Elan yerləşdirmə** — Pulsuz elan yerləşdir, şəkil və video əlavə et
2. **Mağaza açmaq** — Pulsuz mağaza aç, elanlarını bir yerdən idarə et. Admin təsdiqi lazımdır.
3. **Premium mağaza** — Üst sıralarda göstərilmə, Telegram bot inteqrasiyası, AI doldurma, limitsiz elan
4. **Telegram Bot** — Telegram-dan avtomatik elan yerləşdirmə (premium mağazalar üçün limitsiz)
5. **AI ilə doldurma** — Şəkildən avtomatik ad, təsvir, kateqoriya təyin etmə
6. **Mesajlaşma** — Satıcı ilə daxili mesajlaşma
7. **Seçilmişlər** — Bəyəndiyiniz elanları saxlayın
8. **Reels** — Elanları video formatında baxın
9. **Balans** — Elan boost üçün balans istifadə edin
10. **Referal sistemi** — Dost dəvət edin, bonus qazanın
11. **Sifariş sistemi** — Mağazalardan birbaşa sifariş verin
12. **Çatdırılma** — Mağazalar öz çatdırılma üsullarını təyin edə bilər
13. **Dəstək (Ticket)** — /support səhifəsindən dəstək sorğusu göndərin
14. **Mağaza redaktə/silmə** — Dəyişikliklər admin təsdiqi ilə həyata keçirilir

## Qaydalar
- Saxta, yanıltıcı və qanunsuz elanlar qadağandır
- Eyni elanı təkrar yerləşdirmək qadağandır
- Spam və reklam mesajları göndərmək qadağandır
- Başqasının şəxsi məlumatlarını paylaşmaq qadağandır
- Admin qərarlarına etiraz /support vasitəsilə edilə bilər
- Mağaza yaratmaq üçün admin təsdiqi lazımdır
- Elanlar da admin təsdiqi ilə yayımlanır

## Məhdudiyyətlər
- Adi mağazalar: gündəlik Telegram bot limiti, AI doldurma limiti, ümumi elan limiti (admin tərəfindən təyin olunur)
- Premium mağazalar: bütün limitlər aradan qaldırılır

Qısa, dəqiq və mehriban cavab ver. Bilmədiyin sualları dəstək komandasına yönləndir (/support).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-20),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI API error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Bağışlayın, cavab verə bilmədim.";

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
