import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingBoostDialog from "@/components/ListingBoostDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  Store, Package, Users, Eye, Crown, Edit2, Plus, Trash2,
  MapPin, Phone, Clock, TrendingUp, Loader2, BarChart3, Rocket
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const StoreDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["store-dashboard-listings", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings").select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["store-followers", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_followers").select("id, user_id, created_at")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: followerProfiles = [] } = useQuery({
    queryKey: ["follower-profiles", followers.map(f => f.user_id)],
    queryFn: async () => {
      if (followers.length === 0) return [];
      const { data } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url, city")
        .in("user_id", followers.map(f => f.user_id));
      return data || [];
    },
    enabled: followers.length > 0,
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-dashboard-listings"] });
      toast({ title: "Elan silindi" });
    },
  });

  const toggleListing = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("listings").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-dashboard-listings"] });
      toast({ title: "Elan yeniləndi" });
    },
  });

  if (!user) { navigate("/auth"); return null; }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center py-32 text-center px-4">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Hələ mağazanız yoxdur</h1>
          <p className="mt-2 text-sm text-muted-foreground">Mağaza yaradın və elanlarınızı bir yerdə idarə edin</p>
          <Button className="mt-6 bg-gradient-primary text-primary-foreground" asChild>
            <Link to="/create-store">Mağaza yarat</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);
  const activeCount = listings.filter(l => l.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Store Header */}
        <Card className="mb-6 overflow-hidden">
          {store.cover_url && <img src={store.cover_url} alt="" className="h-32 w-full object-cover" />}
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <Avatar className="h-16 w-16 border-2 border-card shadow">
              <AvatarImage src={store.logo_url || ""} />
              <AvatarFallback className="bg-secondary font-bold text-lg">{store.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
                {store.is_premium && (
                  <Badge className="gap-1 bg-gradient-primary text-primary-foreground text-[10px]">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {store.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{store.city}</span>}
                {store.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{store.phone}</span>}
                {store.working_hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{store.working_hours}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to="/create-store"><Edit2 className="h-3.5 w-3.5" />Redaktə</Link>
              </Button>
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to={`/store/${store.id}`}><Eye className="h-3.5 w-3.5" />Bax</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Elanlar", value: listings.length, icon: Package },
            { label: "Aktiv", value: activeCount, icon: TrendingUp },
            { label: "Baxış", value: totalViews, icon: BarChart3 },
            { label: "Abunəçi", value: followers.length, icon: Users },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="listings" className="gap-1 text-xs sm:text-sm"><Package className="h-3.5 w-3.5" />Elanlar</TabsTrigger>
            <TabsTrigger value="followers" className="gap-1 text-xs sm:text-sm"><Users className="h-3.5 w-3.5" />Abunəçilər</TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Mağaza elanları</h2>
              <Button size="sm" className="gap-1 bg-gradient-primary text-primary-foreground" asChild>
                <Link to="/create-listing"><Plus className="h-3.5 w-3.5" />Elan əlavə et</Link>
              </Button>
            </div>
            {listings.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">Mağazada hələ elan yoxdur</p>
                  <Button size="sm" className="mt-4 bg-gradient-primary text-primary-foreground" asChild>
                    <Link to="/create-listing">İlk elanı yerləşdir</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {listings.map((l) => (
                  <Card key={l.id} className="overflow-hidden">
                    <CardContent className="flex items-center gap-3 p-3">
                      <Link to={`/product/${l.id}`} className="shrink-0">
                        {l.image_urls?.[0] ? (
                          <img src={l.image_urls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${l.id}`} className="text-sm font-semibold text-foreground hover:text-primary line-clamp-1">
                          {l.title}
                        </Link>
                        <p className="text-sm font-bold text-primary">{l.price} {l.currency}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{l.views_count}</span>
                          <Badge variant={l.is_active ? "default" : "secondary"} className="text-[9px] h-4">
                            {l.is_active ? "Aktiv" : "Deaktiv"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                          onClick={() => toggleListing.mutate({ id: l.id, is_active: !l.is_active })}>
                          <Eye className={`h-4 w-4 ${l.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Elanı silmək istəyirsiniz?</AlertDialogTitle>
                              <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteListing.mutate(l.id)}>Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers">
            {followers.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">Hələ abunəçiniz yoxdur</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {followers.map((f) => {
                  const profile = followerProfiles.find(p => p.user_id === f.user_id);
                  return (
                    <Card key={f.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-secondary text-xs font-bold">
                            {(profile?.full_name || "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {profile?.full_name || "İstifadəçi"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {profile?.city && <span>{profile.city} · </span>}
                            {new Date(f.created_at).toLocaleDateString("az-AZ")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default StoreDashboard;
