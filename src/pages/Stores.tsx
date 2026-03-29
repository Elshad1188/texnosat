import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search, Store } from "lucide-react";
import StoreCard from "@/components/StoreCard";

const Stores = () => {
  const [search, setSearch] = useState("");

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("status", "approved")
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: listingCounts = {} } = useQuery({
    queryKey: ["store-listing-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("store_id")
        .eq("is_active", true)
        .not("store_id", "is", null);
      const counts: Record<string, number> = {};
      data?.forEach((l) => {
        if (l.store_id) counts[l.store_id] = (counts[l.store_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Mağazalar</h1>
            <p className="text-sm text-muted-foreground">Texnosat platformasındakı rəsmi satıcılar</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Mağaza axtar..."
              className="pl-9 h-11 rounded-xl bg-card border-border transition-all focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-4">
              <Store className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-medium text-foreground">Mağaza tapılmadı</p>
            <p className="text-sm text-muted-foreground mt-1">Başqa bir axtarış sözü yoxlayın</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((store) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                logo_url={store.logo_url}
                cover_url={store.cover_url}
                city={store.city}
                is_premium={store.is_premium}
                listingCount={listingCounts[store.id] || 0}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Stores;
