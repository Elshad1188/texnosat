import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const claimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${header}.${claimSet}`;

  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error(`OAuth2 error: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  return access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, link } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user's FCM tokens
    const { data: tokens } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no tokens" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(saJson);
    const projectId = serviceAccount.project_id;
    const accessToken = await getAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      try {
        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body: body || "" },
              data: {
                link: link || "/",
              },
              webpush: {
                headers: {
                  Urgency: "high",
                },
                notification: {
                  icon: "/pwa-192.png",
                  badge: "/pwa-192.png",
                },
                fcm_options: { link: link || "/" },
              },
            },
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const err = await res.json();
          // Token expired or invalid - mark for cleanup
          if (err?.error?.details?.some((d: any) =>
            d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT"
          )) {
            staleTokens.push(token);
          }
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Clean up stale tokens
    if (staleTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", staleTokens);
    }

    return new Response(JSON.stringify({ sent, failed, cleaned: staleTokens.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-user-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
