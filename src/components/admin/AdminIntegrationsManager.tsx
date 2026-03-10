import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Smartphone, Bell, Send, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FirebaseConfig {
  server_key: string;
  sender_id: string;
  app_store_url: string;
  play_store_url: string;
}

const defaults: FirebaseConfig = {
  server_key: "",
  sender_id: "",
  app_store_url: "",
  play_store_url: "",
};

const AdminIntegrationsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<FirebaseConfig>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "integrations")
        .maybeSingle();
      if (data?.value) {
        setConfig({ ...defaults, ...(data.value as any) });
      }
      setLoading(false);
    };
    fetch();
  }, []);

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
    if (!config.server_key) {
      toast({ title: "Firebase Server Key tənzimlənməyib", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // Send push notification via Firebase Cloud Messaging
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${config.server_key}`,
        },
        body: JSON.stringify({
          to: "/topics/all",
          notification: {
            title: pushTitle,
            body: pushBody,
            icon: "/pwa-192.png",
          },
        }),
      });

      if (res.ok) {
        toast({ title: "Push bildirişi göndərildi!" });
        setPushTitle("");
        setPushBody("");
      } else {
        const err = await res.text();
        toast({ title: "Xəta", description: err, variant: "destructive" });
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

  return (
    <div className="space-y-6">
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
              placeholder="https://apps.apple.com/app/texnosat/id..."
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
            <Bell className="h-4 w-4" /> Firebase Push Bildirişləri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Server Key</Label>
            <Input
              value={config.server_key}
              onChange={(e) => setConfig({ ...config, server_key: e.target.value })}
              placeholder="Firebase Cloud Messaging server key"
              className="h-9 font-mono text-xs"
              type="password"
            />
            <p className="text-[10px] text-muted-foreground">
              Firebase Console → Project Settings → Cloud Messaging → Server key
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sender ID</Label>
            <Input
              value={config.sender_id}
              onChange={(e) => setConfig({ ...config, sender_id: e.target.value })}
              placeholder="Firebase sender ID"
              className="h-9 font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="gap-2 bg-gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" /> {saving ? "Saxlanılır..." : "Tənzimləmələri saxla"}
      </Button>

      {/* Push Notification Sender */}
      {config.server_key && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Send className="h-4 w-4" /> Push Bildirişi Göndər
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlıq</Label>
              <Input
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Bildiriş başlığı"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mətn</Label>
              <Textarea
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Bildiriş mətni"
                rows={3}
              />
            </div>
            <Button
              onClick={sendPush}
              disabled={sending}
              className="gap-2 bg-gradient-primary text-primary-foreground"
            >
              <Send className="h-4 w-4" /> {sending ? "Göndərilir..." : "Göndər"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Bu bildiriş "all" mövzusuna abunə olan bütün cihazlara göndəriləcək
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminIntegrationsManager;
