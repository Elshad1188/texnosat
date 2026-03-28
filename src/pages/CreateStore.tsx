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

const CreateStore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
    if (days.length === 7) return "Hər gün";
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
    if (!form.name) { toast({ title: "Mağaza adını daxil edin", variant: "destructive" }); return; }
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

      if (editId && editStore) {
        const { error } = await supabase.from("stores").update(payload).eq("id", editId);
        if (error) throw error;
        toast({ title: "Mağaza yeniləndi!" });
      } else {
        const { error } = await supabase.from("stores").insert({ user_id: user!.id, ...payload, status: "pending" });
        if (error) throw error;
        toast({ title: "Mağaza yaradıldı! Admin təsdiqi gözlənilir." });
      }
      navigate("/profile");
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
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {editId ? "Mağazanı redaktə et" : "Mağaza aç"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editId ? "Mağaza məlumatlarını yeniləyin" : "Yeni mağaza yaradın — admin təsdiqi tələb olunur"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <h3 className="font-display text-base font-bold text-foreground">🚀 Mağaza açın, satışa başlayın!</h3>
          <p className="mt-1 text-xs text-muted-foreground">Elan24-də mağaza açmaq pulsuzdur. Elanlarınızı bir yerdə idarə edin və müştərilərinizə peşəkar görüntü təqdim edin.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">Pulsuz</p><p className="text-[10px] text-muted-foreground">Mağaza profili və limitsiz elan</p></div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <Crown className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">Premium</p><p className="text-[10px] text-muted-foreground">Üst sıralarda göstərilmə</p></div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-card/80 p-3 border border-border/50">
              <Store className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div><p className="text-xs font-semibold text-foreground">Birbaşa satış</p><p className="text-[10px] text-muted-foreground">Sifariş və çatdırılma idarəsi</p></div>
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
                  <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => coverInputRef.current?.click()}>Dəyişdir</Button>
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

          <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/30">
            <Label>İş günləri və saatları</Label>
            
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
                <Label className="text-[10px] uppercase text-muted-foreground">Açılış</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-muted-foreground">Qapanış</Label>
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
                Nəticə: <span className="text-foreground font-medium">{selectedDays.length > 0 ? formattedWorkingHours : "Seçilməyib"}</span>
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saxlanılır...</> : editId ? "Yenilə" : "Mağazanı yarat"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default CreateStore;
