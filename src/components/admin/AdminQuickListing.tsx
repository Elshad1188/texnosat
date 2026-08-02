import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, X, Zap } from "lucide-react";

const sanitizeName = (name: string) => {
  const dot = name.lastIndexOf(".");
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "file";
  const ext = (dot > 0 ? name.slice(dot + 1) : "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return ext ? `${base}.${ext}` : base;
};

const AdminQuickListing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("Bakı");
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState<number>(50);
  const [used, setUsed] = useState<number>(0);
  const [limitLoading, setLimitLoading] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);

  const monthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  };

  const loadUsage = async () => {
    setLimitLoading(true);
    const [{ data: settings }, { count }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("custom_fields->>is_guest", "true")
        .gte("created_at", monthStart()),
    ]);
    const val = (settings?.value as any) || {};
    setLimit(Number(val.guest_listing_monthly_limit ?? 50));
    setUsed(count ?? 0);
    setLimitLoading(false);
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const saveLimit = async (next: number) => {
    setSavingLimit(true);
    try {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      const merged = { ...((data?.value as any) || {}), guest_listing_monthly_limit: next };
      const { error } = await supabase.from("site_settings").update({ value: merged }).eq("key", "general");
      if (error) throw error;
      setLimit(next);
      toast({ title: "Aylıq limit yeniləndi" });
    } catch (e: any) {
      toast({ title: "Xəta", description: e?.message, variant: "destructive" });
    } finally {
      setSavingLimit(false);
    }
  };

  const remaining = Math.max(0, limit - used);
  const limitReached = !limitLoading && remaining <= 0;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, 10));
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !phone.trim()) {
      toast({ title: "Ad və nömrə mütləqdir", variant: "destructive" });
      return;
    }
    if (limitReached) {
      toast({
        title: "Aylıq limit bitdi",
        description: `Bu ay ${limit} qeydiyyatsız elan yaradılıb. Növbəti ay yenilənəcək.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const urls: string[] = [];
      for (const file of images) {
        const path = `${user.id}/guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file);
        if (upErr) throw upErr;
        urls.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
      }

      const priceNum = Number(String(price).replace(",", ".")) || 0;

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: priceNum,
        currency: "AZN",
        category: "Digər",
        condition: "used",
        location: location.trim() || "Bakı",
        image_urls: urls.length ? urls : null,
        is_active: true,
        status: "approved",
        deal_type: "sale",
        is_buyable: false,
        custom_fields: {
          is_guest: true,
          contact_phone: phone.trim(),
          price_negotiable: priceNum <= 0,
        },
      } as any);
      if (error) throw error;

      toast({ title: "Qeydiyyatsız elan yaradıldı" });
      setTitle("");
      setPhone("");
      setDescription("");
      setPrice("");
      setImages([]);
    } catch (e: any) {
      toast({ title: "Xəta", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Sürətli (qeydiyyatsız) elan</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Yalnız ad, nömrə, şəkil və məlumat kifayətdir. Bu elanlar qeydiyyatsız sayılır — istifadəçilər onlarla mesajlaşa bilməz, yalnız zəng edə bilər.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Ad (başlıq) *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: 3 otaqlı mənzil, Yasamal" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Əlaqə nömrəsi *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994 50 123 45 67" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Qiymət (boş = razılaşma yolu ilə)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ünvan / şəhər</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bakı" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Haqqında məlumat</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Elan haqqında qısa məlumat..." />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Şəkillər ({images.length}/10)</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((f, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">Əlavə et</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
        </div>
      </div>

      <Button onClick={submit} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Elanı yarat
      </Button>
    </div>
  );
};

export default AdminQuickListing;
