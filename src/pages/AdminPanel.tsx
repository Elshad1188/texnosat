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
import { Switch } from "@/components/ui/switch";
import AdminCategoryManager from "@/components/admin/AdminCategoryManager";
import AdminRegionManager from "@/components/admin/AdminRegionManager";
import {
  ShieldCheck, Trash2, Eye, EyeOff, Search, Users, ShoppingBag, Store,
  Crown, Loader2, AlertTriangle, Zap, Star, MapPin, Pencil, MessageSquare,
  FolderTree, Map,
} from "lucide-react";

interface Listing {
  id: string; title: string; price: number; category: string; location: string;
  is_active: boolean; is_premium: boolean; is_urgent: boolean; created_at: string;
  user_id: string; views_count: number; image_urls: string[] | null; condition: string;
  description: string | null;
}

interface StoreItem {
  id: string; name: string; city: string | null; is_premium: boolean;
  user_id: string; created_at: string; logo_url: string | null;
}

interface Profile {
  id: string; user_id: string; full_name: string | null;
  city: string | null; phone: string | null; created_at: string;
}

interface UserRole { user_id: string; role: string; }

interface Review {
  id: string; reviewer_id: string; reviewed_user_id: string;
  listing_id: string | null; rating: number; comment: string | null; created_at: string;
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { if (!adminLoading && !isAdmin) navigate("/"); }, [isAdmin, adminLoading, navigate]);
  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [l, s, p, r, rev] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("stores").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    if (l.data) setListings(l.data);
    if (s.data) setStores(s.data);
    if (p.data) setProfiles(p.data);
    if (r.data) setUserRoles(r.data as UserRole[]);
    if (rev.data) setReviews(rev.data as Review[]);
    setLoading(false);
  };

  // Listing actions
  const updateListing = async (id: string, updates: Partial<Listing>) => {
    const { error } = await supabase.from("listings").update(updates).eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    toast({ title: "Elan yeniləndi" });
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Elan silindi" });
  };

  // Store actions
  const updateStore = async (id: string, updates: Partial<StoreItem>) => {
    const { error } = await supabase.from("stores").update(updates).eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    toast({ title: "Mağaza yeniləndi" });
  };

  const deleteStore = async (id: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Mağaza silindi" });
  };

  // Role actions
  const toggleRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const has = userRoles.some((r) => r.user_id === userId && r.role === role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      setUserRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === role)));
    } else {
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role }]);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      setUserRoles((prev) => [...prev, { user_id: userId, role }]);
    }
    toast({ title: has ? `${role} rolu silindi` : `${role} rolu verildi` });
  };

  // Review actions
  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Rəy silindi" });
  };

  const getUserLevel = (userId: string) => {
    const userReviews = reviews.filter((r) => r.reviewed_user_id === userId);
    const count = userReviews.length;
    const avg = count > 0 ? userReviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    if (count >= 25 && avg >= 4) return { label: "VIP Satıcı", color: "bg-amber-500/20 text-amber-600" };
    if (count >= 10 && avg >= 3.5) return { label: "Etibarlı", color: "bg-green-500/20 text-green-600" };
    if (count >= 3) return { label: "Aktiv", color: "bg-blue-500/20 text-blue-600" };
    return { label: "Yeni", color: "bg-muted text-muted-foreground" };
  };

  const getProfileName = (userId: string) => profiles.find((p) => p.user_id === userId)?.full_name || "Adsız";

  if (adminLoading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const q = searchQuery.toLowerCase();
  const fListings = listings.filter((l) => l.title.toLowerCase().includes(q));
  const fStores = stores.filter((s) => s.name.toLowerCase().includes(q));
  const fProfiles = profiles.filter((p) => (p.full_name || "").toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Elanlar" value={listings.length} />
          <StatCard icon={<Eye className="h-5 w-5" />} label="Aktiv" value={listings.filter((l) => l.is_active).length} />
          <StatCard icon={<Crown className="h-5 w-5" />} label="Premium" value={listings.filter((l) => l.is_premium).length} />
          <StatCard icon={<Store className="h-5 w-5" />} label="Mağazalar" value={stores.length} />
          <StatCard icon={<Users className="h-5 w-5" />} label="İstifadəçilər" value={profiles.length} />
          <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Rəylər" value={reviews.length} />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Axtar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="mb-4 w-full flex-wrap justify-start">
            <TabsTrigger value="listings" className="gap-1.5"><ShoppingBag className="h-4 w-4" /> Elanlar</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><FolderTree className="h-4 w-4" /> Kateqoriyalar</TabsTrigger>
            <TabsTrigger value="regions" className="gap-1.5"><Map className="h-4 w-4" /> Bölgələr</TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5"><Store className="h-4 w-4" /> Mağazalar</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> İstifadəçilər</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Rəylər</TabsTrigger>
          </TabsList>

          {/* Listings */}
          <TabsContent value="listings">
            {loading ? <LoadingState /> : fListings.length === 0 ? <EmptyState text="Elan tapılmadı" /> : (
              <div className="space-y-2">
                {fListings.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {l.image_urls?.[0] ? <img src={l.image_urls[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><ShoppingBag className="h-4 w-4 text-muted-foreground" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-foreground">{l.title}</h3>
                        {l.is_premium && <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[10px]">Premium</Badge>}
                        {l.is_urgent && <Badge variant="destructive" className="text-[10px]">Təcili</Badge>}
                        {!l.is_active && <Badge variant="secondary" className="text-[10px]">Deaktiv</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{l.price} ₼ · {l.location} · {l.category} · {l.views_count} baxış · {new Date(l.created_at).toLocaleDateString("az")}</p>
                      <p className="text-xs text-muted-foreground">Satıcı: {getProfileName(l.user_id)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_active: !l.is_active })} title={l.is_active ? "Deaktiv et" : "Aktivləşdir"}>
                        {l.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_premium: !l.is_premium })} title="Premium">
                        <Crown className={`h-4 w-4 ${l.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_urgent: !l.is_urgent })} title="Təcili">
                        <Zap className={`h-4 w-4 ${l.is_urgent ? "text-destructive" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteListing(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories"><AdminCategoryManager /></TabsContent>

          {/* Regions */}
          <TabsContent value="regions"><AdminRegionManager /></TabsContent>

          {/* Stores */}
          <TabsContent value="stores">
            {loading ? <LoadingState /> : fStores.length === 0 ? <EmptyState text="Mağaza tapılmadı" /> : (
              <div className="space-y-2">
                {fStores.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {s.logo_url ? <img src={s.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Store className="h-4 w-4 text-muted-foreground" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                        {s.is_premium && <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[10px]">Premium</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.city || "—"} · Sahibi: {getProfileName(s.user_id)} · {new Date(s.created_at).toLocaleDateString("az")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateStore(s.id, { is_premium: !s.is_premium })}>
                        <Crown className={`h-4 w-4 ${s.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteStore(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            {loading ? <LoadingState /> : fProfiles.length === 0 ? <EmptyState text="İstifadəçi tapılmadı" /> : (
              <div className="space-y-2">
                {fProfiles.map((p) => {
                  const isUserAdmin = userRoles.some((r) => r.user_id === p.user_id && r.role === "admin");
                  const isUserMod = userRoles.some((r) => r.user_id === p.user_id && r.role === "moderator");
                  const isSelf = p.user_id === user?.id;
                  const level = getUserLevel(p.user_id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {(p.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="truncate text-sm font-semibold text-foreground">{p.full_name || "Adsız"}</h3>
                          {isUserAdmin && <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Admin</Badge>}
                          {isUserMod && <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[10px]">Moderator</Badge>}
                          <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
                          {isSelf && <Badge variant="outline" className="text-[10px]">Siz</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.city || "—"} · {p.phone || "—"} · {new Date(p.created_at).toLocaleDateString("az")}</p>
                      </div>
                      {!isSelf && (
                        <div className="flex items-center gap-1">
                          <Button variant={isUserAdmin ? "destructive" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleRole(p.user_id, "admin")}>
                            <ShieldCheck className="mr-1 h-3 w-3" />{isUserAdmin ? "Admin sil" : "Admin"}
                          </Button>
                          <Button variant={isUserMod ? "destructive" : "outline"} size="sm" className="text-xs h-7" onClick={() => toggleRole(p.user_id, "moderator")}>
                            {isUserMod ? "Mod sil" : "Mod"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            {loading ? <LoadingState /> : reviews.length === 0 ? <EmptyState text="Rəy tapılmadı" /> : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{r.comment || "Şərh yoxdur"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getProfileName(r.reviewer_id)} → {getProfileName(r.reviewed_user_id)} · {new Date(r.created_at).toLocaleDateString("az")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
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
  <div className="rounded-xl border border-border bg-card p-3 shadow-card">
    <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
  </div>
);

const LoadingState = () => <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-12 text-center">
    <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AdminPanel;
