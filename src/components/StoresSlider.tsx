import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";
import StoreCard from "./StoreCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useListingScope } from "@/hooks/useListingScope";
import { listingMatchesScope } from "@/lib/listingScope";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

const StoresSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { scope, categoryMap, isLoading: scopeLoading } = useListingScope();
  const slugs = Object.keys(categoryMap).filter(c => listingMatchesScope(c, categoryMap, scope));

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-home", scope, slugs.join(",")],
    enabled: !scopeLoading,
    queryFn: async () => {
      if (scope !== "both" && slugs.length === 0) return [];
      let listingsQuery = supabase.from("listings").select("store_id").eq("is_active", true).not("store_id", "is", null);
      if (scope !== "both") listingsQuery = listingsQuery.in("category", slugs);
      const { data: listings, error: listingsError } = await listingsQuery;
      if (listingsError) throw listingsError;
      const ids = [...new Set((listings || []).flatMap(l => l.store_id ? [l.store_id] : []))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url, cover_url, city, is_premium")
        .eq("status", "approved")
        .in("id", ids)
        .order("is_premium", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
  });

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[260px] w-56 flex-shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stores.length === 0) return null;

  return (
    <section className="py-10 bg-gradient-to-b from-transparent to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">{t("home.stores_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("home.stores_subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={language === "ru" ? "Назад" : "Əvvəlki"}
                onClick={() => scroll("left")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted transition-all active:scale-90"
              >
                <ChevronLeft className="h-5 w-5 text-foreground/70" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={language === "ru" ? "Вперёд" : "Növbəti"}
                onClick={() => scroll("right")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted transition-all active:scale-90"
              >
                <ChevronRight className="h-5 w-5 text-foreground/70" />
              </Button>
            </div>
            <Link
              to="/stores"
              className="group flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-all"
            >
              {t("common.all_short")} 
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-6 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="mx-auto flex w-max gap-4">
          {stores.map((store: any) => (
            <StoreCard
              key={store.id}
              id={store.id}
              name={store.name}
              logo_url={store.logo_url}
              cover_url={store.cover_url}
              city={store.city}
              is_premium={store.is_premium}
              className="w-56 shrink-0"
            />
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoresSlider;

