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
import { Loader2, Download, Eye, Globe, CheckSquare, Square, ExternalLink, ImageIcon } from "lucide-react";

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
  selected?: boolean;
}

const SOURCES = [
  { value: "tap.az", label: "Tap.az" },
  { value: "telefon.az", label: "Telefon.az" },
  { value: "temu", label: "Temu" },
  { value: "custom", label: "Digər sayt" },
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
  const [results, setResults] = useState<ScrapedListing[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [cats, regs] = await Promise.all([
        supabase.from("categories").select("slug, name").eq("is_active", true).order("sort_order"),
        supabase.from("regions").select("name").eq("is_active", true).is("parent_id", null).order("sort_order"),
      ]);
      if (cats.data) setCategories(cats.data);
      if (regs.data) setRegions(regs.data);
    };
    fetchData();
  }, []);

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
        body: { source, categoryUrl, limit: parseInt(limit) || 20, fetchDetails },
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
        custom_fields: l.custom_fields && Object.keys(l.custom_fields).length > 0 ? l.custom_fields : null,
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

  const selectedCount = results.filter(r => r.selected).length;

  return (
    <div className="space-y-4">
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
