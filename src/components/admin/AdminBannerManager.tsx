import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Image, Loader2, Upload, Link as LinkIcon, Video } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  video_url: string | null;
  link: string | null;
  position: string;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const positions = [
  { value: "home_top", label: "Ana səhifə yuxarı" },
  { value: "home_middle", label: "Ana səhifə orta" },
  { value: "products_top", label: "Elanlar yuxarı" },
  { value: "sidebar", label: "Yan panel" },
];

const AdminBannerManager = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", image_url: "", video_url: "", link: "", position: "home_top", starts_at: "", ends_at: "" });

  const fetchBanners = async () => {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setBanners((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) {
      toast({ title: "Yükləmə xətası", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const addBanner = async () => {
    if (!form.title || !form.image_url) {
      toast({ title: "Başlıq və şəkil tələb olunur", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("banners").insert({
      title: form.title,
      image_url: form.image_url,
      video_url: form.video_url || null,
      link: form.link || null,
      position: form.position,
      sort_order: banners.length,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    });
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Banner əlavə edildi" });
    setForm({ title: "", image_url: "", link: "", position: "home_top", starts_at: "", ends_at: "" });
    setAdding(false);
    fetchBanners();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("banners").update({ is_active: !current }).eq("id", id);
    setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b));
  };

  const deleteBanner = async (id: string) => {
    await supabase.from("banners").delete().eq("id", id);
    setBanners(prev => prev.filter(b => b.id !== id));
    toast({ title: "Banner silindi" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Bannerlər ({banners.length})</h3>
        <Button size="sm" onClick={() => setAdding(!adding)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni banner
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlıq</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Banner başlığı" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mövqe</Label>
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Image source toggle */}
          <div className="space-y-2">
            <Label className="text-xs">Şəkil mənbəyi</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={uploadMode === "file" ? "default" : "outline"}
                onClick={() => setUploadMode("file")}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Fayl yüklə
              </Button>
              <Button
                type="button"
                size="sm"
                variant={uploadMode === "url" ? "default" : "outline"}
                onClick={() => setUploadMode("url")}
                className="gap-1.5"
              >
                <LinkIcon className="h-3.5 w-3.5" /> URL
              </Button>
            </div>

            {uploadMode === "file" ? (
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="gap-1.5 w-full"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Yüklənir..." : form.image_url ? "Başqa şəkil seç" : "Şəkil seç"}
                </Button>
              </div>
            ) : (
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="h-9" />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Link (istəyə bağlı)</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/products?category=..." className="h-9" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlanğıc vaxtı (istəyə bağlı)</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bitmə vaxtı (istəyə bağlı)</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="h-9" />
            </div>
          </div>

          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="h-24 w-full rounded-lg object-cover" />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={addBanner}>Əlavə et</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Ləğv et</Button>
          </div>
        </div>
      )}

      {banners.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Image className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Hələ banner yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">{b.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {positions.find(p => p.value === b.position)?.label || b.position}
                  {b.link && ` · ${b.link}`}
                </p>
              </div>
              <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b.id, b.is_active)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBanner(b.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBannerManager;
