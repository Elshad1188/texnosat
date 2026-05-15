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
  if (!requestOrigin || requestOrigin.includes("id-preview--")) return APP_ORIGIN;
  return requestOrigin;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const EPOINT_PUBLIC_KEY = Deno.env.get("EPOINT_PUBLIC_KEY");
    const EPOINT_PRIVATE_KEY = Deno.env.get("EPOINT_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!EPOINT_PUBLIC_KEY || !EPOINT_PRIVATE_KEY) throw new Error("Epoint keys not configured");

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read entry fee from settings
    const { data: settings } = await supabase
      .from("contest_settings").select("entry_fee, is_enabled").eq("id", 1).maybeSingle();

    if (!settings?.is_enabled) {
      return new Response(JSON.stringify({ error: "Yarışma deaktivdir" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(settings.entry_fee || 1);
    const order_id = `contest_${user.id.slice(0, 8)}_${Date.now()}`;

    // Stash metadata for callback
    await supabase.from("site_settings").upsert({
      key: `contest_${order_id}`,
      value: { user_id: user.id, amount },
    }, { onConflict: "key" });

    const origin = getRedirectOrigin(req.headers.get("origin"));
    const jsonString = JSON.stringify({
      public_key: EPOINT_PUBLIC_KEY,
      amount: amount.toFixed(2),
      currency: "AZN",
      language: "az",
      order_id,
      description: "Elan24 Cempionati istirak haqqi",
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
    try { epointResult = rawResult ? JSON.parse(rawResult) : null; } catch {
      throw new Error("Epoint cavabı oxunmadı");
    }

    if (epointResult?.status === "success" && epointResult.redirect_url) {
      return new Response(JSON.stringify({
        success: true, redirect_url: epointResult.redirect_url, order_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: false, error: epointResult?.message || rawResult || "Epoint xətası",
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("contest-join error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
