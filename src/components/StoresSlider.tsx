import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Store, ChevronLeft, ChevronRight, Star } from "lucide-react";
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
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
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
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-44 flex-shrink-0 rounded-2xl" />
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
              Hamısı <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {stores.map((store: any) => (
            <button
              key={store.id}
              onClick={() => navigate(`/store/${store.id}`)}
              className="group flex flex-shrink-0 w-44 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Logo box */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-6 w-6 text-muted-foreground/60" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-semibold text-foreground leading-tight">
                    {store.name}
                  </p>
                  {store.is_premium && (
                    <Star className="h-3 w-3 shrink-0 text-amber-500 fill-amber-500" />
                  )}
                </div>
                {store.city && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{store.city}</p>
                )}
                <p className="mt-1 text-[10px] font-medium text-primary">Mağazaya keç →</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoresSlider;
