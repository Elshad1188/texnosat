import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Navigation } from "lucide-react";

const HomeMiniMap = () => {
  const navigate = useNavigate();

  const { data: totalCount = 0, isLoading } = useQuery({
    queryKey: ["homepage-map-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/products?view=map")}
        className="group w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-accent/20 p-5 md:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.99] text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MapPin className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary mb-1">
              <Navigation className="h-3 w-3" />
              Canlı Xəritə
            </div>
            <h3 className="text-base md:text-lg font-bold text-foreground truncate">
              Xəritə ilə Axtarış
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {isLoading ? "..." : <><span className="font-semibold text-primary">{totalCount}</span> aktiv elan xəritədə</>}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
        </div>
      </button>
    </div>
  );
};

export default HomeMiniMap;
