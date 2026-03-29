import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Smartphone, Bell, Send, Link2, Bot, Eye, EyeOff, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminSmtpManager from "./AdminSmtpManager";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

interface IntegrationsConfig {
  app_store_url: string;
  play_store_url: string;
  firebase_config: FirebaseConfig;
}

const defaultFirebase: FirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  vapidKey: "",
};

const defaults: IntegrationsConfig = {
  app_store_url: "",
  play_store_url: "",
  firebase_config: defaultFirebase,
};

const AdminIntegrationsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<IntegrationsConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  // Telegram bot state
  const [botToken, setBotToken] = useState("");
  const [botName, setBotName] = useState("");
  const [botInfo, setBotInfo] = useState<{ bot_name: string; bot_token_masked: string; is_configured: boolean } | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [botSaving, setBotSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "integrations")
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setConfig({
          ...defaults,
          ...val,
          firebase_config: { ...defaultFirebase, ...(val.firebase_config || {}) },
        });
      }
      setLoading(false);
    };
    fetch();
    loadBotInfo();
  }, []);

  const loadBotInfo = async () => {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-bot-token", {
        body: { action: "get" },
      });
      if (!error && data) setBotInfo(data);
    } catch {}
    setBotLoading(false);
  };

  const saveBotToken = async () => {
    if (!botToken.trim()) {
      toast({ title: "Bot token daxil edin", variant: "destructive" });
      return;
    }
    setBotSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-bot-token", {
        body: { action: "save", bot_token: botToken.trim(), bot_name: botName.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Xəta", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Bot uğurla qoşuldu!", description: `@${data.bot_username}` });
        setBotToken("");
        setBotName("");
        loadBotInfo();
      }
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
    setBotSaving(false);
  };

  const deleteBotToken = async () => {
    setBotSaving(true);
    try {
      await supabase.functions.invoke("update-bot-token", {
        body: { action: "delete" },
      });
      toast({ title: "Bot bağlantısı silindi" });
      setBotInfo(null);
    } catch {}
    setBotSaving(false);
  };

  const updateFirebase = (field: keyof FirebaseConfig, value: string) => {
    setConfig({
      ...config,
      firebase_config: { ...config.firebase_config, [field]: value },
    });
  };

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "integrations")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: config as any, updated_by: user?.id })
        .eq("key", "integrations");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "integrations", value: config as any, updated_by: user?.id });
    }

    toast({ title: "İnteqrasiya tənzimləmələri saxlanıldı" });
    setSaving(false);
  };

  const sendPush = async () => {
    if (!pushTitle || !pushBody) {
      toast({ title: "Başlıq və mətn daxil edin", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await supabase.functions.invoke("send-push", {
        body: { title: pushTitle, body: pushBody, topic: "all" },
      });
      if (res.error) {
        toast({ title: "Xəta", description: res.error.message, variant: "destructive" });
      } else {
        toast({ title: "Push bildirişi göndərildi!" });
        setPushTitle("");
        setPushBody("");
      }
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const hasFirebase = !!config.firebase_config.apiKey && !!config.firebase_config.projectId;

  return (
    <div className="space-y-6">
      {/* SMTP & Email Templates */}
      <AdminSmtpManager />

      {/* Telegram Bot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4" /> Telegram Bot İnteqrasiyası
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {botLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : botInfo?.is_configured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  Aktiv
                </Badge>
                <span className="text-sm font-medium">{botInfo.bot_name}</span>
                <span className="text-xs text-muted-foreground">Token: {botInfo.bot_token_masked}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bot qoşulub və işləyir. Yeni bot qoşmaq üçün əvvəlkini silin.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="gap-1" onClick={deleteBotToken} disabled={botSaving}>
                  <Trash2 className="h-3.5 w-3.5" /> Botu sil
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Telegram @BotFather-dən bot yaradın və token-i buraya yapışdırın. Bot avtomatik bağlanacaq.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Bot adı (ixtiyari)</Label>
                <Input
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Məsələn: Texnosatbot"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bot Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showToken ? "text" : "password"}
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="1234567890:ABCDefGhIJKlmNoPQRsTUVwxyz"
                      className="h-9 font-mono text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button onClick={saveBotToken} disabled={botSaving} size="sm" className="gap-1 bg-gradient-primary text-primary-foreground">
                {botSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                {botSaving ? "Yoxlanılır..." : "Botu qoş"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App Store Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4" /> Tətbiq linkləri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Link2 className="h-3 w-3" /> App Store URL (iOS)
            </Label>
            <Input
              value={config.app_store_url}
              onChange={(e) => setConfig({ ...config, app_store_url: e.target.value })}
              placeholder="https://apps.apple.com/app/elan24/id..."
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Google Play URL (Android)
            </Label>
            <Input
              value={config.play_store_url}
              onChange={(e) => setConfig({ ...config, play_store_url: e.target.value })}
              placeholder="https://play.google.com/store/apps/details?id=..."
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Firebase Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" /> Firebase Cloud Messaging (V1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[10px] text-muted-foreground">
            Firebase Console → Project Settings → General → Your apps → Web app konfiqurasiyasını daxil edin.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <Input value={config.firebase_config.apiKey} onChange={(e) => updateFirebase("apiKey", e.target.value)} placeholder="AIzaSy..." className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Project ID</Label>
              <Input value={config.firebase_config.projectId} onChange={(e) => updateFirebase("projectId", e.target.value)} placeholder="my-project-id" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auth Domain</Label>
              <Input value={config.firebase_config.authDomain} onChange={(e) => updateFirebase("authDomain", e.target.value)} placeholder="my-project.firebaseapp.com" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Storage Bucket</Label>
              <Input value={config.firebase_config.storageBucket} onChange={(e) => updateFirebase("storageBucket", e.target.value)} placeholder="my-project.appspot.com" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Messaging Sender ID</Label>
              <Input value={config.firebase_config.messagingSenderId} onChange={(e) => updateFirebase("messagingSenderId", e.target.value)} placeholder="123456789" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">App ID</Label>
              <Input value={config.firebase_config.appId} onChange={(e) => updateFirebase("appId", e.target.value)} placeholder="1:123:web:abc" className="h-9 font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VAPID Key (Web Push sertifikatı)</Label>
            <Input value={config.firebase_config.vapidKey} onChange={(e) => updateFirebase("vapidKey", e.target.value)} placeholder="BHk4..." className="h-9 font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="gap-2 bg-gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" /> {saving ? "Saxlanılır..." : "Tənzimləmələri saxla"}
      </Button>

      {/* Push Notification Sender */}
      {hasFirebase && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Send className="h-4 w-4" /> Push Bildirişi Göndər (FCM V1)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlıq</Label>
              <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Bildiriş başlığı" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mətn</Label>
              <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Bildiriş mətni" rows={3} />
            </div>
            <Button onClick={sendPush} disabled={sending} className="gap-2 bg-gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" /> {sending ? "Göndərilir..." : "Göndər"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminIntegrationsManager;
