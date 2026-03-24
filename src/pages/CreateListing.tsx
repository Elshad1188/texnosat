import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrMod } from "@/hooks/useIsAdmin";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Loader2, Store, Video, ChevronDown, ChevronUp, ShoppingBag, MessageSquareText, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const conditions = ["Yeni", "Yeni kimi", "İşlənmiş"];

const CreateListing = () => {
  const { user } = useAuth();
  const { isPrivileged } = useIsAdminOrMod();
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
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [isBuyable, setIsBuyable] = useState(false);
  const [stock, setStock] = useState("1");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "", condition: "Yeni", location: "",
  });

  const { data: videoSettings } = useQuery({
    queryKey: ["video-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "video_settings").maybeSingle();
      return (data?.value as any) || { max_duration: 60 };
    },
  });

  const { data: generalSettings } = useQuery({
    queryKey: ["site-settings-general"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      return (data?.value as any) || { max_images_per_listing: 10 };
    },
  });

  const { data: ecomSettings } = useQuery({
    queryKey: ["ecommerce-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ecommerce").maybeSingle();
      return (data?.value as any) || { enabled: false };
    },
  });

  const maxImages = generalSettings?.max_images_per_listing || 10;

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
      setCustomFields((editListing as any).custom_fields || {});
      setIsBuyable((editListing as any).is_buyable || false);
      setStock(String((editListing as any).stock || 1));
      if (editListing.store_id) setSelectedStoreId(editListing.store_id);
    }
  }, [editListing]);

  const { data: userStores = [] } = useQuery({
    queryKey: ["user-stores", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, logo_url, status").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const approvedStores = userStores.filter((s: any) => s.status === "approved");
  const userStore = selectedStoreId 
    ? approvedStores.find((s: any) => s.id === selectedStoreId) || null
    : approvedStores.length > 0 ? approvedStores[0] : null;

  useEffect(() => {
    if (approvedStores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(approvedStores[0].id);
    }
  }, [approvedStores.length]);


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

  // Fetch custom fields for selected category
  const { data: categoryFields = [] } = useQuery({
    queryKey: ["category-fields", form.category],
    queryFn: async () => {
      const { data } = await supabase.from("category_fields").select("*").eq("category_slug", form.category).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !!form.category,
  });

  if (!user) { navigate("/auth"); return null; }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > maxImages) {
      toast({ title: `Maksimum ${maxImages} şəkil yükləyə bilərsiniz`, variant: "destructive" });
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

  const handleVideoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxDur = videoSettings?.max_duration || 60;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > maxDur) {
        toast({ title: `Video ${maxDur} saniyədən uzun ola bilməz`, variant: "destructive" });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setExistingVideo("");
    };
    video.src = URL.createObjectURL(file);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    setExistingVideo("");
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

      // Upload video if new
      let finalVideoUrl: string | null = existingVideo || null;
      if (videoFile) {
        const videoName = `${user.id}/${Date.now()}-${videoFile.name}`;
        const { error: vErr } = await supabase.storage.from("listing-videos").upload(videoName, videoFile);
        if (vErr) throw vErr;
        const { data: vUrl } = supabase.storage.from("listing-videos").getPublicUrl(videoName);
        finalVideoUrl = vUrl.publicUrl;
      }

      const allImages = [...existingImages, ...newImageUrls];

      // Resolve "Digər" custom field values
      const resolvedCustomFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(customFields)) {
        if (key.endsWith("_other")) continue;
        if (value === "__other__") {
          resolvedCustomFields[key] = customFields[key + "_other"] || "";
        } else {
          resolvedCustomFields[key] = value;
        }
      }

      const listingData: any = {
        title: form.title, description: form.description,
        price: parseFloat(form.price), category: form.category,
        condition: form.condition, location: form.location || "Bakı",
        image_urls: allImages,
        video_url: finalVideoUrl,
        store_id: selectedStoreId || null,
        custom_fields: Object.keys(resolvedCustomFields).length > 0 ? resolvedCustomFields : null,
        is_buyable: isBuyable,
        stock: parseInt(stock) || 0,
      };

      if (editId) {
        const { error } = await supabase.from("listings").update(listingData).eq("id", editId).eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Elan uğurla yeniləndi!" });
        navigate(`/product/${editId}`);
      } else {
        const { error } = await supabase.from("listings").insert({ ...listingData, user_id: user.id });
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
        <div className="rounded-2xl border-2 border-primary p-6 shadow-lg shadow-primary/5 bg-card">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {editId ? "Elanı redaktə et" : "Elan yerləşdir"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editId ? "Elanınızın məlumatlarını yeniləyin" : "Məhsulunuzu satışa çıxarın"}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Images */}
            <div>
              <Label>Şəkillər (maks. {maxImages})</Label>
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
                {existingImages.length + images.length < maxImages && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <ImagePlus className="h-6 w-6" /><span className="mt-1 text-xs">Əlavə et</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
              </div>
            </div>

            {/* Video */}
            <div>
              <Label>Video (maks. {videoSettings?.max_duration || 60} san.)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {(existingVideo || videoPreview) && (
                  <div className="relative h-24 w-36 overflow-hidden rounded-xl border border-border bg-black">
                    <video src={existingVideo || videoPreview} className="h-full w-full object-cover" muted />
                    <button type="button" onClick={removeVideo}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Video</div>
                  </div>
                )}
                {!existingVideo && !videoPreview && (
                  <button type="button" onClick={() => videoInputRef.current?.click()}
                    className="flex h-24 w-36 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <Video className="h-6 w-6" /><span className="mt-1 text-xs">Video əlavə et</span>
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoAdd} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Video əlavə etsəniz, elanınız Reels bölməsində görünəcək</p>
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

            {/* Store selector */}
            {approvedStores.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Mağaza seçin</Label>
                {approvedStores.length === 1 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                    {approvedStores[0].logo_url ? (
                      <img src={approvedStores[0].logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Store className="h-4 w-4 text-primary" /></div>
                    )}
                    <span className="text-sm font-medium text-foreground">{approvedStores[0].name}</span>
                  </div>
                ) : (
                  <Select value={selectedStoreId || ""} onValueChange={(v) => setSelectedStoreId(v)}>
                    <SelectTrigger><SelectValue placeholder="Mağaza seçin" /></SelectTrigger>
                    <SelectContent>
                      {approvedStores.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
                            ) : (
                              <Store className="h-4 w-4 text-muted-foreground" />
                            )}
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Category custom fields */}
            {categoryFields.length > 0 && (
              <div className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setShowCustomFields(!showCustomFields)}
                  className="flex w-full items-center justify-between p-4"
                >
                  <span className="text-sm font-semibold text-foreground">Əlavə məlumatlar ({categoryFields.length})</span>
                  {showCustomFields ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {showCustomFields && (
                  <div className="space-y-4 px-4 pb-4">
                    {categoryFields.map((field: any) => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.field_label}
                        </Label>
                        {field.field_type === "select" && Array.isArray(field.options) ? (
                          <>
                            <Select
                              value={customFields[field.field_name] || ""}
                              onValueChange={v => setCustomFields(prev => ({ ...prev, [field.field_name]: v, [field.field_name + "_other"]: "" }))}
                            >
                              <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                                <SelectItem value="__other__">Digər</SelectItem>
                              </SelectContent>
                            </Select>
                            {customFields[field.field_name] === "__other__" && (
                              <Input
                                className="mt-2"
                                placeholder={`${field.field_label} daxil edin...`}
                                value={customFields[field.field_name + "_other"] || ""}
                                onChange={e => setCustomFields(prev => ({ ...prev, [field.field_name + "_other"]: e.target.value }))}
                              />
                            )}
                          </>
                        ) : field.field_type === "number" ? (
                          <Input
                            type="number"
                            placeholder={field.field_label}
                            value={customFields[field.field_name] || ""}
                            onChange={e => setCustomFields(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          />
                        ) : (
                          <Input
                            placeholder={field.field_label}
                            value={customFields[field.field_name] || ""}
                            onChange={e => setCustomFields(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buyable toggle - only for stores with e-commerce enabled */}
            {ecomSettings?.enabled && userStore && userStore.status === "approved" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" /> Birbaşa satış
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Müştərilər bu məhsulu birbaşa ala bilsin</p>
                  </div>
                  <Switch checked={isBuyable} onCheckedChange={setIsBuyable} />
                </div>
                {isBuyable && (
                  <div className="space-y-1">
                    <Label className="text-xs">Stok sayı</Label>
                    <Input type="number" min="1" value={stock} onChange={(e) => setStock(e.target.value)}
                      className="h-9 w-32" />
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editId ? "Yenilənir..." : "Yerləşdirilir..."}</> : (editId ? "Elanı yenilə" : "Elanı yerləşdir")}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateListing;
