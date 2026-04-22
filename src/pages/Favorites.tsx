import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Package, MapPin, Trash2, Crown, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";

const Favorites = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id, listing_id, created_at, listings(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const removeFavorite = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast({ title: t("detail.remove_favorite_success") });
    },
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t("favorites.title")}</h1>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Heart className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">{t("favorites.empty_title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("favorites.empty_desc")}</p>
              <Button className="mt-6 bg-gradient-primary text-primary-foreground" asChild>
                <Link to="/products">{t("favorites.view_listings")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav: any) => {
              const l = fav.listings;
              if (!l) return null;
              return (
                <Card key={fav.id} className="overflow-hidden transition-shadow hover:shadow-card-hover">
                  <Link to={`/product/${l.id}`}>
                    {l.image_urls?.[0] ? (
                      <img src={l.image_urls[0]} alt={l.title} className="h-44 w-full object-cover" />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-muted">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                  </Link>
                  <CardContent className="p-4">
                    <Link to={`/product/${l.id}`} className="font-semibold text-foreground hover:text-primary line-clamp-1">
                      {l.title}
                    </Link>
                    <p className="mt-1 text-lg font-bold text-primary">{l.price} {l.currency}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{l.location}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFavorite.mutate(fav.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {l.is_premium && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/90 shadow-sm">
                          <Crown className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {l.is_urgent && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 shadow-sm">
                          <Zap className="h-3 w-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
