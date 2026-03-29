import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Verify admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

  const { action, bot_token, bot_name } = await req.json();

  if (action === "get") {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "telegram_bot").maybeSingle();
    const val = data?.value as any;
    return new Response(JSON.stringify({
      bot_name: val?.bot_name || "",
      bot_token_masked: val?.bot_token ? "***" + val.bot_token.slice(-8) : "",
      is_configured: !!val?.bot_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "save") {
    if (!bot_token) return new Response(JSON.stringify({ error: "Token tələb olunur" }), { status: 400, headers: corsHeaders });

    // Validate token by calling getMe
    const meResp = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const meData = await meResp.json();
    if (!meData.ok) {
      return new Response(JSON.stringify({ error: "Token yanlışdır. Telegram BotFather-dən düzgün token alın." }), { status: 400, headers: corsHeaders });
    }

    const botUsername = meData.result.username;
    const value = { bot_token, bot_name: bot_name || botUsername, bot_username: botUsername };

    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "telegram_bot").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value, updated_by: user.id }).eq("key", "telegram_bot");
    } else {
      await supabase.from("site_settings").insert({ key: "telegram_bot", value, updated_by: user.id });
    }

    return new Response(JSON.stringify({ ok: true, bot_username: botUsername }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "delete") {
    await supabase.from("site_settings").delete().eq("key", "telegram_bot");
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
});
