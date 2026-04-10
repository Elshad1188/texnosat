import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ORIGIN = "https://elan24.lovable.app";
const textEncoder = new TextEncoder();

const toBase64Utf8 = (value: string) => base64Encode(textEncoder.encode(value));

const signPayload = async (privateKey: string, data: string) => {
  const payload = `${privateKey}${data}${privateKey}`;
  const hashBuffer = await crypto.subtle.digest("SHA-1", textEncoder.encode(payload));
  return base64Encode(new Uint8Array(hashBuffer));
};

const getRedirectOrigin = (requestOrigin: string | null) => {
  if (!requestOrigin || requestOrigin.includes("id-preview--")) {
    return APP_ORIGIN;
  }

  return requestOrigin;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const EPOINT_PUBLIC_KEY = Deno.env.get("EPOINT_PUBLIC_KEY");
    const EPOINT_PRIVATE_KEY = Deno.env.get("EPOINT_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!EPOINT_PUBLIC_KEY || !EPOINT_PRIVATE_KEY) {
      throw new Error("Epoint keys not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_id, amount, description, is_topup, user_id: topup_user_id } = body;
    const numericAmount = Number(amount);

    if (!order_id || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid order_id / amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (is_topup) {
      await supabase.from("site_settings").upsert(
        {
          key: `topup_${order_id}`,
          value: { user_id: topup_user_id || user.id, amount: numericAmount },
        },
        { onConflict: "key" },
      );
    }

    const origin = getRedirectOrigin(req.headers.get("origin"));
    const jsonString = JSON.stringify({
      public_key: EPOINT_PUBLIC_KEY,
      amount: numericAmount.toFixed(2),
      currency: "AZN",
      language: "az",
      order_id: String(order_id),
      description: description || "Sifaris odenisi",
      success_redirect_url: `${origin}/payment-result?status=success&order_id=${order_id}`,
      error_redirect_url: `${origin}/payment-result?status=error&order_id=${order_id}`,
    });

    const data = toBase64Utf8(jsonString);
    const signature = await signPayload(EPOINT_PRIVATE_KEY, data);

    const epointResponse = await fetch("https://epoint.az/api/1/request", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data, signature }).toString(),
    });

    const rawResult = await epointResponse.text();
    let epointResult: any = null;

    try {
      epointResult = rawResult ? JSON.parse(rawResult) : null;
    } catch {
      console.error("Epoint payment parse error:", rawResult);
      throw new Error("Epoint cavabı oxunmadı");
    }

    if (epointResult?.status === "success" && epointResult.redirect_url) {
      if (!String(order_id).startsWith("topup_")) {
        await supabase.from("orders").update({
          payment_method: "card",
          status: "pending",
        }).eq("id", order_id);
      }

      return new Response(JSON.stringify({
        success: true,
        redirect_url: epointResult.redirect_url,
        transaction: epointResult.transaction,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errorMessage = epointResult?.message || rawResult || "Epoint API error";
    console.error("Epoint request rejected:", { status: epointResponse.status, errorMessage, origin });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Epoint payment error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});