import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "@supabase/supabase-js/cors";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EPOINT_PUBLIC_KEY = Deno.env.get("EPOINT_PUBLIC_KEY");
    const EPOINT_PRIVATE_KEY = Deno.env.get("EPOINT_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EPOINT_PUBLIC_KEY || !EPOINT_PRIVATE_KEY) {
      throw new Error("Epoint keys not configured");
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_id, amount, description, is_topup, user_id: topup_user_id } = body;

    if (!order_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing order_id or amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For top-up, store metadata so callback knows it's a balance top-up
    if (is_topup) {
      await supabase.from("site_settings").upsert({
        key: `topup_${order_id}`,
        value: { user_id: topup_user_id || user.id, amount: Number(amount) },
      }, { onConflict: "key" });
    }

    // Build the base URL for redirects
    const origin = req.headers.get("origin") || "https://elan24.lovable.app";

    // Build JSON payload
    const jsonString = JSON.stringify({
      public_key: EPOINT_PUBLIC_KEY,
      amount: String(Number(amount).toFixed(2)),
      currency: "AZN",
      language: "az",
      order_id: String(order_id),
      description: description || "Sifariş ödənişi",
      success_redirect_url: `${origin}/payment-result?status=success&order_id=${order_id}`,
      error_redirect_url: `${origin}/payment-result?status=error&order_id=${order_id}`,
    });

    // Base64 encode
    const data = btoa(jsonString);

    // Create signature: base64_encode(sha1(private_key + data + private_key, binary))
    const sgnString = EPOINT_PRIVATE_KEY + data + EPOINT_PRIVATE_KEY;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(sgnString));
    const signature = base64Encode(new Uint8Array(hashBuffer));

    // POST to Epoint API
    const formData = new URLSearchParams();
    formData.append("data", data);
    formData.append("signature", signature);

    const epointResponse = await fetch("https://epoint.az/api/1/request", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const epointResult = await epointResponse.json();

    if (epointResult.status === "success" && epointResult.redirect_url) {
      // Save transaction reference to order
      await supabase.from("orders").update({
        payment_method: "card",
        status: "pending",
      }).eq("id", order_id);

      return new Response(JSON.stringify({
        success: true,
        redirect_url: epointResult.redirect_url,
        transaction: epointResult.transaction,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: epointResult.message || "Epoint API error",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Epoint payment error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
