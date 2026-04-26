import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search, Store, MapPin, Crown, X } from "lucide-react";
import StoreCard from "@/components/StoreCard";
import { useTranslation } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SortMode = "premium" | "newest" | "most_listings" | "name_asc";

const Stores = () => {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("all");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("premium");
  const { t } = useTranslation();

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("status", "approved")
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: listingCounts = {} } = useQuery({
    queryKey: ["store-listing-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("store_id")
        .eq("is_active", true)
        .not("store_id", "is", null);
      const counts: Record<string, number> = {};
      data?.forEach((l: any) => {
        if (l.store_id) counts[l.store_id] = (counts[l.store_id] || 0) + 1;
      });
      return counts;
    },
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s: any) => { if (s.city) set.add(s.city); });
    return Array.from(set).sort();
  }, [stores]);

  const filtered = useMemo(() => {
    let res = stores.filter((s: any) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
      const matchCity = city === "all" || s.city === city;
      const matchPremium = !premiumOnly || !!s.is_premium;
      return matchSearch && matchCity && matchPremium;
    });

    res = [...res].sort((a: any, b: any) => {
      if (sort === "premium") {
        if (!!b.is_premium !== !!a.is_premium) return b.is_premium ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "most_listings") return (listingCounts[b.id] || 0) - (listingCounts[a.id] || 0);
      if (sort === "name_asc") return (a.name || "").localeCompare(b.name || "", "az");
      return 0;
    });

    return res;
  }, [stores, search, city, premiumOnly, sort, listingCounts]);

  const hasActiveFilters = search || city !== "all" || premiumOnly || sort !== "premium";
  const resetFilters = () => { setSearch(""); setCity("all"); setPremiumOnly(false); setSort("premium"); };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{t("stores.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("stores.subtitle")}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("stores.search_placeholder") || "Agentlik adı və ya açıqlama üzrə axtarış..."}
                className="pl-9 h-11 rounded-xl bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Şəhər" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün şəhərlər</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium öncə</SelectItem>
                  <SelectItem value="newest">Ən yenilər</SelectItem>
                  <SelectItem value="most_listings">Ən çox elan</SelectItem>
                  <SelectItem value="name_asc">Ad (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1 flex">
              <Button
                type="button"
                variant={premiumOnly ? "default" : "outline"}
                onClick={() => setPremiumOnly((v) => !v)}
                className="h-11 w-full rounded-xl"
                title="Yalnız Premium"
              >
                <Crown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Tapıldı:</span>
                <Badge variant="secondary">{filtered.length} agentlik</Badge>
                {city !== "all" && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{city}</Badge>}
                {premiumOnly && <Badge variant="outline" className="gap-1"><Crown className="h-3 w-3" />Premium</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" /> Filtri sıfırla
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-4">
              <Store className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-medium text-foreground">{t("stores.not_found")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("stores.try_other_search")}</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
                Filtri sıfırla
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((store: any) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                logo_url={store.logo_url}
                cover_url={store.cover_url}
                city={store.city}
                is_premium={store.is_premium}
                listingCount={listingCounts[store.id] || 0}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Stores;
