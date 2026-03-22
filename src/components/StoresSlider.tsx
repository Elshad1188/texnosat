import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Store, ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";

const StoresSlider = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, logo_url, city, is_premium")
        .eq("status", "approved")
        .order("is_premium", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-32 flex-shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stores.length === 0) return null;

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Mağazalar</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop scroll arrows */}
            <div className="hidden md:flex gap-1">
              <button
                onClick={() => scroll("left")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-foreground/70" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-foreground/70" />
              </button>
            </div>
            <button
              onClick={() => navigate("/stores")}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Hamısı <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {stores.map((store: any) => (
            <button
              key={store.id}
              onClick={() => navigate(`/store/${store.id}`)}
              className="group flex flex-col items-center gap-2.5 flex-shrink-0 w-28"
            >
              {/* Logo circle */}
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-card shadow-md transition-all group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-lg">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Store className="h-8 w-8 text-primary/60" />
                  </div>
                )}
                {store.is_premium && (
                  <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow">
                    ★
                  </div>
                )}
              </div>
              {/* Name */}
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground">
                {store.name}
              </span>
              {store.city && (
                <span className="text-[10px] text-muted-foreground -mt-1">{store.city}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoresSlider;
