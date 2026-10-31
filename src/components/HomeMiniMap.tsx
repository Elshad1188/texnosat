import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useListingScope } from "@/hooks/useListingScope";
import { listingMatchesScope } from "@/lib/listingScope";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";

const HomeMiniMap = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ru = language === "ru";
  const { scope, categoryMap, isLoading: scopeLoading, isError: scopeError } = useListingScope();
  const slugs = Object.keys(categoryMap).filter(c => listingMatchesScope(c, categoryMap, scope));

  const { data: totalCount = 0, isLoading, isError } = useQuery({
    queryKey: ["homepage-map-count", scope, slugs.join(",")],
    enabled: !scopeLoading && !scopeError,
    queryFn: async () => {
      if (scope !== "both" && slugs.length === 0) return 0;
      let query = supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (scope !== "both") query = query.in("category", slugs);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <MapPin className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{ru ? "Поиск на карте" : "Xəritə ilə axtarış"}</h2>
            <p className="text-xs text-muted-foreground">{scopeError || isError ? (ru ? "Не удалось загрузить данные" : "Məlumatları yükləmək mümkün olmadı") : isLoading || scopeLoading ? "…" : `${totalCount} ${ru ? "активных объявлений" : "aktiv elan"}`}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => navigate("/products?view=map")} aria-label={ru ? "Открыть карту" : "Xəritəni aç"} className="shrink-0 text-primary">
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default HomeMiniMap;
