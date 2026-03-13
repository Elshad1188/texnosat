import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [existingVideo, setExistingVideo] = useState<string>("");
  const [publishToStore, setPublishToStore] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "", condition: "Yeni", location: "",
  });

  // Fetch max video duration from settings
  const { data: videoSettings } = useQuery({
    queryKey: ["video-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "video_settings").maybeSingle();
      return (data?.value as any) || { max_duration: 60 };
    },
  });

  // Fetch existing listing for editing
  const { data: editListing, isLoading: editLoading } = useQuery({
    queryKey: ["edit-listing", editId],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", editId!).eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!editId && !!user,
  });

  useEffect(() => {
    if (editListing) {
      setForm({
        title: editListing.title,
        description: editListing.description || "",
        price: String(editListing.price),
        category: editListing.category,
        condition: editListing.condition,
        location: editListing.location,
      });
      setExistingImages(editListing.image_urls || []);
      setPublishToStore(!!editListing.store_id);
    }
  }, [editListing]);

  const { data: userStore } = useQuery({
    queryKey: ["user-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, logo_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

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
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > 5) {
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

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.category) {
      toast({ title: "Zəhmət olmasa bütün sahələri doldurun", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const newImageUrls: string[] = [];
      for (const file of images) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("listing-images").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(fileName);
        newImageUrls.push(urlData.publicUrl);
      }

      const allImages = [...existingImages, ...newImageUrls];

      if (editId) {
        const { error } = await supabase.from("listings").update({
          title: form.title, description: form.description,
          price: parseFloat(form.price), category: form.category,
          condition: form.condition, location: form.location || "Bakı",
          image_urls: allImages,
          store_id: publishToStore && userStore ? userStore.id : null,
        }).eq("id", editId).eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Elan uğurla yeniləndi!" });
        navigate(`/product/${editId}`);
      } else {
        const { error } = await supabase.from("listings").insert({
          user_id: user.id, title: form.title, description: form.description,
          price: parseFloat(form.price), category: form.category,
          condition: form.condition, location: form.location || "Bakı",
          image_urls: allImages,
          store_id: publishToStore && userStore ? userStore.id : null,
        });
        if (error) throw error;
        toast({ title: "Elan uğurla yerləşdirildi!" });
        navigate("/products");
      }
    } catch (err: any) {
      toast({ title: "Xəta baş verdi", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (editId && editLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          {editId ? "Elanı redaktə et" : "Elan yerləşdir"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {editId ? "Elanınızın məlumatlarını yeniləyin" : "Məhsulunuzu satışa çıxarın"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Images */}
          <div>
            <Label>Şəkillər (maks. 5)</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.map((src, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {existingImages.length + images.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <ImagePlus className="h-6 w-6" /><span className="mt-1 text-xs">Əlavə et</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
          </div>

          {/* Store option */}
          {userStore && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {userStore.logo_url ? (
                    <img src={userStore.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{userStore.name} mağazasında paylaş</p>
                  <p className="text-xs text-muted-foreground">Elan mağaza profili altında göstəriləcək</p>
                </div>
              </div>
              <Switch checked={publishToStore} onCheckedChange={setPublishToStore} />
            </div>
          )}

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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editId ? "Yenilənir..." : "Yerləşdirilir..."}</> : (editId ? "Elanı yenilə" : "Elanı yerləşdir")}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CreateListing;
