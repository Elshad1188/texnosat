import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Eye, Globe, Trash2, CheckSquare, Square } from "lucide-react";

interface ScrapedListing {
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  location: string;
  description: string;
  source_url: string;
  category: string;
  selected?: boolean;
}

const SOURCES = [
  { value: "tap.az", label: "Tap.az", baseUrl: "https://tap.az" },
  { value: "telefon.az", label: "Telefon.az", baseUrl: "https://telefon.az" },
  { value: "custom", label: "Digər sayt", baseUrl: "" },
];

const AdminScraperManager = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [source, setSource] = useState("tap.az");
  const [categoryUrl, setCategoryUrl] = useState("");
  const [limit, setLimit] = useState("20");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetLocation, setTargetLocation] = useState("Bakı");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ScrapedListing[]>([]);
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

    try {
      const { data, error } = await supabase.functions.invoke("scrape-listings", {
        body: {
          source,
          categoryUrl,
          limit: parseInt(limit) || 20,
          targetCategory,
          targetLocation,
        },
      });

      if (error) throw error;

      if (data?.listings) {
        setResults(data.listings.map((l: ScrapedListing) => ({ ...l, selected: true })));
        toast({ title: "Uğurlu", description: `${data.listings.length} elan tapıldı` });
      } else {
        toast({ title: "Nəticə yoxdur", description: "Heç bir elan tapılmadı", variant: "destructive" });
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
      const insertData = selected.map(l => ({
        title: l.title,
        price: l.price,
        currency: l.currency || '₼',
        category: targetCategory,
        location: targetLocation || l.location || 'Bakı',
        description: l.description || l.title,
        image_urls: l.image_url ? [l.image_url] : [],
        user_id: session?.user?.id,
        status: 'approved' as const,
        condition: 'İşlənmiş' as const,
      }));

      const { error } = await supabase.from("listings").insert(insertData);
      if (error) throw error;

      toast({ title: "Uğurlu", description: `${selected.length} elan əlavə edildi` });
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

        {/* Source selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mənbə sayt</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Limit (say)</label>
            <Input
              type="number"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              placeholder="20"
              className="h-9 text-sm"
              min={1}
              max={500}
            />
          </div>
        </div>

        {/* URL input */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Kateqoriya URL-i</label>
          <Input
            value={categoryUrl}
            onChange={e => setCategoryUrl(e.target.value)}
            placeholder={source === "tap.az" ? "https://tap.az/elanlar/elektronika/telefonlar" : source === "telefon.az" ? "https://telefon.az/category/telefonlar" : "https://example.com/category"}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {source === "tap.az" && "Misal: https://tap.az/elanlar/elektronika/telefonlar"}
            {source === "telefon.az" && "Misal: https://telefon.az/category/telefonlar"}
            {source === "custom" && "İstənilən saytın kateqoriya və ya axtarış səhifəsinin URL-i"}
          </p>
        </div>

        {/* Target mapping */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hədəf kateqoriya</label>
            <Select value={targetCategory} onValueChange={setTargetCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Kateqoriya seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hədəf bölgə</label>
            <Select value={targetLocation} onValueChange={setTargetLocation}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleScrape} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {loading ? "Çəkilir..." : "Önizlə"}
        </Button>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Nəticələr ({selectedCount}/{results.length} seçildi)
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={toggleAll}>
                {results.every(r => r.selected) ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                {results.every(r => r.selected) ? "Heç birini" : "Hamısını"} seç
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving || selectedCount === 0}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {saving ? "Saxlanılır..." : `${selectedCount} elan saxla`}
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {results.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                  item.selected ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                }`}
                onClick={() => toggleSelect(index)}
              >
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => toggleSelect(index)}
                  className="shrink-0"
                />
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-[10px]">N/A</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{item.price} {item.currency}</Badge>
                    <span className="text-[11px] text-muted-foreground">{item.location}</span>
                  </div>
                </div>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    onClick={e => e.stopPropagation()}
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </a>
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
