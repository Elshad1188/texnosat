import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, Trash2, Eye, EyeOff, Search, Users, ShoppingBag, Store,
  Crown, Loader2, AlertTriangle,
} from "lucide-react";

interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  location: string;
  is_active: boolean;
  is_premium: boolean;
  is_urgent: boolean;
  created_at: string;
  user_id: string;
  views_count: number;
  image_urls: string[] | null;
}

interface StoreItem {
  id: string;
  name: string;
  city: string | null;
  is_premium: boolean;
  user_id: string;
  created_at: string;
  logo_url: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  city: string | null;
  phone: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [listingsRes, storesRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("stores").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (listingsRes.data) setListings(listingsRes.data);
    if (storesRes.data) setStores(storesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
    setLoading(false);
  };

  const toggleListingActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("listings").update({ is_active: !current }).eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: !current } : l)));
    toast({ title: !current ? "Elan aktivləşdirildi" : "Elan deaktiv edildi" });
  };

  const toggleListingPremium = async (id: string, current: boolean) => {
    const { error } = await supabase.from("listings").update({ is_premium: !current }).eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, is_premium: !current } : l)));
    toast({ title: !current ? "Premium edildi" : "Premium silindi" });
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Elan silindi" });
  };

  const toggleStorePremium = async (id: string, current: boolean) => {
    const { error } = await supabase.from("stores").update({ is_premium: !current }).eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, is_premium: !current } : s)));
    toast({ title: !current ? "Mağaza premium edildi" : "Premium silindi" });
  };

  const deleteStore = async (id: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Mağaza silindi" });
  };

  const toggleAdminRole = async (userId: string) => {
    const hasAdmin = userRoles.some((r) => r.user_id === userId && r.role === "admin");
    if (hasAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      setUserRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === "admin")));
      toast({ title: "Admin rolu silindi" });
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      setUserRoles((prev) => [...prev, { user_id: userId, role: "admin" }]);
      toast({ title: "Admin rolu verildi" });
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredListings = listings.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProfiles = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Elanlar" value={listings.length} />
          <StatCard icon={<Store className="h-5 w-5" />} label="Mağazalar" value={stores.length} />
          <StatCard icon={<Users className="h-5 w-5" />} label="İstifadəçilər" value={profiles.length} />
          <StatCard icon={<Crown className="h-5 w-5" />} label="Premium elanlar" value={listings.filter((l) => l.is_premium).length} />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="listings" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> Elanlar ({listings.length})
            </TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5">
              <Store className="h-4 w-4" /> Mağazalar ({stores.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" /> İstifadəçilər ({profiles.length})
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {loading ? (
              <LoadingState />
            ) : filteredListings.length === 0 ? (
              <EmptyState text="Elan tapılmadı" />
            ) : (
              <div className="space-y-3">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {listing.image_urls?.[0] ? (
                        <img src={listing.image_urls[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{listing.title}</h3>
                        {listing.is_premium && <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">Premium</Badge>}
                        {!listing.is_active && <Badge variant="secondary" className="text-[10px]">Deaktiv</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {listing.price} ₼ · {listing.location} · {listing.views_count} baxış · {new Date(listing.created_at).toLocaleDateString("az")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleListingActive(listing.id, listing.is_active)} title={listing.is_active ? "Deaktiv et" : "Aktivləşdir"}>
                        {listing.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleListingPremium(listing.id, listing.is_premium)} title={listing.is_premium ? "Premium sil" : "Premium et"}>
                        <Crown className={`h-4 w-4 ${listing.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteListing(listing.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores">
            {loading ? (
              <LoadingState />
            ) : filteredStores.length === 0 ? (
              <EmptyState text="Mağaza tapılmadı" />
            ) : (
              <div className="space-y-3">
                {filteredStores.map((store) => (
                  <div key={store.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{store.name}</h3>
                        {store.is_premium && <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">Premium</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {store.city || "—"} · {new Date(store.created_at).toLocaleDateString("az")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleStorePremium(store.id, store.is_premium)}>
                        <Crown className={`h-4 w-4 ${store.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteStore(store.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            {loading ? (
              <LoadingState />
            ) : filteredProfiles.length === 0 ? (
              <EmptyState text="İstifadəçi tapılmadı" />
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((profile) => {
                  const isUserAdmin = userRoles.some((r) => r.user_id === profile.user_id && r.role === "admin");
                  const isSelf = profile.user_id === user?.id;
                  return (
                    <div key={profile.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {(profile.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-foreground">{profile.full_name || "Adsız"}</h3>
                          {isUserAdmin && <Badge className="bg-primary/20 text-primary text-[10px]">Admin</Badge>}
                          {isSelf && <Badge variant="outline" className="text-[10px]">Siz</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {profile.city || "—"} · {profile.phone || "—"} · {new Date(profile.created_at).toLocaleDateString("az")}
                        </p>
                      </div>
                      {!isSelf && (
                        <Button
                          variant={isUserAdmin ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleAdminRole(profile.user_id)}
                          className="text-xs"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          {isUserAdmin ? "Admin sil" : "Admin et"}
                        </Button>
                      )}
                    </div>
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

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-card">
    <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
    <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-12 text-center">
    <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AdminPanel;
