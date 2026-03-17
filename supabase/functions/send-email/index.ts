import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, body, template, template_vars } = await req.json();

    // Get SMTP settings
    const { data: smtpData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "smtp")
      .maybeSingle();

    if (!smtpData?.value) {
      return new Response(JSON.stringify({ error: "SMTP tənzimləmələri qurulmayıb" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtp = smtpData.value as any;

    // If template is specified, get template and apply vars
    let finalSubject = subject;
    let finalBody = body;

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
          finalSubject = tpl.subject;
          finalBody = tpl.body;
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

    // Send via SMTP using Deno's smtp client
    // We use a fetch-based approach to a simple SMTP relay
    // For Deno edge functions, we use the built-in TCP for SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: Number(smtp.port),
        tls: smtp.secure,
        auth: {
          username: smtp.username,
          password: smtp.password,
        },
      },
    });

    await client.send({
      from: `${smtp.from_name} <${smtp.from_email}>`,
      to,
      subject: finalSubject,
      content: finalBody,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
