import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";
import StoreCard from "./StoreCard";

const StoresSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, logo_url, cover_url, city, is_premium")
        .eq("status", "approved")
        .order("is_premium", { ascending: false })
        .limit(15);
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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Mağazalar</h2>
              <p className="text-xs text-muted-foreground">Premium və seçilmiş mağazalar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => scroll("left")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted transition-all active:scale-90"
              >
                <ChevronLeft className="h-5 w-5 text-foreground/70" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted transition-all active:scale-90"
              >
                <ChevronRight className="h-5 w-5 text-foreground/70" />
              </button>
            </div>
            <a
              href="/stores"
              className="group flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-all"
            >
              Hamısı 
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 mask-fade-edges"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
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
    </section>
  );
};

export default StoresSlider;

