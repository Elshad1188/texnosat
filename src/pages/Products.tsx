import { useState, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, Loader2, MapPin, Tag, CircleDollarSign, Calendar, Sparkles, Layers, Filter, Map as MapIcon, LayoutGrid } from "lucide-react";
import { CircuitBoard, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { iconMap } from "@/lib/icons";
import SaveSearchButton from "@/components/SaveSearchButton";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { getListingCoords } from "@/components/ListingsMap";
const ListingsMap = lazy(() => import("@/components/ListingsMap"));

type MapBounds = { north: number; south: number; east: number; west: number };

const conditions = [
  { value: "all", dbValue: "", labelKey: "common.all" },
  { value: "new", dbValue: "Yeni", labelKey: "products.condition_new" },
  { value: "like_new", dbValue: "Yeni kimi", labelKey: "products.condition_like_new" },
  { value: "used", dbValue: "İşlənmiş", labelKey: "products.condition_used" },
];
const sortOptions = [
  { value: "newest", labelKey: "products.sort_newest" },
  { value: "price-asc", labelKey: "products.sort_price_asc" },
  { value: "price-desc", labelKey: "products.sort_price_desc" },
  { value: "views", labelKey: "products.sort_views" },
];
const conditionDbMap = Object.fromEntries(conditions.map((c) => [c.value, c.dbValue]));

function formatTime(dateStr: string, t: (key: string, options?: any) => string, language: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return t("time.just_now");
  if (hours < 24) return t("time.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("time.days_ago", { count: days });
  return new Date(dateStr).toLocaleDateString(language);
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialDeal = searchParams.get("deal") || "";

  const [query, setQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDeal, setSelectedDeal] = useState(initialDeal);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [useMapBoundsFilter, setUseMapBoundsFilter] = useState(true);

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

    if (selectedDeal) {
      result = result.filter((p: any) => {
        const dt = (p as any).deal_type || (p as any).custom_fields?.deal_type;
        if (!dt) return selectedDeal === "sale"; // köhnə elanlar default alqı-satqı
        const norm = String(dt).toLowerCase();
        if (selectedDeal === "sale") return norm === "sale" || norm.includes("alqı") || norm.includes("satış");
        if (selectedDeal === "rent") return norm === "rent" || norm.includes("kirayə") || norm.includes("kiraye");
        if (selectedDeal === "daily") return norm === "daily" || norm.includes("günlük") || norm.includes("gunluk");
        if (selectedDeal === "roommate") return norm === "roommate" || norm.includes("otaq yold");
        return true;
      });
    }

    if (selectedSubcategory) {
      result = result.filter((p: any) => p.subcategory === selectedSubcategory);
    }

    if (selectedCondition !== "all") {
      result = result.filter((p: any) => p.condition === conditionDbMap[selectedCondition]);
    }

    if (selectedRegion) {
      const region = regions.find((r: any) => r.id === selectedRegion);
      if (region) {
        result = result.filter((p: any) => p.location === (region as any).name);
      }
    }

    if (priceMin) result = result.filter((p: any) => Number(p.price) >= Number(priceMin));
    if (priceMax) result = result.filter((p: any) => Number(p.price) <= Number(priceMax));

    if (dateRange !== "all") {
      const days = dateRange === "24h" ? 1 : dateRange === "week" ? 7 : dateRange === "month" ? 30 : 0;
      if (days > 0) {
        const cutoff = Date.now() - days * 86400000;
        result = result.filter((p: any) => new Date(p.created_at).getTime() >= cutoff);
      }
    }

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
  }, [query, selectedCategory, selectedSubcategory, selectedCondition, sortBy, priceMin, priceMax, allListings, selectedRegion, regions, customFilters, dateRange, selectedDeal]);

  // Apply map-bounds filter on top of standard filters when in map view
  const visibleProducts = useMemo(() => {
    if (viewMode !== "map" || !mapBounds || !useMapBoundsFilter) return filteredProducts;
    return filteredProducts.filter((p: any) => {
      const c = getListingCoords(p);
      if (!c) return false;
      const [lat, lng] = c;
      return lat <= mapBounds.north && lat >= mapBounds.south && lng <= mapBounds.east && lng >= mapBounds.west;
    });
  }, [filteredProducts, mapBounds, viewMode, useMapBoundsFilter]);

  const clearFilters = () => {
    setQuery(""); setSelectedCategory(""); setSelectedSubcategory("");
    setSelectedRegion(""); setSelectedCondition("all");
    setPriceMin(""); setPriceMax(""); setSortBy("newest");
    setDateRange("all");
    setCustomFilters({});
    setSelectedDeal("");
    setSearchParams({});
  };

  const activeFilterCount =
    (query ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedSubcategory ? 1 : 0) +
    (selectedCondition !== "all" ? 1 : 0) +
    (selectedRegion ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0) +
    (selectedDeal ? 1 : 0) +
    Object.values(customFilters).filter((v) => v).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t("products.search_placeholder")} value={query} onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </form>
          <div className="flex gap-2 flex-wrap">
            <div className="inline-flex h-11 rounded-xl border border-border bg-card p-1">
              <button onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                <LayoutGrid className="h-4 w-4" /> Şəbəkə
              </button>
              <button onClick={() => setViewMode("map")}
                className={`flex items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                <MapIcon className="h-4 w-4" /> Xəritə
              </button>
            </div>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> {t("products.filters")}
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    {t("products.filters")}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Category */}
                  <FilterSection icon={Tag} title={t("categories.title") || "Kateqoriya"}>
                    <Select value={selectedCategory || "all"} onValueChange={(v) => { setSelectedCategory(v === "all" ? "" : v); setSelectedSubcategory(""); }}>
                      <SelectTrigger><SelectValue placeholder={t("common.all")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {parentCategories.map((c: any) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {subcategories.length > 0 && (
                      <Select value={selectedSubcategory || "all"} onValueChange={(v) => setSelectedSubcategory(v === "all" ? "" : v)}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder={t("common.all")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("common.all")}</SelectItem>
                          {subcategories.map((s: any) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </FilterSection>

                  {/* Region */}
                  <FilterSection icon={MapPin} title={t("products.region")}>
                    <Select value={selectedRegion || "all"} onValueChange={(v) => setSelectedRegion(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("products.select_region")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {parentRegions.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FilterSection>

                  {/* Price */}
                  <FilterSection icon={CircleDollarSign} title={t("products.price_range")}>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder={t("products.min")} value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      <span className="text-muted-foreground">—</span>
                      <input type="number" placeholder={t("products.max")} value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </FilterSection>

                  {/* Date */}
                  <FilterSection icon={Calendar} title="Tarix">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { v: "all", l: t("common.all") },
                        { v: "24h", l: "Son 24 saat" },
                        { v: "week", l: "Son 7 gün" },
                        { v: "month", l: "Son 30 gün" },
                      ].map((o) => (
                        <button key={o.v} onClick={() => setDateRange(o.v)}
                          className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${dateRange === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Condition */}
                  <FilterSection icon={Sparkles} title={t("products.condition")}>
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map((c) => (
                        <button key={c.value} onClick={() => setSelectedCondition(c.value)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedCondition === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                          {t(c.labelKey)}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Custom category fields */}
                  {categoryFields.length > 0 && (
                    <FilterSection icon={Layers} title={t("products.category_filters")}>
                      <div className="space-y-3">
                        {categoryFields.map((field: any) => (
                          <div key={field.id}>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">{field.field_label}</label>
                            <Select value={customFilters[field.field_name] || "all"} onValueChange={(v) => setCustomFilters(prev => ({ ...prev, [field.field_name]: v === "all" ? "" : v }))}>
                              <SelectTrigger><SelectValue placeholder={t("products.select")} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t("common.all")}</SelectItem>
                                {Array.isArray(field.options) && field.options.map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </FilterSection>
                  )}
                </div>

                <SheetFooter className="mt-6 flex-row gap-2 sm:flex-row">
                  <Button variant="outline" onClick={clearFilters} className="flex-1" disabled={!hasActiveFilters}>
                    <X className="h-4 w-4 mr-1" /> {t("products.clear_filters")}
                  </Button>
                  <Button onClick={() => setShowFilters(false)} className="flex-1">
                    {t("products.results_count", { count: filteredProducts.length })}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <SaveSearchButton
              query={query}
              category={selectedCategory}
              subcategory={selectedSubcategory}
              region={selectedRegion ? (regions.find((r: any) => r.id === selectedRegion) as any)?.name : ""}
              condition={selectedCondition === "all" ? "" : conditionDbMap[selectedCondition]}
              priceMin={priceMin}
              priceMax={priceMax}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {query && <FilterChip label={`"${query}"`} onClear={() => setQuery("")} />}
            {selectedCategory && <FilterChip label={parentCategories.find((c: any) => c.slug === selectedCategory)?.name || selectedCategory} onClear={() => { setSelectedCategory(""); setSelectedSubcategory(""); }} />}
            {selectedSubcategory && <FilterChip label={subcategories.find((s: any) => s.slug === selectedSubcategory)?.name || selectedSubcategory} onClear={() => setSelectedSubcategory("")} />}
            {selectedRegion && <FilterChip label={(regions.find((r: any) => r.id === selectedRegion) as any)?.name} onClear={() => setSelectedRegion("")} />}
            {selectedCondition !== "all" && <FilterChip label={t(conditions.find((c) => c.value === selectedCondition)!.labelKey)} onClear={() => setSelectedCondition("all")} />}
            {(priceMin || priceMax) && <FilterChip label={`${priceMin || 0} — ${priceMax || "∞"} ₼`} onClear={() => { setPriceMin(""); setPriceMax(""); }} />}
            {dateRange !== "all" && <FilterChip label={dateRange === "24h" ? "Son 24 saat" : dateRange === "week" ? "Son 7 gün" : "Son 30 gün"} onClear={() => setDateRange("all")} />}
            {Object.entries(customFilters).filter(([, v]) => v).map(([k, v]) => (
              <FilterChip key={k} label={`${k}: ${v}`} onClear={() => setCustomFilters((p) => ({ ...p, [k]: "" }))} />
            ))}
            <button onClick={clearFilters} className="ml-1 text-xs text-primary hover:underline">
              {t("products.clear_filters")}
            </button>
          </div>
        )}

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {t("common.all")}
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
        <div className="mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {isLoading
              ? t("common.loading")
              : t("products.results_count", { count: viewMode === "map" ? visibleProducts.length : filteredProducts.length })}
            {viewMode === "map" && useMapBoundsFilter && mapBounds && (
              <span className="ml-1 text-xs text-primary">(görünən sahədə)</span>
            )}
          </span>
          {viewMode === "map" && (
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={useMapBoundsFilter} onChange={(e) => setUseMapBoundsFilter(e.target.checked)} className="accent-primary" />
              Xəritə sahəsi üzrə filtrlə
            </label>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : viewMode === "map" ? (
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ListingsMap
              listings={filteredProducts as any}
              height="600px"
              onBoundsChange={setMapBounds}
            />
            {visibleProducts.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {visibleProducts.slice(0, 24).map((product: any) => {
                  const st = product.store_id ? storesMap[product.store_id] : undefined;
                  return (
                    <ListingCard
                      key={product.id} id={product.id} title={product.title}
                      price={`${Number(product.price).toLocaleString()} ${product.currency}`}
                      location={product.location} time={formatTime(product.created_at, t, language)}
                      image={product.image_urls?.[0] || "/placeholder.svg"}
                      condition={product.condition} isPremium={product.is_premium} isUrgent={product.is_urgent}
                      isBuyable={product.is_buyable}
                      numericPrice={Number(product.price)} currency={product.currency} userId={product.user_id} customFields={product.custom_fields}
                      storeId={product.store_id} storeName={st?.name} storeLogo={st?.logo_url}
                    />
                  );
                })}
              </div>
            )}
          </Suspense>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product: any) => {
              const st = product.store_id ? storesMap[product.store_id] : undefined;
              return (
                <ListingCard
                  key={product.id} id={product.id} title={product.title}
                  price={`${Number(product.price).toLocaleString()} ${product.currency}`}
                  location={product.location} time={formatTime(product.created_at, t, language)}
                  image={product.image_urls?.[0] || "/placeholder.svg"}
                  condition={product.condition} isPremium={product.is_premium} isUrgent={product.is_urgent}
                  isBuyable={product.is_buyable}
                  numericPrice={Number(product.price)} currency={product.currency} userId={product.user_id} customFields={product.custom_fields}
                  storeId={product.store_id} storeName={st?.name} storeLogo={st?.logo_url}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-display text-lg font-semibold text-foreground">{t("products.no_results_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("products.no_results_desc")}</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">{t("products.clear_filters")}</Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const FilterSection = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
    {children}
  </div>
);

const FilterChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
    {label}
    <button onClick={onClear} className="ml-0.5 rounded-full hover:bg-primary/20" aria-label="clear">
      <X className="h-3 w-3" />
    </button>
  </span>
);

export default Products;
