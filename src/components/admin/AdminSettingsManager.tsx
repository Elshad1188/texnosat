import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Globe, Mail, Phone, MapPin } from "lucide-react";

interface SiteSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  meta_title: string;
  meta_description: string;
  listing_requires_approval: boolean;
  max_images_per_listing: number;
  footer_text: string;
  watermark_enabled: boolean;
  watermark_url: string;
  watermark_position: string;
  watermark_opacity: number;
}

const defaults: SiteSettings = {
  site_name: "Texnosat",
  site_description: "Azərbaycanın ən etibarlı elektronika al-sat platforması.",
  contact_email: "info@texnosat.az",
  contact_phone: "+994 50 123 45 67",
  contact_address: "Bakı, Azərbaycan",
  meta_title: "Texnosat - Elektronika Al-Sat",
  meta_description: "Azərbaycanın ən etibarlı elektronika al-sat platforması. Telefon, noutbuk və digər texnika.",
  listing_requires_approval: false,
  max_images_per_listing: 10,
  footer_text: "© 2026 Texnosat. Bütün hüquqlar qorunur.",
  watermark_enabled: false,
  watermark_url: "",
  watermark_position: "bottom-right",
  watermark_opacity: 50,
};

const watermarkPositions = [
  { value: "top-left", label: "Yuxarı sol" },
  { value: "top-right", label: "Yuxarı sağ" },
  { value: "bottom-left", label: "Aşağı sol" },
  { value: "bottom-right", label: "Aşağı sağ" },
  { value: "center", label: "Mərkəz" },
];

const AdminSettingsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "general").maybeSingle();
      if (data?.value) {
        setSettings({ ...defaults, ...(data.value as any) });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "general").maybeSingle();
    
    if (existing) {
      await supabase.from("site_settings").update({ value: settings as any, updated_by: user?.id }).eq("key", "general");
    } else {
      await supabase.from("site_settings").insert({ key: "general", value: settings as any, updated_by: user?.id });
    }
    
    toast({ title: "Tənzimləmələr saxlanıldı" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* General */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4" /> Ümumi</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Sayt adı</Label>
            <Input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Footer mətni</Label>
            <Input value={settings.footer_text} onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })} className="h-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sayt açıqlaması</Label>
          <Textarea value={settings.site_description} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} rows={2} />
        </div>
      </div>

      {/* SEO */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">🔍 SEO</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Meta başlıq</Label>
          <Input value={settings.meta_title} onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })} className="h-9" />
          <p className="text-[10px] text-muted-foreground">{settings.meta_title.length}/60 simvol</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Meta açıqlama</Label>
          <Textarea value={settings.meta_description} onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })} rows={2} />
          <p className="text-[10px] text-muted-foreground">{settings.meta_description.length}/160 simvol</p>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Əlaqə</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">E-poçt</Label>
            <Input value={settings.contact_email} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Telefon</Label>
            <Input value={settings.contact_phone} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ünvan</Label>
            <Input value={settings.contact_address} onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })} className="h-9" />
          </div>
        </div>
      </div>

      {/* Listing settings */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">⚙️ Elan tənzimləmələri</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Elanlar admin təsdiqi tələb etsin</p>
            <p className="text-xs text-muted-foreground">Aktiv edildikdə yeni elanlar gözləmə statusunda olacaq</p>
          </div>
          <Switch
            checked={settings.listing_requires_approval}
            onCheckedChange={(v) => setSettings({ ...settings, listing_requires_approval: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hər elana maksimum şəkil sayı</Label>
          <Input
            type="number"
            value={settings.max_images_per_listing}
            onChange={(e) => setSettings({ ...settings, max_images_per_listing: Number(e.target.value) })}
            className="h-9 w-24"
            min={1}
            max={20}
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2 bg-gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" /> {saving ? "Saxlanılır..." : "Dəyişiklikləri saxla"}
      </Button>
    </div>
  );
};

export default AdminSettingsManager;
