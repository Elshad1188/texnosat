import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Store, ImagePlus, Loader2, Crown, Upload, CheckCircle, Image } from "lucide-react";

const CreateStore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingStore, setExistingStore] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", phone: "", working_hours: "",
  });

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ["regions-parent"],
    queryFn: async () => {
      const { data } = await supabase.from("regions").select("*").is("parent_id", null).eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const checkStore = async () => {
      const { data } = await supabase.from("stores").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setExistingStore(data);
        setForm({
          name: data.name || "", description: data.description || "",
          address: data.address || "", city: data.city || "",
          phone: data.phone || "", working_hours: data.working_hours || "",
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
        if (data.cover_url) setCoverPreview(data.cover_url);
      }
      setChecking(false);
    };
    checkStore();
  }, [user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === "logo") { setLogoFile(file); setLogoPreview(ev.target?.result as string); }
      else { setCoverFile(file); setCoverPreview(ev.target?.result as string); }
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, prefix: string, bucket: string) => {
    const fileName = `${user!.id}/${Date.now()}-${prefix}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast({ title: "Mağaza adını daxil edin", variant: "destructive" }); return; }
    setLoading(true);
    try {
      let logoUrl = existingStore?.logo_url || null;
      let coverUrl = existingStore?.cover_url || null;
      if (logoFile) logoUrl = await uploadFile(logoFile, "logo", "store-logos");
      if (coverFile) coverUrl = await uploadFile(coverFile, "cover", "store-logos");

      const payload = { ...form, logo_url: logoUrl, cover_url: coverUrl };

      if (existingStore) {
        const { error } = await supabase.from("stores").update(payload).eq("id", existingStore.id);
        if (error) throw error;
        toast({ title: "Mağaza yeniləndi!" });
      } else {
        const { error } = await supabase.from("stores").insert({ user_id: user!.id, ...payload });
        if (error) throw error;
        toast({ title: "Mağaza uğurla yaradıldı!" });
      }
      navigate("/");
    } catch (err: any) {
      toast({ title: "Xəta baş verdi", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (!user || checking) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {existingStore ? "Mağazanı redaktə et" : "Mağaza aç"}
            </h1>
            <p className="text-sm text-muted-foreground">Öz mağazanızı yaradın və elanlarınızı idarə edin</p>
          </div>
        </div>

        {/* Freemium info */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Mağaza imkanları</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
              <div><p className="text-sm font-medium text-foreground">Pulsuz</p><p className="text-xs text-muted-foreground">Mağaza profili, elan yerləşdirmə</p></div>
            </div>
            <div className="flex items-start gap-2">
              <Crown className="mt-0.5 h-4 w-4 text-primary" />
              <div><p className="text-sm font-medium text-foreground">Premium</p><p className="text-xs text-muted-foreground">Üst sıralarda göstərilmə, toplu elan, badge</p></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Cover Image */}
          <div>
            <Label>Cover şəkil</Label>
            <div className="mt-2">
              {coverPreview ? (
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
                  <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                  <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => coverInputRef.current?.click()}>
                    Dəyişdir
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => coverInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <Image className="h-8 w-8" /><span className="mt-2 text-sm">Cover şəkil yüklə</span>
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "cover")} />
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label>Mağaza logosu</Label>
            <div className="mt-2 flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground">
                  <Store className="h-8 w-8" />
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />{logoPreview ? "Dəyişdir" : "Yüklə"}
              </Button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "logo")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Mağaza adı *</Label>
            <Input id="name" placeholder="Məs: TechStore" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Təsvir</Label>
            <Textarea id="desc" placeholder="Mağaza haqqında..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" placeholder="+994 50 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Şəhər</Label>
              <Select value={form.city || "none"} onValueChange={(v) => setForm({ ...form, city: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Şəhər seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçin</SelectItem>
                  {regions.map((r: any) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Ünvan</Label>
            <Input id="address" placeholder="Küçə, bina" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">İş saatları</Label>
            <Input id="hours" placeholder="Məs: 09:00 - 18:00" value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saxlanılır...</> : existingStore ? "Yenilə" : "Mağazanı yarat"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CreateStore;
