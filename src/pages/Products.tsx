import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { CircuitBoard, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { iconMap } from "@/lib/icons";

const conditions = ["Hamısı", "Yeni", "Yeni kimi", "İşlənmiş"];
const sortOptions = [
  { value: "newest", label: "Ən yeni" },
  { value: "price-asc", label: "Ucuzdan bahaya" },
  { value: "price-desc", label: "Bahadan ucuza" },
  { value: "views", label: "Ən çox baxılan" },
];

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Az əvvəl";
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(dateStr).toLocaleDateString("az");
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("Hamısı");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ["regions-all"],
    queryFn: async () => {
      const { data } = await supabase.from("regions").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Fetch custom fields for selected category
  const { data: categoryFields = [] } = useQuery({
    queryKey: ["category-fields", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data } = await supabase.from("category_fields").select("*").eq("category_slug", selectedCategory).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !!selectedCategory,
  });

  // Fetch listings from DB
  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ["listings-all"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("is_active", true).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch stores for listing badges
  const listingStoreIds = [...new Set(allListings.map(l => l.store_id).filter(Boolean))] as string[];
  const { data: storesMap = {} } = useQuery({
    queryKey: ["stores-map-products", listingStoreIds.join(",")],
    queryFn: async () => {
      if (listingStoreIds.length === 0) return {};
      const { data } = await supabase.from("stores").select("id, name, logo_url").in("id", listingStoreIds);
      const map: Record<string, { name: string; logo_url: string | null }> = {};
      data?.forEach(s => { map[s.id] = { name: s.name, logo_url: s.logo_url }; });
      return map;
    },
    enabled: listingStoreIds.length > 0,
  });

  const parentCategories = categories.filter((c: any) => !c.parent_id);
  const subcategories = selectedCategory ? categories.filter((c: any) => {
    const parent = parentCategories.find((p: any) => p.slug === selectedCategory);
    return parent && c.parent_id === parent.id;
  }) : [];

  const parentRegions = regions.filter((r: any) => !r.parent_id);

  const filteredProducts = useMemo(() => {
    let result = [...allListings];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((p: any) => {
        const inTitle = p.title.toLowerCase().includes(q);
        const inDesc = (p.description || "").toLowerCase().includes(q);
        const inFields = Object.values((p as any).custom_fields || {}).some(val => 
          String(val).toLowerCase().includes(q)
        );
        return inTitle || inDesc || inFields;
      });
    }

    if (selectedCategory) {
      result = result.filter((p: any) => p.category === selectedCategory);
    }

    if (selectedCondition !== "Hamısı") {
      result = result.filter((p: any) => p.condition === selectedCondition);
    }

    if (selectedRegion) {
      const region = regions.find((r: any) => r.id === selectedRegion);
      if (region) {
        result = result.filter((p: any) => p.location === (region as any).name);
      }
    }

    if (priceMin) result = result.filter((p: any) => Number(p.price) >= Number(priceMin));
    if (priceMax) result = result.filter((p: any) => Number(p.price) <= Number(priceMax));

    // Custom fields filtering
    Object.entries(customFilters).forEach(([fieldName, selectedValue]) => {
      if (selectedValue) {
        result = result.filter((p: any) => {
          const customFields = (p as any).custom_fields || {};
          return customFields[fieldName] === selectedValue;
        });
      }
    });

    if (sortBy === "price-asc") result.sort((a: any, b: any) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-desc") result.sort((a: any, b: any) => Number(b.price) - Number(a.price));
    else if (sortBy === "views") result.sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0));

    return result;
  }, [query, selectedCategory, selectedCondition, sortBy, priceMin, priceMax, allListings, selectedRegion, regions]);

  const clearFilters = () => {
    setQuery(""); setSelectedCategory(""); setSelectedSubcategory("");
    setSelectedRegion(""); setSelectedCondition("Hamısı");
    setPriceMin(""); setPriceMax(""); setSortBy("newest");
    setCustomFilters({});
    setSearchParams({});
  };

  const hasActiveFilters = query || selectedCategory || selectedCondition !== "Hamısı" || priceMin || priceMax || selectedRegion || Object.values(customFilters).some(v => v !== "");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Məhsul axtar..." value={query} onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </form>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filterlər
            </Button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 animate-fade-in rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vəziyyət</label>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <button key={c} onClick={() => setSelectedCondition(c)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedCondition === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bölgə</label>
                <Select value={selectedRegion || "all"} onValueChange={(v) => setSelectedRegion(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Bölgə seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {parentRegions.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qiymət aralığı (₼)</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                    className="h-9 w-24 rounded-lg border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span className="text-muted-foreground">—</span>
                  <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                    className="h-9 w-24 rounded-lg border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              {/* Custom fields filters */}
              {categoryFields.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-border w-full">
                  <div className="w-full">
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Kateqoriyaya özəl filtrlər</h4>
                    <div className="flex flex-wrap gap-4">
                      {categoryFields.map((field: any) => (
                        <div key={field.id}>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.field_label}</label>
                          <Select value={customFilters[field.field_name] || "all"} onValueChange={(v) => setCustomFilters(prev => ({ ...prev, [field.field_name]: v === "all" ? "" : v }))}>
                            <SelectTrigger className="w-44 bg-muted/30"><SelectValue placeholder="Seçin" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Hamısı</SelectItem>
                              {Array.isArray(field.options) && field.options.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
                <X className="h-3 w-3" /> Filterləri sıfırla
              </button>
            )}
          </div>
        )}

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            Hamısı
          </button>
          {parentCategories.map((cat: any) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            return (
              <button key={cat.id} onClick={() => { setSelectedCategory(selectedCategory === cat.slug ? "" : cat.slug); setSelectedSubcategory(""); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                <Icon className="h-3.5 w-3.5" />{cat.name}
              </button>
            );
          })}
        </div>

        {/* Subcategory chips */}
        {subcategories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5 pl-4">
            {subcategories.map((sub: any) => (
              <button key={sub.id} onClick={() => setSelectedSubcategory(selectedSubcategory === sub.slug ? "" : sub.slug)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${selectedSubcategory === sub.slug ? "bg-primary/80 text-primary-foreground" : "bg-muted/80 text-muted-foreground hover:bg-accent"}`}>
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="mb-4 text-sm text-muted-foreground">
          {isLoading ? "Yüklənir..." : `${filteredProducts.length} elan tapıldı`}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product: any) => {
              const st = product.store_id ? storesMap[product.store_id] : undefined;
              return (
                <ListingCard
                  key={product.id} id={product.id} title={product.title}
                  price={`${Number(product.price).toLocaleString()} ${product.currency}`}
                  location={product.location} time={formatTime(product.created_at)}
                  image={product.image_urls?.[0] || "/placeholder.svg"}
                  condition={product.condition} isPremium={product.is_premium} isUrgent={product.is_urgent}
                  storeId={product.store_id} storeName={st?.name} storeLogo={st?.logo_url}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-display text-lg font-semibold text-foreground">Elan tapılmadı</h3>
            <p className="mt-1 text-sm text-muted-foreground">Axtarış meyarlarınızı dəyişməyi yoxlayın</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">Filterləri sıfırla</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Products;
