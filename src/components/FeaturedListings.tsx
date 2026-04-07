import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "./ListingCard";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback, useRef } from "react";

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
  const [newOffset, setNewOffset] = useState(0);
  const [allNewListings, setAllNewListings] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: hpSettings = defaultSettings } = useQuery({
    queryKey: ["homepage-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      const v = data?.value as any;
      return {
        homepage_premium_count: v?.homepage_premium_count ?? 4,
        homepage_urgent_count: v?.homepage_urgent_count ?? 4,
        homepage_new_count: v?.homepage_new_count ?? 8,
        homepage_auto_load: v?.homepage_auto_load ?? false,
      };
    },
    staleTime: 60000,
  });

  const { data: premiumListings = [] } = useQuery({
    queryKey: ["listings-premium", hpSettings.homepage_premium_count],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true).eq("is_premium", true)
        .order("created_at", { ascending: false }).limit(hpSettings.homepage_premium_count);
      return data || [];
    },
  });

  const { data: urgentListings = [] } = useQuery({
    queryKey: ["listings-urgent", hpSettings.homepage_urgent_count],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true).eq("is_urgent", true)
        .order("created_at", { ascending: false }).limit(hpSettings.homepage_urgent_count);
      return data || [];
    },
  });

  const { data: newListings = [], isLoading } = useQuery({
    queryKey: ["listings-new", hpSettings.homepage_new_count],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }).limit(hpSettings.homepage_new_count);
      return data || [];
    },
  });

  // Initialize allNewListings when first batch loads
  useEffect(() => {
    if (newListings.length > 0) {
      setAllNewListings(newListings);
      setNewOffset(newListings.length);
      setHasMore(newListings.length >= hpSettings.homepage_new_count);
    }
  }, [newListings, hpSettings.homepage_new_count]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await supabase.from("listings").select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(newOffset, newOffset + hpSettings.homepage_new_count - 1);
    if (data && data.length > 0) {
      setAllNewListings(prev => [...prev, ...data]);
      setNewOffset(prev => prev + data.length);
      setHasMore(data.length >= hpSettings.homepage_new_count);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, newOffset, hpSettings.homepage_new_count]);

  // Auto-load with IntersectionObserver
  useEffect(() => {
    if (!hpSettings.homepage_auto_load || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hpSettings.homepage_auto_load, loadMore]);

  // Collect all store IDs and fetch stores
  const displayNewListings = allNewListings.length > 0 ? allNewListings : newListings;
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
    if (listings.length === 0) return null;
    return (
      <section className={`py-8 md:py-12 ${bgClass || ""}`}>
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {icon}
              <div>
                <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{title}</h2>
                <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>
              </div>
            </div>
            {showAll && (
              <button onClick={() => navigate("/products")} className="text-sm font-medium text-primary hover:underline">
                Hamısına bax →
              </button>
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
                  time={formatTime(l.created_at)}
                  image={l.image_urls?.[0] || "/placeholder.svg"}
                  condition={l.condition}
                  isPremium={l.is_premium}
                  isUrgent={l.is_urgent}
                  storeId={l.store_id}
                  storeName={s?.name}
                  storeLogo={s?.logo_url}
                />
              );
            })}
          </div>
          {showLoadMore && hasMore && (
            <div className="mt-6 flex justify-center">
              {hpSettings.homepage_auto_load ? (
                <div ref={sentinelRef}>
                  {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                </div>
              ) : (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Daha çox göstər
                </button>
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
      {renderSection("Premium elanlar", "Seçilmiş yüksək keyfiyyətli elanlar", <Crown className="h-6 w-6 text-amber-500" />, premiumListings)}
      {renderSection("Təcili elanlar", "Tez satılmalı məhsullar", <Zap className="h-6 w-6 text-destructive" />, urgentListings)}
      {renderSection("Son elanlar", "Ən yeni elanlar", <Clock className="h-6 w-6 text-primary" />, displayNewListings, "bg-muted/50", true, true)}
    </div>
  );
};

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Az əvvəl";
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(dateStr).toLocaleDateString("az");
}

export default FeaturedListings;
