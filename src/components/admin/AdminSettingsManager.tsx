import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Globe, Mail, Phone, MapPin, Image, Upload } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
  premium_price: number;
  vip_price: number;
  urgent_price: number;
  store_premium_price: number;
  use_site_logo_as_watermark: boolean;
  homepage_premium_count: number;
  homepage_urgent_count: number;
  homepage_new_count: number;
  homepage_auto_load: boolean;
}

const defaults: SiteSettings = {
  site_name: "Elan24",
  site_description: "Azərbaycanın ən böyük pulsuz elan platforması.",
  contact_email: "info@elan24.az",
  contact_phone: "+994 50 123 45 67",
  contact_address: "Bakı, Azərbaycan",
  meta_title: "Elan24 - Pulsuz Elan Platforması",
  meta_description: "Azərbaycanın ən böyük pulsuz elan platforması. Avtomobil, daşınmaz əmlak, elektronika və daha çox.",
  listing_requires_approval: false,
  max_images_per_listing: 10,
  footer_text: "© 2026 Elan24. Bütün hüquqlar qorunur.",
  watermark_enabled: false,
  watermark_url: "",
  watermark_position: "bottom-right",
  watermark_opacity: 50,
  premium_price: 5,
  vip_price: 10,
  urgent_price: 3,
  store_premium_price: 20,
  use_site_logo_as_watermark: false,
};

const watermarkPositions = [
  { value: "top-left", label: "Yuxarı sol" },
  { value: "top-right", label: "Yuxarı sağ" },
  { value: "bottom-left", label: "Aşağı sol" },
  { value: "bottom-right", label: "Aşağı sağ" },
  { value: "center", label: "Mərkəz" },
];

const DEFAULT_THEME = {
  primary_h: 24, primary_s: 95, primary_l: 53,
  secondary_h: 220, secondary_s: 60, secondary_l: 18,
  accent_h: 24, accent_s: 80, accent_l: 95,
  background_h: 30, background_s: 25, background_l: 97,
  card_h: 0, card_s: 0, card_l: 100,
  radius: 0.75,
  logo_text_main: "Elan",
  logo_text_accent: "24",
  logo_icon: "E",
  logo_color: "",
};

const AdminSettingsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshTheme } = useTheme();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingWm, setUploadingWm] = useState(false);
  const [themeSettings, setThemeSettings] = useState<any>(DEFAULT_THEME);
  const wmFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "general").maybeSingle();
      if (data?.value) {
        setSettings({ ...defaults, ...(data.value as any) });
      }
      
      const { data: themeData } = await supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle();
      const themeVal = themeData?.value as any;
      if (themeVal) {
        setThemeSettings({ ...DEFAULT_THEME, ...themeVal });
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

    if (themeSettings) {
      const { data: existingTheme } = await supabase.from("site_settings").select("id").eq("key", "theme").maybeSingle();
      if (existingTheme) {
        await supabase.from("site_settings").update({ value: themeSettings, updated_by: user?.id }).eq("key", "theme");
      } else {
        await supabase.from("site_settings").insert({ key: "theme", value: themeSettings, updated_by: user?.id });
      }
    }
    
    await refreshTheme();
    queryClient.invalidateQueries({ queryKey: ["watermark-settings"] });
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
          <div className="space-y-1.5">
            <Label className="text-xs">Maks. şəkil sayı</Label>
            <Input 
              type="number" 
              value={settings.max_images_per_listing} 
              onChange={(e) => setSettings({ ...settings, max_images_per_listing: Number(e.target.value) })} 
              className="h-9" 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sayt açıqlaması</Label>
          <Textarea value={settings.site_description} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} rows={2} />
        </div>
      </div>

      {/* Brand/Logo Text */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Image className="h-4 w-4" /> Loqo Mətni</h3>
        <p className="text-xs text-muted-foreground">Saytın yuxarı sol küncündə görünən mətni tənzimləyin. (Məsələn: Texno + sat)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Loqo mətni (Əsas)</Label>
            <Input 
              value={themeSettings?.logo_text_main || ""} 
              onChange={(e) => setThemeSettings({ ...themeSettings, logo_text_main: e.target.value })} 
              className="h-9" 
              placeholder="Texno"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Loqo mətni (Vurğu)</Label>
            <Input 
              value={themeSettings?.logo_text_accent || ""} 
              onChange={(e) => setThemeSettings({ ...themeSettings, logo_text_accent: e.target.value })} 
              className="h-9" 
              placeholder="sat"
            />
          </div>
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

      {/* Ad Prices */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">💰 Reklam Qiymətləri (AZN)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Premium (7 gün)</Label>
            <Input
              type="number"
              value={settings.premium_price}
              onChange={(e) => setSettings({ ...settings, premium_price: Number(e.target.value) })}
              className="h-9"
              min={0}
              step={0.1}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VIP (14 gün)</Label>
            <Input
              type="number"
              value={settings.vip_price}
              onChange={(e) => setSettings({ ...settings, vip_price: Number(e.target.value) })}
              className="h-9"
              min={0}
              step={0.1}
            />
          </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Təcili (7 gün)</Label>
              <Input
                type="number"
                value={settings.urgent_price}
                onChange={(e) => setSettings({ ...settings, urgent_price: Number(e.target.value) })}
                className="h-9"
                min={0}
                step={0.1}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-border/50">
            <div className="space-y-1.5 max-w-[200px]">
              <Label className="text-xs">Mağaza Premium (30 gün)</Label>
              <Input
                type="number"
                value={settings.store_premium_price}
                onChange={(e) => setSettings({ ...settings, store_premium_price: Number(e.target.value) })}
                className="h-9"
                min={0}
                step={0.1}
              />
            </div>
          </div>
      </div>

      {/* Watermark settings */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Image className="h-4 w-4" /> Watermark (Logo)</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Şəkillərdə watermark göstər</p>
            <p className="text-xs text-muted-foreground">Aktiv edildikdə elan şəkillərinin üstündə logo göstəriləcək</p>
          </div>
          <Switch
            checked={settings.watermark_enabled}
            onCheckedChange={(v) => setSettings({ ...settings, watermark_enabled: v })}
          />
        </div>
        {settings.watermark_enabled && (
          <div className="flex items-center justify-between py-2 border-t border-border/50">
            <div>
              <p className="text-sm text-foreground">Sayt loqosunu watermark kimi istifadə et</p>
              <p className="text-xs text-muted-foreground">Aktiv edildikdə yuxarıdakı loqo avtomatik istifadə olunacaq</p>
            </div>
            <Switch
              checked={settings.use_site_logo_as_watermark}
              onCheckedChange={(v) => setSettings({ ...settings, use_site_logo_as_watermark: v })}
            />
          </div>
        )}
        {settings.watermark_enabled && !settings.use_site_logo_as_watermark && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo (URL və ya fayl yüklə)</Label>
              <div className="flex gap-2">
                <Input
                  value={settings.watermark_url}
                  onChange={(e) => setSettings({ ...settings, watermark_url: e.target.value })}
                  className="h-9 flex-1"
                  placeholder="https://... və ya /logo.png"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={uploadingWm}
                  onClick={() => wmFileRef.current?.click()}
                >
                  {uploadingWm ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Yüklə
                </Button>
                <input
                  ref={wmFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingWm(true);
                    try {
                      const fileName = `watermark/${Date.now()}-${file.name}`;
                      const { error } = await supabase.storage.from("banners").upload(fileName, file);
                      if (error) throw error;
                      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(fileName);
                      setSettings(prev => ({ ...prev, watermark_url: urlData.publicUrl }));
                      toast({ title: "Logo yükləndi" });
                    } catch (err: any) {
                      toast({ title: "Yükləmə xətası", description: err.message, variant: "destructive" });
                    } finally {
                      setUploadingWm(false);
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Mövqe</Label>
                <Select value={settings.watermark_position} onValueChange={(v) => setSettings({ ...settings, watermark_position: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {watermarkPositions.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Şəffaflıq ({settings.watermark_opacity}%)</Label>
                <Input
                  type="range"
                  min={10}
                  max={100}
                  value={settings.watermark_opacity}
                  onChange={(e) => setSettings({ ...settings, watermark_opacity: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>
            {settings.watermark_url && (
              <div className="relative h-32 w-48 rounded-lg border border-border bg-muted overflow-hidden">
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Önizləmə</div>
                <img
                  src={settings.watermark_url}
                  alt="Watermark"
                  className={`absolute ${
                    settings.watermark_position === "top-left" ? "top-2 left-2" :
                    settings.watermark_position === "top-right" ? "top-2 right-2" :
                    settings.watermark_position === "bottom-left" ? "bottom-2 left-2" :
                    settings.watermark_position === "bottom-right" ? "bottom-2 right-2" :
                    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  } h-8 w-auto`}
                  style={{ opacity: settings.watermark_opacity / 100 }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="gap-2 bg-gradient-primary text-primary-foreground">
        <Save className="h-4 w-4" /> {saving ? "Saxlanılır..." : "Dəyişiklikləri saxla"}
      </Button>
    </div>
  );
};

export default AdminSettingsManager;
