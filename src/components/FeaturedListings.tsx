import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "./ListingCard";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Clock, Loader2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useCallback, useRef } from "react";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { useListingScope } from "@/hooks/useListingScope";
import { listingMatchesScope } from "@/lib/listingScope";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/datetime";


interface HomepageSettings {
  homepage_premium_count: number;
  homepage_urgent_count: number;
  homepage_new_count: number;
  homepage_auto_load: boolean;
  homepage_image_slider: boolean;
}

const defaultSettings: HomepageSettings = {
  homepage_premium_count: 4,
  homepage_urgent_count: 4,
  homepage_new_count: 8,
  homepage_auto_load: false,
  homepage_image_slider: false,
};

const FeaturedListings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { scope, categoryMap, isLoading: scopeLoading, isError: scopeError, refetch: refetchScope } = useListingScope();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: hpSettings = defaultSettings } = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      if (error) throw error;
      const v = data?.value as any;
      return {
        homepage_premium_count: v?.homepage_premium_count ?? 4,
        homepage_urgent_count: v?.homepage_urgent_count ?? 4,
        homepage_new_count: v?.homepage_new_count ?? 8,
        homepage_auto_load: v?.homepage_auto_load ?? false,
        homepage_image_slider: v?.homepage_image_slider ?? false,
      };
    },
    staleTime: 60000,
  });

  const categorySlugs = Object.keys(categoryMap).filter(category => listingMatchesScope(category, categoryMap, scope));
  const scopeKey = categorySlugs.join(",");
  const ready = !scopeLoading && !scopeError;
  const scopedQuery = () => {
    const query = supabase.from("listings").select("*").eq("is_active", true);
    return scope === "both" ? query : query.in("category", categorySlugs);
  };

  const { data: premiumListings = [] } = useQuery({
    queryKey: ["listings-premium", scope, scopeKey, hpSettings.homepage_premium_count],
    enabled: ready && hpSettings.homepage_premium_count > 0,
    queryFn: async () => {
      if (scope !== "both" && categorySlugs.length === 0) return [];
      const { data, error } = await scopedQuery().eq("is_premium", true)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(hpSettings.homepage_premium_count);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: urgentListings = [] } = useQuery({
    queryKey: ["listings-urgent", scope, scopeKey, hpSettings.homepage_urgent_count],
    enabled: ready && hpSettings.homepage_urgent_count > 0,
    queryFn: async () => {
      if (scope !== "both" && categorySlugs.length === 0) return [];
      const { data, error } = await scopedQuery().eq("is_urgent", true)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(hpSettings.homepage_urgent_count);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: newPages, isLoading: listingsLoading, isError, hasNextPage: hasMore,
    isFetchingNextPage: loadingMore, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["listings-new", scope, scopeKey, hpSettings.homepage_new_count],
    enabled: ready && hpSettings.homepage_new_count > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (scope !== "both" && categorySlugs.length === 0) return [];
      const { data, error } = await scopedQuery()
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(pageParam, pageParam + hpSettings.homepage_new_count - 1);
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === hpSettings.homepage_new_count
      ? pages.reduce((count, page) => count + page.length, 0) : undefined,
  });
  const isLoading = scopeLoading || (hpSettings.homepage_new_count > 0 && listingsLoading);
  const loadMore = useCallback(() => {
    if (!isError && !loadingMore && hasMore) void fetchNextPage();
  }, [isError, loadingMore, hasMore, fetchNextPage]);

  // Auto-load with IntersectionObserver
  useEffect(() => {
    if (!hpSettings.homepage_auto_load || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hpSettings.homepage_auto_load, loadMore, isLoading]);

  // Collect all store IDs and fetch stores (dedupe by id as safety)
  const displayNewListings = Array.from(new Map((newPages?.pages.flat() || []).map(l => [l.id, l])).values());
  const allListings = [...premiumListings, ...urgentListings, ...displayNewListings];
  const storeIds = [...new Set(allListings.map(l => l.store_id).filter(Boolean))] as string[];

  const { data: storesMap = {} } = useQuery({
    queryKey: ["stores-map", storeIds.join(",")],
    queryFn: async () => {
      if (storeIds.length === 0) return {};
      const { data } = await supabase.from("stores").select("id, name, logo_url").in("id", storeIds);
      const map: Record<string, { name: string; logo_url: string | null }> = {};
      data?.forEach(s => { map[s.id] = { name: s.name, logo_url: s.logo_url }; });
      return map;
    },
    enabled: storeIds.length > 0,
  });

  const renderSection = (
    title: string, subtitle: string, icon: React.ReactNode,
    listings: any[], bgClass?: string, showAll?: boolean, showLoadMore?: boolean,
  ) => {
    if (listings.length === 0 && !showLoadMore) return null;
    return (
      <section className={`py-8 md:py-12 ${bgClass || ""}`}>
        <div className="container mx-auto px-4">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {icon}
              <div>
                <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{title}</h2>
                <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>
              </div>
            </div>
            {showAll && (
              <Button variant="link" onClick={() => navigate("/products")} className="h-auto px-0 text-sm">
                {t("common.view_all", { defaultValue: language === "ru" ? "Все объявления" : "Hamısına bax" })}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((l: any) => {
              const s = l.store_id ? storesMap[l.store_id] : undefined;
              return (
                <ListingCard
                  key={l.id}
                  id={l.id}
                  title={l.title}
                  price={`${Number(l.price).toLocaleString()} ${l.currency}`}
                  location={l.location}
                  time={formatRelative(l.created_at)}
                  image={l.image_urls?.[0] || "/placeholder.svg"}
                  images={l.image_urls || []}
                  condition={l.condition}
                  isPremium={l.is_premium}
                  isUrgent={l.is_urgent}
                  isBuyable={l.is_buyable}
                  numericPrice={Number(l.price)} currency={l.currency} userId={l.user_id} customFields={l.custom_fields}
                  storeId={l.store_id}
                  storeName={s?.name}
                  storeLogo={s?.logo_url}
                  imageSlider={hpSettings.homepage_image_slider}
                />
              );
            })}
          </div>
          {showLoadMore && !isError && !scopeError && listings.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground" role="status">
              <Search className="h-8 w-8" />
              <p className="text-sm">{language === "ru" ? "В этом разделе пока нет объявлений" : "Bu bölmədə hələ elan yoxdur"}</p>
            </div>
          )}
          {showLoadMore && (isError || scopeError) && (
            <div role="alert" className="flex flex-wrap items-center justify-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">{language === "ru" ? "Не удалось загрузить объявления" : "Elanları yükləmək mümkün olmadı"}</p>
              <Button variant="outline" onClick={() => { void (scopeError ? refetchScope() : refetch()); }}>{language === "ru" ? "Повторить" : "Yenidən cəhd et"}</Button>
            </div>
          )}
          {showLoadMore && hasMore && (
            <div className="mt-6 flex justify-center">
              {hpSettings.homepage_auto_load && !isError ? (
                <div ref={sentinelRef}>
                  {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("home.load_more", { defaultValue: language === "ru" ? "Показать ещё" : "Daha çox göstər" })}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  if (isLoading) {
    return (
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div>
      {renderSection(t("home.premium_title", { defaultValue: language === "ru" ? "Премиум объявления" : "Premium elanlar" }), t("home.premium_subtitle", { defaultValue: "" }), <Crown className="h-6 w-6 text-primary" />, premiumListings)}
      {renderSection(t("home.urgent_title", { defaultValue: language === "ru" ? "Срочные объявления" : "Təcili elanlar" }), t("home.urgent_subtitle", { defaultValue: "" }), <Zap className="h-6 w-6 text-destructive" />, urgentListings)}
      {hpSettings.homepage_new_count > 0 && renderSection(t("home.latest_title", { defaultValue: language === "ru" ? "Последние объявления" : "Son elanlar" }), t("home.latest_subtitle", { defaultValue: "" }), <Clock className="h-6 w-6 text-primary" />, displayNewListings, "bg-muted/50", true, true)}
    </div>
  );
};

export default FeaturedListings;
