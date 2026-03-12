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
import AdminThemeManager from "@/components/admin/AdminThemeManager";
import AdminModerationManager from "@/components/admin/AdminModerationManager";
import AdminBannerManager from "@/components/admin/AdminBannerManager";
import AdminReportsManager from "@/components/admin/AdminReportsManager";
import AdminStatsManager from "@/components/admin/AdminStatsManager";
import AdminSettingsManager from "@/components/admin/AdminSettingsManager";
import AdminPagesManager from "@/components/admin/AdminPagesManager";
import AdminNotificationSender from "@/components/admin/AdminNotificationSender";
import AdminNotificationSettings from "@/components/admin/AdminNotificationSettings";
import AdminBalanceManager from "@/components/admin/AdminBalanceManager";
import AdminReferralManager from "@/components/admin/AdminReferralManager";
import AdminIntegrationsManager from "@/components/admin/AdminIntegrationsManager";
import {
  ShieldCheck, Trash2, Eye, EyeOff, Search, Users, ShoppingBag, Store,
  Crown, Loader2, AlertTriangle, Zap, Star, MapPin, Pencil, MessageSquare,
  FolderTree, Map, Palette, BarChart3, CheckSquare, Image, Flag, Settings, FileText, Bell, Wallet, Gift, Plug,
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
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-20 md:pb-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Admin Panel</h1>
        </div>

        <Tabs defaultValue="stats">
          <div className="sticky top-[57px] z-30 -mx-3 bg-background/95 backdrop-blur-sm px-3 pb-2 sm:-mx-4 sm:px-4">
            <div className="overflow-x-auto scrollbar-none">
              <TabsList className="inline-flex h-auto min-w-full w-max gap-1 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="stats" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><BarChart3 className="h-3.5 w-3.5" /> Statistika</TabsTrigger>
                <TabsTrigger value="moderation" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><CheckSquare className="h-3.5 w-3.5" /> Moderasiya</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Bell className="h-3.5 w-3.5" /> Bildirişlər</TabsTrigger>
                <TabsTrigger value="listings" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><ShoppingBag className="h-3.5 w-3.5" /> Elanlar</TabsTrigger>
                <TabsTrigger value="categories" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><FolderTree className="h-3.5 w-3.5" /> Kateqoriyalar</TabsTrigger>
                <TabsTrigger value="regions" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Map className="h-3.5 w-3.5" /> Bölgələr</TabsTrigger>
                <TabsTrigger value="stores" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Store className="h-3.5 w-3.5" /> Mağazalar</TabsTrigger>
                <TabsTrigger value="users" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Users className="h-3.5 w-3.5" /> İstifadəçilər</TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><MessageSquare className="h-3.5 w-3.5" /> Rəylər</TabsTrigger>
                <TabsTrigger value="reports" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Flag className="h-3.5 w-3.5" /> Şikayətlər</TabsTrigger>
                <TabsTrigger value="banners" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Image className="h-3.5 w-3.5" /> Bannerlər</TabsTrigger>
                <TabsTrigger value="pages" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Səhifələr</TabsTrigger>
                <TabsTrigger value="balance" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Wallet className="h-3.5 w-3.5" /> Balans</TabsTrigger>
                <TabsTrigger value="referral" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Gift className="h-3.5 w-3.5" /> Referal</TabsTrigger>
                <TabsTrigger value="integrations" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Plug className="h-3.5 w-3.5" /> İnteqrasiyalar</TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Settings className="h-3.5 w-3.5" /> Tənzimləmələr</TabsTrigger>
                <TabsTrigger value="theme" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"><Palette className="h-3.5 w-3.5" /> Dizayn</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Stats */}
          <TabsContent value="stats" className="mt-3"><AdminStatsManager /></TabsContent>

          {/* Moderation */}
          <TabsContent value="moderation" className="mt-3"><AdminModerationManager /></TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="mt-3"><AdminNotificationSender /></TabsContent>

          {/* Search for listings/stores/users */}
          <div className="relative mt-3 mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Axtar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>

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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_active: !l.is_active })}>
                        {l.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_premium: !l.is_premium })}>
                        <Crown className={`h-4 w-4 ${l.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateListing(l.id, { is_urgent: !l.is_urgent })}>
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

          <TabsContent value="categories" className="mt-3"><AdminCategoryManager /></TabsContent>
          <TabsContent value="regions" className="mt-3"><AdminRegionManager /></TabsContent>

          {/* Stores */}
          <TabsContent value="stores" className="mt-3">
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
                      <p className="text-xs text-muted-foreground">{s.city || "—"} · {getProfileName(s.user_id)} · {new Date(s.created_at).toLocaleDateString("az")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
          <TabsContent value="users" className="mt-3">
            {loading ? <LoadingState /> : fProfiles.length === 0 ? <EmptyState text="İstifadəçi tapılmadı" /> : (
              <div className="space-y-2">
                {fProfiles.map((p) => {
                  const isUserAdmin = userRoles.some((r) => r.user_id === p.user_id && r.role === "admin");
                  const isUserMod = userRoles.some((r) => r.user_id === p.user_id && r.role === "moderator");
                  const isSelf = p.user_id === user?.id;
                  const level = getUserLevel(p.user_id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {(p.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <h3 className="truncate text-xs font-semibold text-foreground">{p.full_name || "Adsız"}</h3>
                          {isUserAdmin && <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Admin</Badge>}
                          {isUserMod && <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[10px]">Mod</Badge>}
                          <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
                          {isSelf && <Badge variant="outline" className="text-[10px]">Siz</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{p.city || "—"} · {new Date(p.created_at).toLocaleDateString("az")}</p>
                      </div>
                      {!isSelf && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant={isUserAdmin ? "destructive" : "outline"} size="sm" className="text-[11px] h-7 px-2" onClick={() => toggleRole(p.user_id, "admin")}>
                            <ShieldCheck className="mr-0.5 h-3 w-3" />{isUserAdmin ? "Sil" : "Admin"}
                          </Button>
                          <Button variant={isUserMod ? "destructive" : "outline"} size="sm" className="text-[11px] h-7 px-2" onClick={() => toggleRole(p.user_id, "moderator")}>
                            {isUserMod ? "Sil" : "Mod"}
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
          <TabsContent value="reviews" className="mt-3">
            {loading ? <LoadingState /> : reviews.length === 0 ? <EmptyState text="Rəy tapılmadı" /> : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-1">{r.comment || "Şərh yoxdur"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {getProfileName(r.reviewer_id)} → {getProfileName(r.reviewed_user_id)} · {new Date(r.created_at).toLocaleDateString("az")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="mt-3"><AdminReportsManager /></TabsContent>

          {/* Banners */}
          <TabsContent value="banners" className="mt-3"><AdminBannerManager /></TabsContent>

          {/* Pages */}
          <TabsContent value="pages" className="mt-3"><AdminPagesManager /></TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-3"><AdminSettingsManager /></TabsContent>
          <TabsContent value="balance" className="mt-3"><AdminBalanceManager /></TabsContent>
          <TabsContent value="referral" className="mt-3"><AdminReferralManager /></TabsContent>
          <TabsContent value="integrations" className="mt-3"><AdminIntegrationsManager /></TabsContent>
          <TabsContent value="theme" className="mt-3"><AdminThemeManager /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const LoadingState = () => <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-12 text-center">
    <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AdminPanel;
