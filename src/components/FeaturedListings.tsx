import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "./ListingCard";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedListings = () => {
  const navigate = useNavigate();

  const { data: premiumListings = [] } = useQuery({
    queryKey: ["listings-premium"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true).eq("is_premium", true)
        .order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
  });

  const { data: urgentListings = [] } = useQuery({
    queryKey: ["listings-urgent"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true).eq("is_urgent", true)
        .order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
  });

  const { data: newListings = [], isLoading } = useQuery({
    queryKey: ["listings-new"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  // Collect all store IDs and fetch stores
  const allListings = [...premiumListings, ...urgentListings, ...newListings];
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
    listings: any[], bgClass?: string, showAll?: boolean,
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
      {renderSection("Son elanlar", "Ən yeni elanlar", <Clock className="h-6 w-6 text-primary" />, newListings, "bg-muted/50", true)}
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
