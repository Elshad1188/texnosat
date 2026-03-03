import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, RotateCcw, Palette } from "lucide-react";

interface ThemeColors {
  primary_h: number; primary_s: number; primary_l: number;
  secondary_h: number; secondary_s: number; secondary_l: number;
  accent_h: number; accent_s: number; accent_l: number;
  background_h: number; background_s: number; background_l: number;
  card_h: number; card_s: number; card_l: number;
  radius: number;
}

const defaultTheme: ThemeColors = {
  primary_h: 24, primary_s: 95, primary_l: 53,
  secondary_h: 220, secondary_s: 60, secondary_l: 18,
  accent_h: 24, accent_s: 80, accent_l: 95,
  background_h: 30, background_s: 25, background_l: 97,
  card_h: 0, card_s: 0, card_l: 100,
  radius: 0.75,
};

const presets: { name: string; colors: ThemeColors }[] = [
  { name: "🍊 Narıncı (Defolt)", colors: defaultTheme },
  { name: "🔵 Mavi", colors: { ...defaultTheme, primary_h: 217, primary_s: 91, primary_l: 60, accent_h: 217, accent_s: 80, accent_l: 95 } },
  { name: "🟢 Yaşıl", colors: { ...defaultTheme, primary_h: 142, primary_s: 76, primary_l: 36, accent_h: 142, accent_s: 70, accent_l: 93 } },
  { name: "🟣 Bənövşəyi", colors: { ...defaultTheme, primary_h: 262, primary_s: 83, primary_l: 58, accent_h: 262, accent_s: 70, accent_l: 94, secondary_h: 262, secondary_s: 50, secondary_l: 20 } },
  { name: "🔴 Qırmızı", colors: { ...defaultTheme, primary_h: 0, primary_s: 84, primary_l: 60, accent_h: 0, accent_s: 70, accent_l: 95, secondary_h: 0, secondary_s: 40, secondary_l: 18 } },
  { name: "🌑 Tünd", colors: { ...defaultTheme, background_h: 220, background_s: 20, background_l: 10, card_h: 220, card_s: 15, card_l: 15, secondary_h: 220, secondary_s: 30, secondary_l: 8 } },
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return `#${[f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

interface ColorGroupProps {
  label: string;
  h: number; s: number; l: number;
  onChange: (h: number, s: number, l: number) => void;
}

const ColorGroup = ({ label, h, s, l, onChange }: ColorGroupProps) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg border border-border shadow-sm" style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }} />
        <Input
          type="color"
          value={hslToHex(h, s, l)}
          onChange={(e) => { const [nh, ns, nl] = hexToHsl(e.target.value); onChange(nh, ns, nl); }}
          className="h-8 w-8 cursor-pointer border-0 p-0 bg-transparent"
        />
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-6">H</span>
        <Slider value={[h]} onValueChange={([v]) => onChange(v, s, l)} max={360} step={1} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{h}°</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-6">S</span>
        <Slider value={[s]} onValueChange={([v]) => onChange(h, v, l)} max={100} step={1} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{s}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-6">L</span>
        <Slider value={[l]} onValueChange={([v]) => onChange(h, s, v)} max={100} step={1} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{l}%</span>
      </div>
    </div>
  </div>
);

const AdminThemeManager = () => {
  const { theme, refreshTheme } = useTheme();
  const { toast } = useToast();
  const [colors, setColors] = useState<ThemeColors>(theme);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setColors(theme); }, [theme]);

  // Live preview
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `${colors.primary_h} ${colors.primary_s}% ${colors.primary_l}%`);
    root.style.setProperty("--ring", `${colors.primary_h} ${colors.primary_s}% ${colors.primary_l}%`);
    root.style.setProperty("--secondary", `${colors.secondary_h} ${colors.secondary_s}% ${colors.secondary_l}%`);
    root.style.setProperty("--accent", `${colors.accent_h} ${colors.accent_s}% ${colors.accent_l}%`);
    root.style.setProperty("--accent-foreground", `${colors.accent_h} ${colors.primary_s}% 40%`);
    root.style.setProperty("--background", `${colors.background_h} ${colors.background_s}% ${colors.background_l}%`);
    root.style.setProperty("--card", `${colors.card_h} ${colors.card_s}% ${colors.card_l}%`);
    root.style.setProperty("--popover", `${colors.card_h} ${colors.card_s}% ${colors.card_l}%`);
    root.style.setProperty("--muted", `${colors.background_h} 15% 92%`);
    root.style.setProperty("--border", `${colors.background_h} 15% 88%`);
    root.style.setProperty("--input", `${colors.background_h} 15% 88%`);
    root.style.setProperty("--radius", `${colors.radius}rem`);
    root.style.setProperty("--gradient-hero", `linear-gradient(135deg, hsl(${colors.secondary_h}, ${colors.secondary_s}%, ${colors.secondary_l}%) 0%, hsl(${colors.secondary_h}, ${colors.secondary_s - 10}%, ${colors.secondary_l + 10}%) 50%, hsl(${colors.primary_h}, 70%, 40%) 100%)`);
    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${colors.primary_h}, ${colors.primary_s}%, ${colors.primary_l}%) 0%, hsl(${colors.primary_h + 8}, ${colors.primary_s}%, ${colors.primary_l + 2}%) 100%)`);
  }, [colors]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: colors as unknown as import("@/integrations/supabase/types").Json, updated_at: new Date().toISOString() })
      .eq("key", "theme");
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      await refreshTheme();
      toast({ title: "Tema yadda saxlanıldı ✓" });
    }
    setSaving(false);
  };

  const reset = () => {
    setColors(defaultTheme);
  };

  const applyPreset = (preset: ThemeColors) => {
    setColors(preset);
  };

  const updateColor = (prefix: string, h: number, s: number, l: number) => {
    setColors(prev => ({ ...prev, [`${prefix}_h`]: h, [`${prefix}_s`]: s, [`${prefix}_l`]: l }));
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Hazır Temalar</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.colors)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm font-medium hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex gap-1">
                <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: `hsl(${p.colors.primary_h}, ${p.colors.primary_s}%, ${p.colors.primary_l}%)` }} />
                <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: `hsl(${p.colors.secondary_h}, ${p.colors.secondary_s}%, ${p.colors.secondary_l}%)` }} />
              </div>
              <span className="truncate text-xs">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color editors */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorGroup label="Əsas rəng (Primary)" h={colors.primary_h} s={colors.primary_s} l={colors.primary_l} onChange={(h, s, l) => updateColor("primary", h, s, l)} />
        <ColorGroup label="İkinci rəng (Secondary)" h={colors.secondary_h} s={colors.secondary_s} l={colors.secondary_l} onChange={(h, s, l) => updateColor("secondary", h, s, l)} />
        <ColorGroup label="Vurğu rəngi (Accent)" h={colors.accent_h} s={colors.accent_s} l={colors.accent_l} onChange={(h, s, l) => updateColor("accent", h, s, l)} />
        <ColorGroup label="Arxa fon (Background)" h={colors.background_h} s={colors.background_s} l={colors.background_l} onChange={(h, s, l) => updateColor("background", h, s, l)} />
        <ColorGroup label="Kart rəngi (Card)" h={colors.card_h} s={colors.card_s} l={colors.card_l} onChange={(h, s, l) => updateColor("card", h, s, l)} />
      </div>

      {/* Border radius */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Label className="text-sm font-semibold">Künc radiusu</Label>
        <div className="flex items-center gap-3">
          <Slider value={[colors.radius]} onValueChange={([v]) => setColors(prev => ({ ...prev, radius: v }))} min={0} max={2} step={0.125} className="flex-1" />
          <span className="text-sm text-muted-foreground w-14 text-right">{colors.radius}rem</span>
        </div>
        <div className="flex gap-2">
          {[0, 0.375, 0.75, 1, 1.5].map((r) => (
            <button key={r} onClick={() => setColors(prev => ({ ...prev, radius: r }))} className="h-10 w-10 border border-border bg-primary/20 transition-all hover:bg-primary/30" style={{ borderRadius: `${r}rem` }} />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Label className="text-sm font-semibold">Önizləmə</Label>
        <div className="flex flex-wrap gap-2">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex gap-2">
          <div className="rounded-lg bg-primary p-3 text-primary-foreground text-xs font-medium">Primary</div>
          <div className="rounded-lg bg-secondary p-3 text-secondary-foreground text-xs font-medium">Secondary</div>
          <div className="rounded-lg bg-accent p-3 text-accent-foreground text-xs font-medium">Accent</div>
          <div className="rounded-lg bg-muted p-3 text-muted-foreground text-xs font-medium">Muted</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={save} disabled={saving} className="flex-1 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Yadda saxla
        </Button>
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Sıfırla
        </Button>
      </div>
    </div>
  );
};

export default AdminThemeManager;
