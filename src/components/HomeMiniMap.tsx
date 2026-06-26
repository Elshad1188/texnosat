import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Navigation } from "lucide-react";

import { lazy, Suspense } from "react";
import { useTranslation } from "@/contexts/LanguageContext";

// Lazy load ListingsMap to avoid heavy bundle overhead on initial load
const ListingsMap = lazy(() =>
  import("./ListingsMap").then((module) => ({ default: module.default }))
);

const HomeMiniMap = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch all active listings with coordinates/location to show on map and count
  const { data: mapListings = [], isLoading } = useQuery({
    queryKey: ["homepage-map-listings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, currency, location, latitude, longitude")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const totalCount = mapListings.length;

  // We can pass a subset or all of them to the mini map to keep it responsive
  const previewListings = mapListings.slice(0, 100);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Text Info Section */}
          <div className="p-6 md:p-8 flex flex-col justify-between md:col-span-4 bg-gradient-to-br from-card to-accent/20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4 animate-pulse">
                <Navigation className="h-3 w-3" />
                <span>{t ? "Canlı Xəritə" : "Canlı Xəritə"}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t ? "Xəritə ilə Axtarış" : "Xəritə ilə Axtarış"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t 
                  ? "Bölgənizdəki ən uyğun elanları xəritə üzərində rahatlıqla tapın. Qiymətləri, yerləşməni və detalları anında görün."
                  : "Bölgənizdəki ən uyğun elanları xəritə üzərində rahatlıqla tapın. Qiymətləri, yerləşməni və detalları anında görün."
                }
              </p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-primary tracking-tight">
                  {isLoading ? "..." : totalCount}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t ? "aktiv elan xəritədə" : "aktiv elan xəritədə"}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/products?view=map")}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-95"
            >
              <MapPin className="h-4 w-4" />
              <span>{t ? "Xəritədə Bax" : "Xəritədə Bax"}</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>

          {/* Map Preview Section */}
          <div className="relative h-[250px] md:h-auto md:col-span-8 bg-muted overflow-hidden min-h-[250px] md:min-h-[350px]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-accent/10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                }
              >
                <div className="absolute inset-0 h-full w-full">
                  <ListingsMap listings={previewListings} height="100%" />
                </div>
              </Suspense>
            )}
            
            {/* Clickable Overlay to go to Full Map */}
            <div 
              onClick={() => navigate("/products?view=map")}
              className="absolute inset-0 bg-transparent cursor-pointer z-10 transition-colors hover:bg-black/5 flex items-center justify-center group"
              title="Tam ekranda xəritəni aç"
            >
              <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-md text-xs font-medium text-foreground transition-all duration-300 transform translate-y-0 group-hover:-translate-y-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {t ? "Tam ekranda aç" : "Tam ekranda aç"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeMiniMap;