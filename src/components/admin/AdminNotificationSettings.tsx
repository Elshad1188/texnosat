import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShoppingBag, Store, Flag, MessageSquare, Star, Heart, UserPlus, Gift } from "lucide-react";

interface NotifSettings {
  new_listing: boolean;
  new_store: boolean;
  new_report: boolean;
  new_review: boolean;
  new_user: boolean;
  new_message: boolean;
  new_favorite: boolean;
  spin_win: boolean;
}

const defaults: NotifSettings = {
  new_listing: true,
  new_store: true,
  new_report: true,
  new_review: true,
  new_user: true,
  new_message: true,
  new_favorite: true,
  spin_win: true,
};

const categories = [
  { key: "new_listing" as const, label: "Yeni elan", desc: "Yeni elan yaradıldıqda", icon: ShoppingBag },
  { key: "new_store" as const, label: "Yeni mağaza", desc: "Yeni mağaza açıldıqda", icon: Store },
  { key: "new_report" as const, label: "Yeni şikayət", desc: "Şikayət göndərildikdə", icon: Flag },
  { key: "new_review" as const, label: "Yeni rəy", desc: "Rəy yazıldıqda", icon: Star },
  { key: "new_user" as const, label: "Yeni istifadəçi", desc: "Qeydiyyat olduqda", icon: UserPlus },
  { key: "new_message" as const, label: "Yeni mesaj", desc: "Mesaj göndərildikdə", icon: MessageSquare },
  { key: "new_favorite" as const, label: "Yeni seçilmiş", desc: "Elan seçilmişlərə əlavə edildikdə", icon: Heart },
  { key: "spin_win" as const, label: "Hədiyyə çarxı", desc: "Yeni hədiyyə qazanıldıqda", icon: Gift },
];

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
      if (data?.value) {
        const val = data.value as Record<string, any>;
        setSettings({
          ...defaults,
          ...Object.fromEntries(
            Object.entries(val).map(([k, v]) => [k, v !== "false" && v !== false])
          ),
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    // Convert booleans to strings for DB storage (trigger reads string)
    const value = Object.fromEntries(
      Object.entries(settings).map(([k, v]) => [k, String(v)])
    );

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

  const toggle = (key: keyof NotifSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <h3 className="text-sm font-semibold text-foreground">Admin bildiriş tənzimləmələri</h3>
        <p className="text-xs text-muted-foreground">
          Hər bir fəaliyyət növü üçün admin bildirişlərini yandırın və ya söndürün
        </p>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </div>
              <Switch
                checked={settings[cat.key]}
                onCheckedChange={() => toggle(cat.key)}
              />
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
