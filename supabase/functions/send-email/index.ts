import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Authentication & authorization ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7).trim();
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userAuthError } = await userClient.auth.getUser();
    if (userAuthError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email;

    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    const isAdmin = !!isAdminData;

    const bodyJson = await req.json().catch(() => ({}));
    const { to, to_user_id, subject, body, template, template_vars } = bodyJson;

    // Non-admins can only send email to themselves
    if (!isAdmin) {
      if (to_user_id && to_user_id !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (to && callerEmail && to.toLowerCase() !== callerEmail.toLowerCase()) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve email from user_id if needed
    let recipientEmail = to;
    if (!recipientEmail && to_user_id) {
      const { data: userResponse, error: userError } = await supabase.auth.admin.getUserById(to_user_id);
      if (userError || !userResponse?.user?.email) {
        console.error("User email not found or error:", userError);
        return new Response(JSON.stringify({ error: "İstifadəçi e-mail tapılmadı" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recipientEmail = userResponse.user.email;
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Resipient e-mail təyin edilməyib" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get SMTP settings
    const { data: smtpData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "smtp")
      .maybeSingle();

    if (!smtpData?.value) {
      console.error("SMTP settings not found in site_settings");
      return new Response(JSON.stringify({ error: "SMTP tənzimləmələri qurulmayıb" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtp = smtpData.value as any;

    // If template is specified, get template and apply vars
    let finalSubject = subject || "Yeni bildiriş";
    let finalBody = body || "";

    if (template) {
      const { data: tplData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "email_templates")
        .maybeSingle();

      if (tplData?.value) {
        const templates = tplData.value as any;
        const tpl = templates[template];
        if (tpl) {
          finalSubject = tpl.subject || finalSubject;
          finalBody = tpl.body || finalBody;
          // Replace template variables
          if (template_vars) {
            for (const [key, val] of Object.entries(template_vars)) {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
              finalSubject = finalSubject.replace(regex, val as string);
              finalBody = finalBody.replace(regex, val as string);
            }
          }
        }
      }
    }

    // Use denomailer for SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    if (!smtp || !smtp.host) {
      console.warn("SMTP host is not configured in site_settings. Skipping email send.");
      return new Response(JSON.stringify({ success: true, bypassed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up host string (remove trailing spaces, protocols, common typos)
    let rawHost = String(smtp.host).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    // Auto-correct common typos: smpt -> smtp
    rawHost = rawHost.replace(/^smpt\./i, 'smtp.');

    const port = Number(smtp.port) || 465;
    // Port 465 uses implicit TLS; port 587/25 use STARTTLS (tls:false lets denomailer upgrade)
    const useTls = port === 465;

    const client = new SMTPClient({
      connection: {
        hostname: rawHost,
        port,
        tls: useTls,
        auth: {
          username: smtp.username || "",
          password: smtp.password || "",
        },
      },
    });

    await client.send({
      from: `${smtp.from_name || "Elan24"} <${smtp.from_email || smtp.username}>`,
      to: recipientEmail,
      subject: finalSubject,
      content: finalBody,
      html: finalBody.includes("<") ? finalBody : undefined, // simple HTML detection
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Email send fatal error:", error?.message, error?.stack);
    return new Response(JSON.stringify({ error: "Email göndərilə bilmədi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
