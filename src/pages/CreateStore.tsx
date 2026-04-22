import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Store, Loader2, Crown, Upload, CheckCircle, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { useTranslation } from "@/contexts/LanguageContext";

const CreateStore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", phone: "", working_hours: "", instagram_url: "",
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const daysOfWeek = [
    { id: "B.e", label: "B.e" },
    { id: "Ç.a", label: "Ç.a" },
    { id: "Ç.", label: "Ç." },
    { id: "C.a", label: "C.a" },
    { id: "Cü", label: "Cü" },
    { id: "Ş.", label: "Ş." },
    { id: "B.", label: "B." },
  ];

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2).toString().padStart(2, "0");
    const minute = (i % 2 === 0 ? "00" : "30");
    return `${hour}:${minute}`;
  });

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const getDayRangeString = (days: string[]) => {
    if (days.length === 0) return "";
    if (days.length === 7) return t("create_store.every_day", "Hər gün");
    if (days.length === 5 && days.every(d => ["B.e", "Ç.a", "Ç.", "C.a", "Cü"].includes(d))) return "B.e - Cü";
    
    // Check for continuous range
    const indices = days.map(d => daysOfWeek.findIndex(dw => dw.id === d)).sort((a, b) => a - b);
    const isContinuous = indices.every((val, i) => i === 0 || val === indices[i-1] + 1);
    
    if (isContinuous && days.length > 2) {
      return `${daysOfWeek[indices[0]].label} - ${daysOfWeek[indices[indices.length-1]].label}`;
    }
    
    return days.join(", ");
  };

  const formattedWorkingHours = `${getDayRangeString(selectedDays)}, ${startTime} - ${endTime}`;

  const { data: regions = [] } = useQuery({
    queryKey: ["regions-parent"],
    queryFn: async () => {
      const { data } = await supabase.from("regions").select("*").is("parent_id", null).eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Load existing store for editing
  const { data: editStore, isLoading: editLoading } = useQuery({
    queryKey: ["edit-store", editId],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", editId!).eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!editId && !!user,
  });

  // Set form values when editing
  useState(() => {
    if (editStore) {
      setForm({
        name: editStore.name || "", description: editStore.description || "",
        address: editStore.address || "", city: editStore.city || "",
        phone: editStore.phone || "", working_hours: editStore.working_hours || "",
        instagram_url: (editStore as any).instagram_url || "",
      });
      if (editStore.logo_url) setLogoPreview(editStore.logo_url);
      if (editStore.cover_url) setCoverPreview(editStore.cover_url);
      
      // Try to parse working hours
      if (editStore.working_hours) {
        const parts = editStore.working_hours.split(",");
        if (parts.length >= 2) {
          const daysPart = parts[0].trim();
          const timePart = parts[1].trim();
          
          if (daysPart === "Hər gün") setSelectedDays(daysOfWeek.map(d => d.id));
          else if (daysPart.includes("-")) {
            const [start, end] = daysPart.split("-").map(d => d.trim());
            const sIdx = daysOfWeek.findIndex(dw => dw.label === start);
            const eIdx = daysOfWeek.findIndex(dw => dw.label === end);
            if (sIdx !== -1 && eIdx !== -1) {
              setSelectedDays(daysOfWeek.slice(sIdx, eIdx + 1).map(d => d.id));
            }
          } else {
            setSelectedDays(daysPart.split(",").map(d => d.trim()).filter(d => daysOfWeek.some(dw => dw.id === d)));
          }
          
          const times = timePart.split("-").map(t => t.trim());
          if (times.length === 2) {
            setStartTime(times[0]);
            setEndTime(times[1]);
          }
        }
      }
    }
  });

  // Re-populate when editStore loads
  const [populated, setPopulated] = useState(false);
  if (editStore && !populated) {
    setForm({
      name: editStore.name || "", description: editStore.description || "",
      address: editStore.address || "", city: editStore.city || "",
      phone: editStore.phone || "", working_hours: editStore.working_hours || "",
      instagram_url: (editStore as any).instagram_url || "",
    });
    if (editStore.logo_url) setLogoPreview(editStore.logo_url);
    if (editStore.cover_url) setCoverPreview(editStore.cover_url);
    setPopulated(true);
  }

  if (!user) { navigate("/auth"); return null; }

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
    if (!form.name) { toast({ title: t("create_store.name_required", "Mağaza adını daxil edin"), variant: "destructive" }); return; }
    setLoading(true);
    try {
      let logoUrl = editStore?.logo_url || null;
      let coverUrl = editStore?.cover_url || null;
      if (logoFile) logoUrl = await uploadFile(logoFile, "logo", "store-logos");
      if (coverFile) coverUrl = await uploadFile(coverFile, "cover", "store-logos");

      const payload = { 
        ...form, 
        logo_url: logoUrl, 
        cover_url: coverUrl,
        working_hours: selectedDays.length > 0 ? formattedWorkingHours : form.working_hours 
      };

      if (editId) {
        // Always submit change request for admin approval when editing
        const { error } = await supabase.from("store_change_requests").insert({
          store_id: editId,
          user_id: user!.id,
          request_type: "edit",
          changes: payload,
        });
        if (error) throw error;
        toast({ title: t("create_store.edit_request_sent", "Redaktə sorğusu göndərildi! Admin təsdiqi gözlənilir.") });
      } else {
        const { error } = await supabase.from("stores").insert({ user_id: user!.id, ...payload, status: "pending" });
        if (error) throw error;
        toast({ title: t("create_store.created_success", "Mağaza yaradıldı! Admin təsdiqi gözlənilir.") });
      }
      navigate("/profile");
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
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {editId ? t("create_store.title_edit") : t("create_store.title_new")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editId ? t("create_store.subtitle_edit") : t("create_store.subtitle_new")}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <h3 className="font-display text-base font-bold text-foreground">{t("create_store.banner_title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("create_store.banner_desc")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">{t("create_store.free")}</p><p className="text-[10px] text-muted-foreground">{t("create_store.free_desc")}</p></div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <Crown className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">Premium</p><p className="text-[10px] text-muted-foreground">{t("create_store.premium_desc")}</p></div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <Store className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">{t("create_listing.direct_sale")}</p><p className="text-[10px] text-muted-foreground">{t("create_store.direct_sales_desc")}</p></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Cover Image */}
          <div>
            <Label>{t("create_store.cover_image")}</Label>
            <div className="mt-2">
              {coverPreview ? (
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
                  <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                  <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => coverInputRef.current?.click()}>{t("common.change")}</Button>
                </div>
              ) : (
                <button type="button" onClick={() => coverInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <Image className="h-8 w-8" /><span className="mt-2 text-sm">{t("create_store.upload_cover")}</span>
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "cover")} />
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label>{t("create_store.logo")}</Label>
            <div className="mt-2 flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-20 w-20 rounded-xl border border-border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground">
                  <Store className="h-8 w-8" />
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />{logoPreview ? t("common.change") : t("common.upload")}
              </Button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "logo")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("create_store.name")}</Label>
            <Input id="name" placeholder={t("create_store.name_placeholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{t("create_listing.desc_field")}</Label>
            <Textarea id="desc" placeholder={t("create_store.desc_placeholder")} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("profile.phone")}</Label>
              <Input id="phone" placeholder="+994 50 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("create_store.city")}</Label>
              <Select value={form.city || "none"} onValueChange={(v) => setForm({ ...form, city: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={t("create_store.select_city")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("products.select")}</SelectItem>
                  {regions.map((r: any) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("create_store.address")}</Label>
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
              placeholder={t("create_store.address_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">{t("create_store.instagram")}</Label>
            <Input id="instagram" placeholder="@magazaadi və ya https://instagram.com/magazaadi" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/30">
            <Label>{t("create_store.working_hours")}</Label>
            
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={cn(
                    "h-10 w-10 rounded-lg text-xs font-semibold transition-all border",
                    selectedDays.includes(day.id)
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">{t("create_store.opening")}</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">{t("create_store.closing")}</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground italic">
                {t("create_store.result")} <span className="text-foreground font-medium">{selectedDays.length > 0 ? formattedWorkingHours : t("create_store.not_selected")}</span>
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("create_store.saving")}</> : editId ? t("common.update") : t("create_store.create")}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CreateStore;
