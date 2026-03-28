import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Eye, Globe, CheckSquare, Square, ExternalLink, ImageIcon, Clock, Trash2, Play, Pause } from "lucide-react";

interface ScrapedListing {
  title: string;
  price: number;
  currency: string;
  image_urls: string[];
  location: string;
  description: string;
  source_url: string;
  category: string;
  condition: string;
  custom_fields: Record<string, string>;
  seller_name?: string;
  seller_phone?: string;
  selected?: boolean;
}

interface ScraperSchedule {
  id: string;
  source: string;
  category_url: string;
  target_category: string;
  target_location: string;
  scrape_limit: number;
  fetch_details: boolean;
  cron_expression: string;
  is_active: boolean;
  user_id: string;
  last_run_at: string | null;
  last_run_result: any;
  created_at: string;
}

const SOURCES = [
  { value: "tap.az", label: "Tap.az" },
  { value: "telefon.az", label: "Telefon.az" },
  { value: "temu", label: "Temu" },
  { value: "custom", label: "Digər sayt" },
];

const CRON_PRESETS = [
  { value: "0 */1 * * *", label: "Hər saat" },
  { value: "0 */3 * * *", label: "Hər 3 saat" },
  { value: "0 */6 * * *", label: "Hər 6 saat" },
  { value: "0 */12 * * *", label: "Hər 12 saat" },
  { value: "0 9 * * *", label: "Hər gün saat 9:00" },
  { value: "0 9,21 * * *", label: "Hər gün saat 9:00 və 21:00" },
  { value: "0 0 * * 1", label: "Hər həftə bazar ertəsi" },
];

const AdminScraperManager = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [source, setSource] = useState("tap.az");
  const [categoryUrl, setCategoryUrl] = useState("");
  const [limit, setLimit] = useState("20");
  const [fetchDetails, setFetchDetails] = useState(true);
  const [targetCategory, setTargetCategory] = useState("");
  const [targetLocation, setTargetLocation] = useState("Bakı");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("scraper_proxy_url") || "");
  const [singleUrl, setSingleUrl] = useState("");
  const [singleSource, setSingleSource] = useState("tap.az");
  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkUrlsText, setBulkUrlsText] = useState("");
  const [bulkSource, setBulkSource] = useState("tap.az");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [results, setResults] = useState<ScrapedListing[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ name: string }[]>([]);

  // Cron scheduling state
  const [schedules, setSchedules] = useState<ScraperSchedule[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [cronExpression, setCronExpression] = useState("0 */6 * * *");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [cats, regs, scheds] = await Promise.all([
        supabase.from("categories").select("slug, name").eq("is_active", true).order("sort_order"),
        supabase.from("regions").select("name").eq("is_active", true).is("parent_id", null).order("sort_order"),
        supabase.from("scraper_schedules").select("*").order("created_at", { ascending: false }),
      ]);
      if (cats.data) setCategories(cats.data);
      if (regs.data) setRegions(regs.data);
      if (scheds.data) setSchedules(scheds.data as any);
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem("scraper_proxy_url", proxyUrl);
  }, [proxyUrl]);

  const handleScrape = async () => {
    if (!categoryUrl) {
      toast({ title: "Xəta", description: "URL daxil edin", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResults([]);
    setExpandedIndex(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-listings", {
        body: { source, categoryUrl, limit: parseInt(limit) || 20, fetchDetails, customProxyUrl: proxyUrl },
      });

      if (error) throw error;

      if (data?.listings?.length > 0) {
        setResults(data.listings.map((l: ScrapedListing) => ({ ...l, selected: true })));
        toast({ title: "Uğurlu", description: `${data.listings.length} elan tapıldı` });
      } else {
        toast({ title: "Nəticə yoxdur", description: data?.error || "Heç bir elan tapılmadı. Sayt bot qoruması istifadə edə bilər.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Scrape error:", error);
      toast({ title: "Xəta", description: error.message || "Scrape zamanı xəta baş verdi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleImport = async () => {
    if (!singleUrl) {
      toast({ title: "Xəta", description: "Link daxil edin", variant: "destructive" });
      return;
    }
    setSingleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-listings", {
        body: { 
          source: singleSource, 
          categoryUrl: singleUrl, 
          singleUrlMode: true, 
          fetchDetails: true,
          customProxyUrl: proxyUrl 
        },
      });

      if (error) throw error;

      if (data?.listings?.length > 0) {
        setResults(data.listings.map((l: ScrapedListing) => ({ ...l, selected: true })));
        setExpandedIndex(0);
        toast({ title: "Uğurlu", description: "Məlumatlar çəkildi. İndi 'Saxla' düyməsi ilə elanı paylaşa bilərsiniz." });
      } else {
        toast({ title: "Nəticə yoxdur", description: "Məlumat tapılmadı. Sayt bot qoruması istifadə edir və ya link səhvdir.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const urls = bulkUrlsText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urls.length === 0) {
      toast({ title: "Xəta", description: "Ən azı 1 düzgün URL daxil edin", variant: "destructive" });
      return;
    }
    setBulkLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-listings", {
        body: { source: bulkSource, categoryUrl: urls[0], bulkUrls: urls, customProxyUrl: proxyUrl },
      });
      if (error) throw error;
      if (data?.listings?.length > 0) {
        setResults(data.listings.map((l: ScrapedListing) => ({ ...l, selected: true })));
        toast({ title: "Uğurlu", description: `${data.listings.length} elan tapıldı (${urls.length} linkdən)` });
      } else {
        toast({ title: "Nəticə yoxdur", description: "Heç bir elan tapılmadı", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  

  const toggleSelect = (index: number) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  };

  const toggleAll = () => {
    const allSelected = results.every(r => r.selected);
    setResults(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const handleSave = async () => {
    const selected = results.filter(r => r.selected);
    if (selected.length === 0) {
      toast({ title: "Xəta", description: "Ən azı 1 elan seçin", variant: "destructive" });
      return;
    }
    if (!targetCategory) {
      toast({ title: "Xəta", description: "Hədəf kateqoriya seçin", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Duplicate check: find existing titles
      const titles = selected.map(l => l.title);
      const { data: existing } = await supabase
        .from("listings")
        .select("title")
        .in("title", titles);
      
      const existingTitles = new Set((existing || []).map(e => e.title));
      const unique = selected.filter(l => !existingTitles.has(l.title));
      const duplicateCount = selected.length - unique.length;

      if (unique.length === 0) {
        toast({ title: "Dublikat", description: `Bütün ${selected.length} elan artıq mövcuddur`, variant: "destructive" });
        setSaving(false);
        return;
      }

      const insertData = unique.map(l => ({
        title: l.title,
        price: l.price || 0,
        currency: l.currency || '₼',
        category: targetCategory,
        location: targetLocation || l.location || 'Bakı',
        description: l.description || l.title,
        image_urls: l.image_urls || [],
        user_id: session?.user?.id,
        status: 'approved' as const,
        condition: l.condition || 'İşlənmiş',
        custom_fields: {
          ...(l.custom_fields || {}),
          ...(l.seller_name ? { original_seller: l.seller_name } : {}),
          ...(l.seller_phone ? { original_phone: l.seller_phone } : {}),
        },
      }));

      const { error } = await supabase.from("listings").insert(insertData);
      if (error) throw error;

      const msg = duplicateCount > 0
        ? `${unique.length} elan əlavə edildi, ${duplicateCount} dublikat atlandı`
        : `${unique.length} elan əlavə edildi`;
      toast({ title: "Uğurlu", description: msg });
      setResults([]);
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async () => {
    if (!categoryUrl || !targetCategory) {
      toast({ title: "Xəta", description: "URL və hədəf kateqoriya tələb olunur", variant: "destructive" });
      return;
    }
    setSavingSchedule(true);
    try {
      const { data, error } = await supabase.from("scraper_schedules").insert({
        source,
        category_url: categoryUrl,
        target_category: targetCategory,
        target_location: targetLocation,
        scrape_limit: parseInt(limit) || 20,
        fetch_details: fetchDetails,
        cron_expression: cronExpression,
        user_id: session?.user?.id,
        is_active: true,
      } as any).select().single();
      
      if (error) throw error;
      setSchedules(prev => [data as any, ...prev]);
      setShowScheduleForm(false);
      toast({ title: "Planlaşdırma yaradıldı", description: `Scraper ${CRON_PRESETS.find(c => c.value === cronExpression)?.label || cronExpression} tezliyində işləyəcək` });
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleSchedule = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("scraper_schedules").update({ is_active: !currentActive } as any).eq("id", id);
    if (!error) {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s));
    }
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("scraper_schedules").delete().eq("id", id);
    if (!error) {
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast({ title: "Planlaşdırma silindi" });
    }
  };

  const runScheduleNow = async (schedule: ScraperSchedule) => {
    toast({ title: "İcra edilir...", description: "Scraper işə düşdü" });
    try {
      const { data, error } = await supabase.functions.invoke("scrape-listings", {
        body: {
          source: schedule.source,
          categoryUrl: schedule.category_url,
          limit: schedule.scrape_limit,
          fetchDetails: schedule.fetch_details,
          cronMode: true,
          targetCategory: schedule.target_category,
          targetLocation: schedule.target_location,
          userId: schedule.user_id,
        },
      });
      if (error) throw error;
      // Update last run
      await supabase.from("scraper_schedules").update({
        last_run_at: new Date().toISOString(),
        last_run_result: data,
      } as any).eq("id", schedule.id);
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, last_run_at: new Date().toISOString(), last_run_result: data } : s));
      toast({ title: "Uğurlu", description: `${data?.inserted || 0} yeni elan əlavə edildi` });
    } catch (error: any) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    }
  };

  const selectedCount = results.filter(r => r.selected).length;

  return (
    <div className="space-y-4">
      {/* Scheduled Jobs Section */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Avtomatik planlaşdırma ({schedules.length})
          </h3>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowScheduleForm(!showScheduleForm)}>
            {showScheduleForm ? "Ləğv et" : "Yeni plan"}
          </Button>
        </div>

        {showScheduleForm && (
          <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Aşağıdakı scraper parametrlərindən istifadə edərək avtomatik plan yaradın. Əvvəlcə yuxarıdakı formda URL, mənbə və kateqoriya seçin.</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tezlik</label>
              <Select value={cronExpression} onValueChange={setCronExpression}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={saveSchedule} disabled={savingSchedule} className="gap-1.5">
              {savingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
              Planı yarat
            </Button>
          </div>
        )}

        {schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules.map(schedule => (
              <div key={schedule.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-card">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={schedule.is_active ? "default" : "secondary"} className="text-[10px]">
                      {schedule.is_active ? "Aktiv" : "Dayandırılıb"}
                    </Badge>
                    <span className="text-xs font-medium text-foreground truncate">
                      {SOURCES.find(s => s.value === schedule.source)?.label} → {categories.find(c => c.slug === schedule.target_category)?.name || schedule.target_category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {CRON_PRESETS.find(c => c.value === schedule.cron_expression)?.label || schedule.cron_expression}
                    {" · "}{schedule.scrape_limit} limit
                    {schedule.last_run_at && ` · Son: ${new Date(schedule.last_run_at).toLocaleDateString('az')}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => runScheduleNow(schedule)} title="İndi işlət">
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSchedule(schedule.id, schedule.is_active)}>
                  {schedule.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-green-500" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSchedule(schedule.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">Planlaşdırılmış scraper yoxdur</p>
        )}
      </Card>

      {/* Single Link Importer */}
      <Card className="p-4 space-y-4 border-2 border-primary/20 bg-primary/5">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Tək linkdən avtomatik idxal (Yeni)
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-32">
            <Select value={singleSource} onValueChange={setSingleSource}>
              <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input 
            value={singleUrl} 
            onChange={e => setSingleUrl(e.target.value)} 
            placeholder="Məs: https://tap.az/elanlar/..." 
            className="flex-1 h-10 bg-background"
          />
          <Button onClick={handleSingleImport} disabled={singleLoading} className="gap-2 px-6">
            {singleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {singleLoading ? "Çəkilir..." : "İdxal et"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sistem avtomatik olaraq başlığı, qiyməti, şəkilləri, açıqlamanı və satıcı məlumatlarını çəkəcək.
        </p>
      </Card>

      {/* Manual Scraper */}
      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4" /> Elan Scraper
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mənbə sayt</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Limit (say)</label>
            <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="20" className="h-9 text-sm" min={1} max={500} />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Kateqoriya URL-i</label>
          <Input
            value={categoryUrl}
            onChange={e => setCategoryUrl(e.target.value)}
            placeholder={source === "tap.az" ? "https://tap.az/elanlar/elektronika/telefonlar" : source === "telefon.az" ? "https://telefon.az/category/telefonlar" : source === "temu" ? "https://www.temu.com/search_result.html?search_key=phone" : "https://example.com/category"}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {source === "tap.az" && "Misal: https://tap.az/elanlar/elektronika/telefonlar"}
            {source === "telefon.az" && "Misal: https://telefon.az/category/telefonlar"}
            {source === "temu" && "Misal: https://www.temu.com/search_result.html?search_key=phone"}
            {source === "custom" && "İstənilən saytın kateqoriya URL-i"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hədəf kateqoriya</label>
            <Select value={targetCategory} onValueChange={setTargetCategory}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Kateqoriya seçin" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hədəf bölgə</label>
            <Select value={targetLocation} onValueChange={setTargetLocation}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {regions.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Xüsusi Proxy URL (istəyə bağlı)</label>
          <Input
            value={proxyUrl}
            onChange={e => setProxyUrl(e.target.value)}
            placeholder="http://user:pass@12.34.56.78:8080"
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Tap.az kimi saytların bloka salmaması üçün xüsusi proxy məlumatı daxil edə bilərsiniz.
          </p>
        </div>

        {/* Detail fetching toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Ətraflı məlumat çək</p>
            <p className="text-[11px] text-muted-foreground">Hər elanın daxili səhifəsinə girib şəkillər, açıqlama, xüsusiyyətlər çəkir (yavaş ola bilər)</p>
          </div>
          <Switch checked={fetchDetails} onCheckedChange={setFetchDetails} />
        </div>

        <Button onClick={handleScrape} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {loading ? "Çəkilir..." : "Önizlə"}
        </Button>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Nəticələr ({selectedCount}/{results.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={toggleAll}>
                {results.every(r => r.selected) ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                {results.every(r => r.selected) ? "Ləğv et" : "Hamısı"}
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving || selectedCount === 0}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {saving ? "Saxlanılır..." : `${selectedCount} saxla`}
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {results.map((item, index) => (
              <div key={index} className="rounded-lg border border-border overflow-hidden">
                {/* Main row */}
                <div
                  className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition-colors ${
                    item.selected ? "bg-primary/5" : "bg-card"
                  }`}
                  onClick={() => toggleSelect(index)}
                >
                  <Checkbox checked={item.selected} onCheckedChange={() => toggleSelect(index)} className="shrink-0" />
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.image_urls?.[0] ? (
                      <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {item.price > 0 && <Badge variant="secondary" className="text-[10px]">{item.price} {item.currency}</Badge>}
                      <span className="text-[11px] text-muted-foreground">{item.location}</span>
                      {item.image_urls?.length > 1 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5"><ImageIcon className="h-2.5 w-2.5" />{item.image_urls.length}</Badge>
                      )}
                      {item.condition && item.condition !== 'İşlənmiş' && (
                        <Badge variant="outline" className="text-[10px]">{item.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); setExpandedIndex(expandedIndex === index ? null : index); }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {item.source_url && (
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-primary"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedIndex === index && (
                  <div className="border-t border-border p-3 bg-muted/30 space-y-3">
                    {/* Images gallery */}
                    {item.image_urls?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1.5">Şəkillər ({item.image_urls.length})</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {item.image_urls.map((img, imgIdx) => (
                            <img key={imgIdx} src={img} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover border border-border"
                              onError={e => (e.currentTarget.style.display = 'none')} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {item.description && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Açıqlama</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">{item.description}</p>
                      </div>
                    )}

                    {/* Custom fields / specs */}
                    {item.custom_fields && Object.keys(item.custom_fields).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Xüsusiyyətlər</p>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(item.custom_fields).map(([key, val]) => (
                            <div key={key} className="flex gap-1 text-[11px]">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-foreground font-medium">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminScraperManager;
