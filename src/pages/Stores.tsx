import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Store, MapPin, Crown, Package } from "lucide-react";

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
            <h1 className="font-display text-2xl font-bold text-foreground">Mağazalar</h1>
            <p className="text-sm text-muted-foreground">Bütün rəsmi mağazalar</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Mağaza axtar..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">Mağaza tapılmadı</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((store) => (
              <Link
                key={store.id}
                to={`/store/${store.id}`}
                className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Cover / Çardağ */}
                <div className="relative h-28 bg-gradient-to-br from-primary/20 to-primary/5">
                  {store.cover_url && (
                    <img
                      src={store.cover_url}
                      alt="Cover"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {store.is_premium && (
                    <Badge className="absolute right-2 top-2 gap-1 bg-gradient-primary text-primary-foreground">
                      <Crown className="h-3 w-3" /> Premium
                    </Badge>
                  )}
                </div>

                {/* Logo & Info */}
                <div className="relative px-4 pb-4">
                  <div className="-mt-8 mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted shadow-md">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>

                  {store.city && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {store.city}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{listingCounts[store.id] || 0} elan</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Stores;
