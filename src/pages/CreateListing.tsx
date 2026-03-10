import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Loader2, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const conditions = ["Yeni", "Yeni kimi", "İşlənmiş"];

const CreateListing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [publishToStore, setPublishToStore] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "", condition: "Yeni", location: "",
  });

  // Check if user has a store
  const { data: userStore } = useQuery({
    queryKey: ["user-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, logo_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch categories from DB
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Fetch regions from DB
  const { data: regions = [] } = useQuery({
    queryKey: ["regions-parent"],
    queryFn: async () => {
      const { data } = await supabase.from("regions").select("*").is("parent_id", null).eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const parentCategories = categories.filter((c: any) => !c.parent_id);

  if (!user) { navigate("/auth"); return null; }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast({ title: "Maksimum 5 şəkil yükləyə bilərsiniz", variant: "destructive" });
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category) {
      toast({ title: "Zəhmət olmasa bütün sahələri doldurun", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("listing-images").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(fileName);
        imageUrls.push(urlData.publicUrl);
      }
      const { error } = await supabase.from("listings").insert({
        user_id: user.id, title: form.title, description: form.description,
        price: parseFloat(form.price), category: form.category,
        condition: form.condition, location: form.location || "Bakı",
        image_urls: imageUrls,
        store_id: publishToStore && userStore ? userStore.id : null,
      });
      if (error) throw error;
      toast({ title: "Elan uğurla yerləşdirildi!" });
      navigate("/products");
    } catch (err: any) {
      toast({ title: "Xəta baş verdi", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Elan yerləşdir</h1>
        <p className="mt-1 text-sm text-muted-foreground">Məhsulunuzu satışa çıxarın</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Images */}
          <div>
            <Label>Şəkillər (maks. 5)</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <ImagePlus className="h-6 w-6" /><span className="mt-1 text-xs">Əlavə et</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Başlıq *</Label>
            <Input id="title" placeholder="Məs: iPhone 15 Pro Max 256GB" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Təsvir</Label>
            <Textarea id="desc" placeholder="Məhsul haqqında ətraflı məlumat..." rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Qiymət (₼) *</Label>
              <Input id="price" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kateqoriya *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {parentCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vəziyyət</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bölgə</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue placeholder="Bölgə seçin" /></SelectTrigger>
                <SelectContent>
                  {regions.map((r: any) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yerləşdirilir...</> : "Elanı yerləşdir"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CreateListing;
