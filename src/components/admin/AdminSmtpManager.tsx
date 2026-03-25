import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Mail, TestTube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  secure: boolean;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplates {
  new_message: EmailTemplate;
  welcome: EmailTemplate;
  password_reset: EmailTemplate;
}

const defaultSmtp: SmtpConfig = {
  host: "",
  port: "587",
  username: "",
  password: "",
  from_email: "",
  from_name: "Elan24",
  secure: true,
};

const defaultTemplates: EmailTemplates = {
  new_message: {
    subject: "Yeni mesajınız var - {{sender_name}}",
    body: "Salam {{recipient_name}},\n\n{{sender_name}} sizə yeni mesaj göndərdi:\n\n\"{{message_preview}}\"\n\nMesajı oxumaq üçün daxil olun:\n{{site_url}}/messages\n\nHörmətlə,\nElan24 komandası",
  },
  welcome: {
    subject: "Elan24-ə xoş gəldiniz!",
    body: "Salam {{user_name}},\n\nElan24 platformasına qeydiyyatdan keçdiyiniz üçün təşəkkür edirik!\n\nElanlara baxın və öz elanınızı yerləşdirin:\n{{site_url}}\n\nHörmətlə,\nElan24 komandası",
  },
  password_reset: {
    subject: "Şifrə sıfırlama tələbi",
    body: "Salam,\n\nŞifrənizi sıfırlamaq üçün aşağıdakı linkə keçin:\n\n{{reset_link}}\n\nBu sorğunu siz etməmisinizsə, bu mesajı nəzərə almayın.\n\nHörmətlə,\nElan24 komandası",
  },
};

const AdminSmtpManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [templates, setTemplates] = useState<EmailTemplates>(defaultTemplates);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [smtpRes, tplRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "smtp").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "email_templates").maybeSingle(),
      ]);
      if (smtpRes.data?.value) {
        const val = smtpRes.data.value as any;
        setSmtp({ ...defaultSmtp, ...val });
      }
      if (tplRes.data?.value) {
        const val = tplRes.data.value as any;
        setTemplates({
          new_message: { ...defaultTemplates.new_message, ...(val.new_message || {}) },
          welcome: { ...defaultTemplates.welcome, ...(val.welcome || {}) },
          password_reset: { ...defaultTemplates.password_reset, ...(val.password_reset || {}) },
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSettings = async (key: string, value: any) => {
    setSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value, updated_by: user?.id }).eq("key", key);
    } else {
      await supabase.from("site_settings").insert({ key, value, updated_by: user?.id });
    }
    setSaving(false);
  };

  const saveSmtp = async () => {
    await saveSettings("smtp", smtp);
    toast({ title: "SMTP tənzimləmələri saxlanıldı" });
  };

  const saveTemplates = async () => {
    await saveSettings("email_templates", templates);
    toast({ title: "E-mail şablonları saxlanıldı" });
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Test e-mail ünvanı daxil edin", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await supabase.functions.invoke("send-email", {
        body: {
          to: testEmail,
          subject: "Texnosat - Test e-mail",
          body: "Bu test e-mailidir. SMTP tənzimləmələriniz düzgün işləyir!",
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Test e-mail göndərildi!" });
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const updateTemplate = (key: keyof EmailTemplates, field: keyof EmailTemplate, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* SMTP Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> SMTP Tənzimləmələri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Host</Label>
              <Input value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Port</Label>
              <Input value={smtp.port} onChange={e => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">İstifadəçi adı</Label>
              <Input value={smtp.username} onChange={e => setSmtp({ ...smtp, username: e.target.value })} placeholder="user@gmail.com" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Şifrə</Label>
              <Input type="password" value={smtp.password} onChange={e => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Göndərən e-mail</Label>
              <Input value={smtp.from_email} onChange={e => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@texnosat.az" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Göndərən adı</Label>
              <Input value={smtp.from_name} onChange={e => setSmtp({ ...smtp, from_name: e.target.value })} placeholder="Texnosat" className="h-9 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={smtp.secure} onCheckedChange={v => setSmtp({ ...smtp, secure: v })} />
            <Label className="text-xs">SSL/TLS istifadə et</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveSmtp} disabled={saving} size="sm" className="gap-1 bg-gradient-primary text-primary-foreground">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saxlanılır..." : "SMTP saxla"}
            </Button>
          </div>

          {/* Test email */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="h-9 text-xs flex-1" />
            <Button onClick={sendTestEmail} disabled={testing || !smtp.host} size="sm" variant="outline" className="gap-1 shrink-0">
              <TestTube className="h-3.5 w-3.5" /> {testing ? "Göndərilir..." : "Test et"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> E-mail Şablonları</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="new_message">
            <TabsList className="mb-3">
              <TabsTrigger value="new_message" className="text-xs">Yeni mesaj</TabsTrigger>
              <TabsTrigger value="welcome" className="text-xs">Xoş gəldin</TabsTrigger>
              <TabsTrigger value="password_reset" className="text-xs">Şifrə sıfırlama</TabsTrigger>
            </TabsList>

            {(Object.keys(templates) as Array<keyof EmailTemplates>).map(key => (
              <TabsContent key={key} value={key} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mövzu</Label>
                  <Input value={templates[key].subject} onChange={e => updateTemplate(key, "subject", e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mətn</Label>
                  <Textarea value={templates[key].body} onChange={e => updateTemplate(key, "body", e.target.value)} rows={8} className="text-xs font-mono" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Dəyişənlər: {"{{recipient_name}}, {{sender_name}}, {{message_preview}}, {{site_url}}, {{user_name}}, {{reset_link}}"}
                </p>
              </TabsContent>
            ))}
          </Tabs>
          <Button onClick={saveTemplates} disabled={saving} size="sm" className="mt-3 gap-1 bg-gradient-primary text-primary-foreground">
            <Save className="h-3.5 w-3.5" /> Şablonları saxla
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSmtpManager;
