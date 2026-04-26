import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdminOrMod } from "@/hooks/useIsAdmin";
import { usePlatformMode } from "@/hooks/usePlatformMode";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Loader2, Store, Video, ChevronDown, ChevronUp, ShoppingBag, MessageSquareText, Sparkles, Truck, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import IdentitySwitcher from "@/components/IdentitySwitcher";
import { getModelsByCategory } from "@/data/brandModels";
import { useTranslation } from "@/contexts/LanguageContext";

const conditions = ["Yeni", "Yeni kimi", "İşlənmiş"];

const CreateListing = () => {
  const { user } = useAuth();
  const { isPrivileged } = useIsAdminOrMod();
  const platform = usePlatformMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
  const [isBuyable, setIsBuyable] = useState(platform.mode === "marketplace" || platform.mode === "both");
  const [stock, setStock] = useState("1");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "", category: "", subcategory: "", condition: "Yeni", location: "",
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

  // Fetch existing listing for editing
  const { data: editListing, isLoading: editLoading } = useQuery({
    queryKey: ["edit-listing", editId],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", editId!).eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!editId && !!user,
  });

  // Auto-enable buyable when store is selected or in marketplace/both mode
  useEffect(() => {
    if ((platform.mode === "marketplace" || platform.mode === "both") && !editId) {
      setIsBuyable(true);
    }
  }, [platform.mode, editId]);

  // Auto-enable buyable when a store is selected
  useEffect(() => {
    if (selectedStoreId && !editId) {
      setIsBuyable(true);
    }
  }, [selectedStoreId, editId]);

  useEffect(() => {
    if (editListing && categories.length > 0) {
      // Find if the current category is a subcategory and identify its parent
      const currentCat = categories.find((c: any) => c.slug === editListing.category);
      let parentSlug = editListing.category;
      let subSlug = "";

      if (currentCat && currentCat.parent_id) {
        const parent = categories.find((c: any) => c.id === currentCat.parent_id);
        if (parent) {
          parentSlug = parent.slug;
          subSlug = currentCat.slug;
        }
      }

      setForm({
        title: editListing.title,
        description: editListing.description || "",
        price: String(editListing.price),
        category: parentSlug,
        subcategory: subSlug,
        condition: editListing.condition,
        location: editListing.location,
      });
      setExistingImages(editListing.image_urls || []);
      setExistingVideo(editListing.video_url || "");
      
      const cf = (editListing as any).custom_fields || {};
      setCustomFields(cf);
      if (Object.keys(cf).length > 0) {
        setShowCustomFields(true);
      }
      
      setIsBuyable((editListing as any).is_buyable || false);
      setStock(String((editListing as any).stock || 1));
      if (editListing.store_id) setSelectedStoreId(editListing.store_id);
    }
  }, [editListing, categories]);

  const { data: userStores = [] } = useQuery({
    queryKey: ["user-stores", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name, logo_url, status, is_premium, premium_until").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const approvedStores = userStores.filter((s: any) => s.status === "approved");
  const userStore = selectedStoreId 
    ? approvedStores.find((s: any) => s.id === selectedStoreId) || null
    : null;

  // Fetch shipping methods for selected store
  const { data: storeShippingMethods = [] } = useQuery({
    queryKey: ["store-shipping-methods", selectedStoreId],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("store_id", selectedStoreId!).eq("is_active", true).order("created_at");
      return data || [];
    },
    enabled: !!selectedStoreId,
  });

  // Load selected shipping methods from edit listing
  useEffect(() => {
    if (editListing && storeShippingMethods.length > 0) {
      const cf = (editListing as any).custom_fields || {};
      if (cf._shipping_methods && Array.isArray(cf._shipping_methods)) {
        setSelectedShippingMethods(cf._shipping_methods);
      }
    }
  }, [editListing, storeShippingMethods]);
  const parentCategories = categories.filter((c: any) => !c.parent_id);
  const subCategories = categories.filter((c: any) => {
    if (!form.category) return false;
    const parent = parentCategories.find((p: any) => p.slug === form.category);
    return parent && c.parent_id === parent.id;
  });

  // Fetch custom fields for selected category
  const activeCategorySlug = form.subcategory || form.category;
  const { data: categoryFields = [] } = useQuery({
    queryKey: ["category-fields", activeCategorySlug],
    queryFn: async () => {
      const { data } = await supabase.from("category_fields").select("*").eq("category_slug", activeCategorySlug).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !!activeCategorySlug,
  });

  if (!user) { navigate("/auth"); return null; }

  const handleAiAutofill = async () => {
    if (images.length === 0 && existingImages.length === 0) {
      toast({ title: t("create_listing.upload_image_first", "Əvvəlcə şəkil yükləyin"), variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      let imageUrl = "";
      if (existingImages.length > 0) {
        imageUrl = existingImages[0];
      } else if (images.length > 0) {
        // Upload first image temporarily to get URL
        const file = images[0];
        const tmpPath = `${user.id}/ai-tmp-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(tmpPath, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(tmpPath);
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("ai-listing-autofill", {
        body: { image_url: imageUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        price: data.price || prev.price,
        category: data.category || prev.category,
        condition: data.condition || prev.condition,
      }));
      toast({ title: t("create_listing.ai_success", "AI məlumatları uğurla doldurdu! ✨") });
    } catch (err: any) {
      toast({ title: t("create_listing.ai_error", "AI xətası"), description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > maxImages) {
      toast({ title: t("create_listing.max_images_error", { count: maxImages, defaultValue: `Maksimum ${maxImages} şəkil yükləyə bilərsiniz` }), variant: "destructive" });
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
        toast({ title: t("create_listing.video_too_long", { count: maxDur, defaultValue: `Video ${maxDur} saniyədən uzun ola bilməz` }), variant: "destructive" });
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
    if (!form.price || !form.category) {
      toast({ title: t("create_listing.required_fields", "Zəhmət olmasa bütün sahələri doldurun"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Check store listing limit for non-premium stores (skip for edits and admins)
      if (!editId && selectedStoreId && !isPrivileged) {
        const selectedStore = approvedStores.find((s: any) => s.id === selectedStoreId);
        const isPremium = selectedStore?.is_premium && (!selectedStore?.premium_until || new Date(selectedStore.premium_until) > new Date());
        if (!isPremium) {
          const storeLimit = generalSettings?.store_listing_limit || 20;
          const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("store_id", selectedStoreId);
          if ((count || 0) >= storeLimit) {
            toast({ title: `Mağazanızda maksimum ${storeLimit} elan limiti dolub`, description: t("create_listing.premium_unlimited", "Premium mağaza alın limitsiz elan yerləşdirin."), variant: "destructive" });
            setLoading(false);
            return;
          }
        }
      }
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

      const finalCategory = form.subcategory || form.category;

      // Add shipping methods to custom fields
      if (selectedShippingMethods.length > 0) {
        resolvedCustomFields._shipping_methods = selectedShippingMethods as any;
      }

      // Auto-generate listing title from category + key real-estate fields
      const catName = (categories.find((c: any) => c.slug === finalCategory) as any)?.name || "Elan";
      const titleParts: string[] = [];
      if (resolvedCustomFields.deal_type) titleParts.push(resolvedCustomFields.deal_type);
      titleParts.push(catName);
      if (resolvedCustomFields.rooms) titleParts.push(`${resolvedCustomFields.rooms} otaq`);
      if (resolvedCustomFields.area_m2) titleParts.push(`${resolvedCustomFields.area_m2} m²`);
      if (form.location) titleParts.push(form.location);
      const generatedTitle = titleParts.join(" · ");

      const listingData: any = {
        title: generatedTitle,
        description: form.description,
        price: parseFloat(form.price), category: finalCategory,
        condition: "Yeni", location: form.location || "Bakı",
        image_urls: allImages,
        video_url: finalVideoUrl,
        store_id: selectedStoreId || null,
        custom_fields: Object.keys(resolvedCustomFields).length > 0 ? resolvedCustomFields : null,
        is_buyable: selectedStoreId ? isBuyable : false,
        stock: selectedStoreId && isBuyable ? Math.max(parseInt(stock) || 1, 1) : (parseInt(stock) || 0),
        status: "pending",
        is_active: false,
      };

      if (editId) {
        const { error } = await supabase.from("listings").update(listingData).eq("id", editId).eq("user_id", user.id);
        if (error) throw error;
        toast({ title: t("create_listing.updated_success", "Elan uğurla yeniləndi!") });
        navigate(`/product/${editId}`);
      } else {
        const { error } = await supabase.from("listings").insert({ ...listingData, user_id: user.id });
        if (error) throw error;
        toast({ title: t("create_listing.sent_success", "Elan göndərildi!"), description: t("create_listing.pending_approval", "Admin təsdiqindən sonra yayımlanacaq.") });
        navigate("/profile");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
            {editId ? t("create_listing.title_edit") : t("create_listing.title_new")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editId ? t("create_listing.subtitle_edit") : t("create_listing.subtitle_new")}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Images */}
            <div>
              <Label>{t("create_listing.images", { count: maxImages })}</Label>
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
                    <ImagePlus className="h-6 w-6" /><span className="mt-1 text-xs">{t("common.add")}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
              </div>
              {/* AI Autofill button - for admins/mods and store owners */}
              {(isPrivileged || approvedStores.length > 0) && (images.length > 0 || existingImages.length > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiAutofill}
                  disabled={aiLoading}
                  className="mt-2 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                >
                  {aiLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("create_listing.ai_analyzing")}</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> {t("create_listing.ai_autofill")}</>
                  )}
                </Button>
              )}
            </div>

            {/* Video */}
            <div>
              <Label>{t("create_listing.video", { count: videoSettings?.max_duration || 60 })}</Label>
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
                    <Video className="h-6 w-6" /><span className="mt-1 text-xs">{t("create_listing.add_video")}</span>
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoAdd} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("create_listing.video_hint")}</p>
            </div>


            <div className="space-y-2">
              <Label htmlFor="desc">{t("create_listing.desc_field")}</Label>
              <Textarea id="desc" placeholder={t("create_listing.desc_placeholder")} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t("create_listing.price")}</Label>
                <Input id="price" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("create_listing.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                  <SelectTrigger><SelectValue placeholder={t("products.select")} /></SelectTrigger>
                  <SelectContent>
                    {parentCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subcategory */}
            {subCategories.length > 0 && (
              <div className="space-y-2">
                <Label>{t("create_listing.subcategory")}</Label>
                <Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })}>
                  <SelectTrigger><SelectValue placeholder={t("create_listing.select_subcategory")} /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("products.region")}</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue placeholder={t("products.select_region")} /></SelectTrigger>
                <SelectContent>
                  {regions.map((r: any) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Identity switcher - personal vs store */}
            {approvedStores.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> {t("create_listing.identity_label")}</Label>
                <IdentitySwitcher
                  selectedStoreId={selectedStoreId}
                  onSelect={(id) => setSelectedStoreId(id)}
                />
                {selectedStoreId && (
                  <p className="text-xs text-muted-foreground">{t("create_listing.store_identity_hint")}</p>
                )}
                {!selectedStoreId && (
                  <p className="text-xs text-muted-foreground">{t("create_listing.personal_identity_hint")}</p>
                )}
              </div>
            )}

            {/* Category custom fields */}
            {categoryFields.length > 0 && (() => {
              const brandModelMap = getModelsByCategory(activeCategorySlug);
              const selectedBrand = customFields["marka"];
              const modelOptions = brandModelMap && selectedBrand && selectedBrand !== "__other__"
                ? brandModelMap[selectedBrand] || []
                : [];

              return (
                <div className="rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setShowCustomFields(!showCustomFields)}
                    className="flex w-full items-center justify-between p-4"
                  >
                    <span className="text-sm font-semibold text-foreground">{t("create_listing.extra_info", { count: categoryFields.length })}</span>
                    {showCustomFields ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showCustomFields && (
                    <div className="space-y-4 px-4 pb-4">
                      {categoryFields.map((field: any) => {
                        // If this is the "model" field and we have brand-model mappings, show dynamic dropdown
                        const isDependentModel = field.field_name === "model" && brandModelMap && selectedBrand && selectedBrand !== "__other__" && modelOptions.length > 0;

                        return (
                          <div key={field.id} className="space-y-2">
                            <Label>{field.field_label}</Label>
                            {isDependentModel ? (
                              <>
                                <Select
                                  value={customFields[field.field_name] || ""}
                                  onValueChange={v => setCustomFields(prev => ({ ...prev, [field.field_name]: v, [field.field_name + "_other"]: "" }))}
                                >
                                  <SelectTrigger><SelectValue placeholder={t("create_listing.select_model")} /></SelectTrigger>
                                  <SelectContent>
                                    {modelOptions.map((m: string) => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                    <SelectItem value="__other__">{t("common.other")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                {customFields[field.field_name] === "__other__" && (
                                  <Input
                                    className="mt-2"
                                    placeholder={t("create_listing.enter_model")}
                                    value={customFields[field.field_name + "_other"] || ""}
                                    onChange={e => setCustomFields(prev => ({ ...prev, [field.field_name + "_other"]: e.target.value }))}
                                  />
                                )}
                              </>
                            ) : field.field_type === "select" && Array.isArray(field.options) ? (
                              <>
                                <Select
                                  value={customFields[field.field_name] || ""}
                                  onValueChange={v => {
                                    const updates: Record<string, string> = { [field.field_name]: v, [field.field_name + "_other"]: "" };
                                    // Reset model when brand changes
                                    if (field.field_name === "marka" && brandModelMap) {
                                      updates["model"] = "";
                                      updates["model_other"] = "";
                                    }
                                    setCustomFields(prev => ({ ...prev, ...updates }));
                                  }}
                                >
                                  <SelectTrigger><SelectValue placeholder={t("products.select")} /></SelectTrigger>
                                  <SelectContent>
                                    {field.options.map((opt: string) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                    <SelectItem value="__other__">{t("common.other")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                {customFields[field.field_name] === "__other__" && (
                                  <Input
                                    className="mt-2"
                                    placeholder={t("create_listing.enter_field", { field: field.field_label })}
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
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Buyable toggle - show in marketplace/both modes when e-commerce is enabled */}
            {platform.showSales && ecomSettings?.enabled && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" /> {t("create_listing.direct_sale")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("create_listing.direct_sale_desc")}</p>
                  </div>
                  <Switch checked={isBuyable} onCheckedChange={setIsBuyable} />
                </div>
                {isBuyable && (
                  <div className="space-y-1">
                    <Label className="text-xs">{t("create_listing.stock")}</Label>
                    <Input type="number" min="1" value={stock} onChange={(e) => setStock(e.target.value)}
                      className="h-9 w-32" />
                  </div>
                )}
              </div>
            )}

            {/* Shipping methods - always show when store is selected */}
            {selectedStoreId && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> {t("detail.shipping_methods")}
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">{t("create_listing.shipping_desc")}</p>
                {storeShippingMethods.length > 0 ? (
                  <div className="space-y-2">
                    {storeShippingMethods.map((method: any) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedShippingMethods.includes(method.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <Checkbox
                          checked={selectedShippingMethods.includes(method.id)}
                          onCheckedChange={(checked) => {
                            setSelectedShippingMethods(prev =>
                              checked
                                ? [...prev, method.id]
                                : prev.filter(id => id !== method.id)
                            );
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{method.name}</span>
                            <span className="text-sm font-semibold text-primary">{method.price > 0 ? `${method.price} ₼` : t("detail.free")}</span>
                          </div>
                          {(method.description || method.estimated_days) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {method.description}{method.estimated_days ? ` · ${method.estimated_days}` : ""}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <Truck className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {t("create_listing.no_shipping")}{" "}
                      <a href="/store-dashboard" className="text-primary hover:underline">{t("create_listing.from_store_panel")}</a> {t("create_listing.add_from_panel")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editId ? t("create_listing.updating") : t("create_listing.posting")}</> : (editId ? t("create_listing.update_listing") : t("create_listing.post_listing"))}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateListing;
