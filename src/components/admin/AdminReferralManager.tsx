import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Gift, Users } from "lucide-react";

interface ReferralSettings {
  referral_enabled: boolean;
  referrer_bonus: number;
  referred_bonus: number;
}

const defaults: ReferralSettings = {
  referral_enabled: true,
  referrer_bonus: 2,
  referred_bonus: 1,
};

const AdminReferralManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReferralSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, totalBonus: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [settingsRes, referralsRes] = await Promise.all([
        supabase.from("site_settings").select("*").eq("key", "referral").maybeSingle(),
        supabase.from("referrals").select("id, bonus_amount", { count: "exact" }),
      ]);

      if (settingsRes.data?.value) {
        setSettings({ ...defaults, ...(settingsRes.data.value as any) });
      }

      const referrals = referralsRes.data || [];
      setStats({
        total: referralsRes.count || 0,
        totalBonus: referrals.reduce((s, r: any) => s + Number(r.bonus_amount || 0), 0),
      });

      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("site_settings").select("id").eq("key", "referral").maybeSingle();

    if (existing) {
      await supabase.from("site_settings")
        .update({ value: settings as any, updated_by: user?.id })
        .eq("key", "referral");
    } else {
      await supabase.from("site_settings")
        .insert({ key: "referral", value: settings as any, updated_by: user?.id });
    }

    toast({ title: "Referal tənzimləmələri saxlanıldı" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Gift className="h-4 w-4" /> Referal sistemi
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">Ümumi referal</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{stats.totalBonus.toFixed(2)} ₼</p>
          <p className="text-[11px] text-muted-foreground">Verilən bonus</p>
        </Card>
      </div>

      {/* Toggle */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Referal sistemi</p>
              <p className="text-xs text-muted-foreground">
                {settings.referral_enabled ? "Aktiv — yeni istifadəçilər referal kodu istifadə edə bilər" : "Deaktiv — referal kodları qəbul edilmir"}
              </p>
            </div>
            <Switch
              checked={settings.referral_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, referral_enabled: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Dəvət edənin bonusu (₼)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={settings.referrer_bonus}
                onChange={(e) => setSettings({ ...settings, referrer_bonus: Number(e.target.value) })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dəvət olunanın bonusu (₼)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={settings.referred_bonus}
                onChange={(e) => setSettings({ ...settings, referred_bonus: Number(e.target.value) })}
                className="h-9"
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} size="sm" className="gap-2 bg-gradient-primary text-primary-foreground">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saxlanılır..." : "Saxla"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralManager;
