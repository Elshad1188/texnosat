import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShoppingBag, Store, Flag, MessageSquare, Star, Heart, UserPlus, Gift, Bell, Smartphone } from "lucide-react";

interface PerType { inapp: boolean; push: boolean; }
type NotifSettings = Record<string, PerType>;

const categories = [
  { key: "new_listing", label: "Yeni elan", desc: "Yeni elan yaradıldıqda", icon: ShoppingBag },
  { key: "new_store", label: "Yeni mağaza", desc: "Yeni mağaza açıldıqda", icon: Store },
  { key: "new_report", label: "Yeni şikayət", desc: "Şikayət göndərildikdə", icon: Flag },
  { key: "new_review", label: "Yeni rəy", desc: "Rəy yazıldıqda", icon: Star },
  { key: "new_user", label: "Yeni istifadəçi", desc: "Qeydiyyat olduqda", icon: UserPlus },
  { key: "new_message", label: "Yeni mesaj", desc: "Mesaj göndərildikdə", icon: MessageSquare },
  { key: "message", label: "Mesaj bildirişi (alıcı)", desc: "İstifadəçiyə yeni mesaj çatdıqda", icon: MessageSquare },
  { key: "new_favorite", label: "Yeni seçilmiş", desc: "Elan seçilmişlərə əlavə edildikdə", icon: Heart },
  { key: "spin_win", label: "Hədiyyə çarxı", desc: "Yeni hədiyyə qazanıldıqda", icon: Gift },
  { key: "saved_search", label: "Yadda saxlanılmış axtarış", desc: "Axtarışa uyğun yeni elan", icon: Bell },
  { key: "stock_alert", label: "Stok xəbərdarlığı", desc: "Mağazada stok azaldıqda", icon: Bell },
  { key: "info", label: "Ümumi bildiriş", desc: "Digər info-tipli bildirişlər", icon: Bell },
];

const defaults: NotifSettings = Object.fromEntries(
  categories.map((c) => [c.key, { inapp: true, push: true }])
);

const normalize = (raw: any): NotifSettings => {
  const out: NotifSettings = { ...defaults };
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "object" && v !== null) {
      out[k] = {
        inapp: (v as any).inapp !== false,
        push: (v as any).push !== false,
      };
    } else {
      // legacy: 'true'/'false' or boolean → inapp toggle, push defaults true
      const inapp = v !== false && v !== "false";
      out[k] = { inapp, push: true };
    }
  }
  return out;
};

const AdminNotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotifSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "admin_notifications")
        .maybeSingle();
      setSettings(normalize(data?.value));
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const value = settings;

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "admin_notifications")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: value as any, updated_by: user?.id })
        .eq("key", "admin_notifications");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "admin_notifications", value: value as any, updated_by: user?.id });
    }

    toast({ title: "Bildiriş tənzimləmələri saxlanıldı" });
    setSaving(false);
  };

  const toggle = (key: string, field: "inapp" | "push") => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { inapp: true, push: true }), [field]: !(prev[key]?.[field] ?? true) },
    }));
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Bildiriş tənzimləmələri</h3>
        <p className="text-xs text-muted-foreground">
          Hər kateqoriya üçün <span className="font-medium">Daxili bildiriş</span> (saytda zəng/badge) və <span className="font-medium">Push bildirişi</span> (telefona) ayrıca aç/söndür.
          Tətbiq açıq və görünən olduqda push avtomatik göndərilmir.
        </p>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const cur = settings[cat.key] || { inapp: true, push: true };
          return (
            <div
              key={cat.key}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-card sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 ml-12 sm:ml-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Daxili</span>
                  <Switch checked={cur.inapp} onCheckedChange={() => toggle(cat.key, "inapp")} />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Push</span>
                  <Switch checked={cur.push} onCheckedChange={() => toggle(cat.key, "push")} />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving} className="gap-2 bg-gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" /> {saving ? "Saxlanılır..." : "Dəyişiklikləri saxla"}
      </Button>
    </div>
  );
};

export default AdminNotificationSettings;
