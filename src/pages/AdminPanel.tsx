import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AdminCategoryManager from "@/components/admin/AdminCategoryManager";
import AdminCategoryFieldsManager from "@/components/admin/AdminCategoryFieldsManager";
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
import AdminGiftsManager from "@/components/admin/AdminGiftsManager";
import AdminVideoSettings from "@/components/admin/AdminVideoSettings";
import AdminStoreModerationManager from "@/components/admin/AdminStoreModerationManager";
import AdminScraperManager from "@/components/admin/AdminScraperManager";
import AdminAntispamManager from "@/components/admin/AdminAntispamManager";
import AdminOrderManager from "@/components/admin/AdminOrderManager";
import AdminStoreRequestsManager from "@/components/admin/AdminStoreRequestsManager";
import AdminTicketManager from "@/components/admin/AdminTicketManager";
import AdminEpointManager from "@/components/admin/AdminEpointManager";
import AdminActivitySummary from "@/components/admin/AdminActivitySummary";
import AdminBlogManager from "@/components/admin/AdminBlogManager";
import {
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Users,
  ShoppingBag,
  Store,
  Crown,
  Loader2,
  AlertTriangle,
  Zap,
  Star,
  MapPin,
  Pencil,
  MessageSquare,
  FolderTree,
  Map,
  Palette,
  BarChart3,
  CheckSquare,
  Image,
  Flag,
  Settings,
  FileText,
  Bell,
  Wallet,
  Gift,
  Plug,
  Video,
  Globe,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  GitPullRequest,
  CreditCard,
  BookOpen,
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
  condition: string;
  description: string | null;
  status?: string;
}

interface StoreItem {
  id: string;
  name: string;
  city: string | null;
  is_premium: boolean;
  user_id: string;
  created_at: string;
  logo_url: string | null;
  status?: string;
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

interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  listing_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState("stats");
  const [pendingReports, setPendingReports] = useState(0);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: 0, location: "" });
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/");
  }, [isAdmin, adminLoading, navigate]);
  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [l, s, p, r, rev, rep, reg] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("stores").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("regions").select("id, name").eq("is_active", true).order("sort_order"),
    ]);
    if (l.data) setListings(l.data as Listing[]);
    if (s.data) setStores(s.data as StoreItem[]);
    if (p.data) setProfiles(p.data);
    if (r.data) setUserRoles(r.data as UserRole[]);
    if (rev.data) setReviews(rev.data as Review[]);
    if (rep.count !== null) setPendingReports(rep.count);
    if (reg.data) setRegions(reg.data as { id: string; name: string }[]);
    setLoading(false);
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    const { error } = await supabase.from("listings").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    toast({ title: "Elan yeniləndi" });
  };

  const saveListing = async () => {
    if (!selectedListing) return;
    const updates = {
      title: editForm.title,
      description: editForm.description,
      price: editForm.price,
      location: editForm.location,
    };
    const { error } = await supabase.from("listings").update(updates).eq("id", selectedListing.id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setListings((prev) => prev.map((l) => (l.id === selectedListing.id ? { ...l, ...updates } : l)));
    setSelectedListing(null);
    toast({ title: "Elan yəniləndə ✓" });
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Elan silindi" });
  };

  const updateStore = async (id: string, updates: Partial<StoreItem>) => {
    const { error } = await supabase.from("stores").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast({ title: "Mağaza yeniləndi" });
  };

  const deleteStore = async (id: string) => {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setStores((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Mağaza silindi" });
  };

  const toggleRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const has = userRoles.some((r) => r.user_id === userId && r.role === role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) {
        toast({ title: "Xəta", description: error.message, variant: "destructive" });
        return;
      }
      setUserRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === role)));
    } else {
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role }]);
      if (error) {
        toast({ title: "Xəta", description: error.message, variant: "destructive" });
        return;
      }
      setUserRoles((prev) => [...prev, { user_id: userId, role }]);
    }
    toast({ title: has ? `${role} rolu silindi` : `${role} rolu verildi` });
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Rəy silindi" });
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.user_id !== userId));
    setSelectedUser(null);
    toast({ title: "İstifadəçi silindi" });
  };

  const getUserLevel = (userId: string) => {
    const userReviews = reviews.filter((r) => r.reviewed_user_id === userId);
    const count = userReviews.length;
    const avg = count > 0 ? userReviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    const userListingsCount = listings.filter((l) => l.user_id === userId && l.is_active).length;
    const profile = profiles.find((p) => p.user_id === userId);
    if (count >= 25 && avg >= 4) return { label: "VIP Satıcı", color: "bg-amber-500/20 text-amber-600" };
    if (count >= 10 && avg >= 3.5) return { label: "Etibarlı", color: "bg-green-500/20 text-green-600" };
    if (userListingsCount >= 5 || count >= 3) return { label: "Aktiv", color: "bg-blue-500/20 text-blue-600" };
    if (profile?.created_at) {
      const days = (Date.now() - new Date(profile.created_at).getTime()) / 86400000;
      if (days <= 30) return { label: "Yeni", color: "bg-muted text-muted-foreground" };
    }
    return null;
  };

  const getProfileName = (userId: string) => profiles.find((p) => p.user_id === userId)?.full_name || "Adsız";

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString();
  const pendingListings = listings.filter((l) => l.status === "pending").length;
  const pendingStores = stores.filter((s) => s.status === "pending").length;
  const newUsers = profiles.filter((p) => p.created_at > yStr).length;
  const newReviews = reviews.filter((r) => r.created_at > yStr).length;

  const q = searchQuery.toLowerCase();
  const fListings = listings.filter((l) => l.title.toLowerCase().includes(q));
  const fStores = stores.filter((s) => s.name.toLowerCase().includes(q));
  const fProfiles = profiles.filter((p) => (p.full_name || "").toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-20 md:pb-6">
        <AdminActivitySummary onNavigate={(tab) => setActiveTab(tab)} />
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Admin Panel</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sticky top-[57px] z-30 -mx-3 bg-background/95 backdrop-blur-sm px-3 pb-2 sm:-mx-4 sm:px-4">
            <div className="relative group flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="absolute left-1 z-40 hidden h-7 w-7 rounded-full shadow border-border md:flex opacity-0 transition-opacity group-hover:opacity-100 bg-background/90 hover:bg-muted"
                onClick={() => scrollTabs('left')}
              >
                <ChevronLeft className="h-4 w-4 text-foreground/70" />
              </Button>
              
              <div ref={tabsScrollRef} className="overflow-x-auto scrollbar-none w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <TabsList className="inline-flex h-auto min-w-full w-max gap-1 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="stats" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <BarChart3 className="h-3.5 w-3.5" /> Statistika
                </TabsTrigger>
                <TabsTrigger value="moderation" className="relative gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <CheckSquare className="h-3.5 w-3.5" /> Moderasiya
                  {pendingListings > 0 && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Bell className="h-3.5 w-3.5" /> Bildirişlər
                </TabsTrigger>
                <TabsTrigger value="listings" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <ShoppingBag className="h-3.5 w-3.5" /> Elanlar
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <FolderTree className="h-3.5 w-3.5" /> Kateqoriyalar
                </TabsTrigger>
                <TabsTrigger value="regions" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Map className="h-3.5 w-3.5" /> Bölgələr
                </TabsTrigger>
                <TabsTrigger value="stores" className="relative gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Store className="h-3.5 w-3.5" /> Mağazalar
                  {pendingStores > 0 && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
                </TabsTrigger>
                <TabsTrigger value="users" className="relative gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Users className="h-3.5 w-3.5" /> İstifadəçilər
                  {newUsers > 0 && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
                </TabsTrigger>
                <TabsTrigger value="reviews" className="relative gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <MessageSquare className="h-3.5 w-3.5" /> Rəylər
                  {newReviews > 0 && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
                </TabsTrigger>
                <TabsTrigger value="reports" className="relative gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Flag className="h-3.5 w-3.5" /> Şikayətlər
                  {pendingReports > 0 && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
                </TabsTrigger>
                <TabsTrigger value="banners" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Image className="h-3.5 w-3.5" /> Bannerlər
                </TabsTrigger>
                <TabsTrigger value="pages" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <FileText className="h-3.5 w-3.5" /> Səhifələr
                </TabsTrigger>
                <TabsTrigger value="balance" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Wallet className="h-3.5 w-3.5" /> Balans
                </TabsTrigger>
                <TabsTrigger value="referral" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Gift className="h-3.5 w-3.5" /> Referal
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Plug className="h-3.5 w-3.5" /> İnteqrasiyalar
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Settings className="h-3.5 w-3.5" /> Tənzimləmələr
                </TabsTrigger>
                <TabsTrigger value="gifts" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Gift className="h-3.5 w-3.5" /> Hədiyyələr
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Video className="h-3.5 w-3.5" /> Video
                </TabsTrigger>
                <TabsTrigger value="scraper" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Globe className="h-3.5 w-3.5" /> Scraper
                </TabsTrigger>
                <TabsTrigger value="theme" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <Palette className="h-3.5 w-3.5" /> Dizayn
                </TabsTrigger>
                <TabsTrigger value="antispam" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <ShieldAlert className="h-3.5 w-3.5" /> Antispam
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <ShoppingBag className="h-3.5 w-3.5" /> Sifarişlər
                </TabsTrigger>
                <TabsTrigger value="store-requests" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <GitPullRequest className="h-3.5 w-3.5" /> Mağaza sorğuları
                </TabsTrigger>
                <TabsTrigger value="tickets" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <LifeBuoy className="h-3.5 w-3.5" /> Dəstək
                </TabsTrigger>
                <TabsTrigger value="epoint" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <CreditCard className="h-3.5 w-3.5" /> Epoint
                </TabsTrigger>
                <TabsTrigger value="blog" className="gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap">
                  <BookOpen className="h-3.5 w-3.5" /> Blog
                </TabsTrigger>
              </TabsList>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-1 z-40 hidden h-7 w-7 rounded-full shadow border-border md:flex opacity-0 transition-opacity group-hover:opacity-100 bg-background/90 hover:bg-muted"
              onClick={() => scrollTabs('right')}
            >
              <ChevronRight className="h-4 w-4 text-foreground/70" />
            </Button>
            </div>
          </div>

          {/* Stats */}
          <TabsContent value="stats" className="mt-3">
            <AdminStatsManager onNavigate={(tab: string) => setActiveTab(tab)} />
          </TabsContent>

          {/* Moderation */}
          <TabsContent value="moderation" className="mt-3">
            <AdminModerationManager />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="mt-3 space-y-6">
            <AdminNotificationSettings />
            <AdminNotificationSender />
          </TabsContent>

          {/* Antispam */}
          <TabsContent value="antispam" className="mt-3">
            <AdminAntispamManager />
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders" className="mt-3">
            <AdminOrderManager />
          </TabsContent>

          {/* Store Requests */}
          <TabsContent value="store-requests" className="mt-3">
            <AdminStoreRequestsManager />
          </TabsContent>

          {/* Tickets */}
          <TabsContent value="tickets" className="mt-3">
            <AdminTicketManager />
          </TabsContent>

          {/* Epoint */}
          <TabsContent value="epoint" className="mt-3">
            <AdminEpointManager />
          </TabsContent>

          {/* Blog */}
          <TabsContent value="blog" className="mt-3">
            <AdminBlogManager />
          </TabsContent>

          {/* Search for listings/stores/users */}
          <div className="relative mt-3 mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Axtar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Listings */}
          <TabsContent value="listings">
            {/* Edit Listing Sheet */}
            <Sheet open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
              <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle>Elanı Redaktə Et</SheetTitle>
                </SheetHeader>
                <Separator className="mb-4" />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Başlıq</Label>
                    <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Açıqlama</Label>
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={5} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Qiymət (₼)</Label>
                      <Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Məkan</Label>
                      <Select value={editForm.location} onValueChange={(val) => setEditForm({ ...editForm, location: val })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Məkan seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((reg) => (
                            <SelectItem key={reg.id} value={reg.name}>{reg.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={saveListing} className="w-full gap-2 bg-gradient-primary text-primary-foreground">
                    <Pencil className="h-4 w-4" /> Dəyişlikləri saxla
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {loading ? (
              <LoadingState />
            ) : fListings.length === 0 ? (
              <EmptyState text="Elan tapılmadı" />
            ) : (
              <div className="space-y-2">
                {fListings.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {l.image_urls?.[0] ? (
                        <img src={l.image_urls[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-foreground">{l.title}</h3>
                        {l.is_premium && (
                          <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[10px]">Premium</Badge>
                        )}
                        {l.is_urgent && (
                          <Badge variant="destructive" className="text-[10px]">Təcili</Badge>
                        )}
                        {!l.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Deaktiv</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {l.price} ₼ · {l.location} · {l.category} · {l.views_count} baxış ·{" "}
                        {new Date(l.created_at).toLocaleDateString("az")}
                      </p>
                      <p className="text-xs text-muted-foreground">Satıcı: {getProfileName(l.user_id)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setSelectedListing(l); setEditForm({ title: l.title, description: l.description || "", price: l.price, location: l.location }); }}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => updateListing(l.id, { is_active: !l.is_active })}
                      >
                        {l.is_active ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => updateListing(l.id, { is_premium: !l.is_premium })}
                      >
                        <Crown className={`h-4 w-4 ${l.is_premium ? "text-amber-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => updateListing(l.id, { is_urgent: !l.is_urgent })}
                      >
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

          <TabsContent value="categories" className="mt-3">
            <AdminCategoryManager />
            <div className="mt-6 border-t border-border pt-6">
              <AdminCategoryFieldsManager />
            </div>
          </TabsContent>
          <TabsContent value="regions" className="mt-3">
            <AdminRegionManager />
          </TabsContent>

          {/* Stores */}
          <TabsContent value="stores" className="mt-3">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Mağaza Moderasiyası</h3>
              <AdminStoreModerationManager />
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Bütün Mağazalar</h3>
              {loading ? (
                <LoadingState />
              ) : fStores.length === 0 ? (
                <EmptyState text="Mağaza tapılmadı" />
              ) : (
                <div className="space-y-2">
                  {fStores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
                    >
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Store className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                          {s.is_premium && (
                            <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[10px]">Premium</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.city || "—"} · {getProfileName(s.user_id)} ·{" "}
                          {new Date(s.created_at).toLocaleDateString("az")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateStore(s.id, { is_premium: !s.is_premium })}
                        >
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
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-3">
            {/* User Detail Sheet */}
            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
              <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
                {selectedUser && (() => {
                  const isUserAdmin = userRoles.some((r) => r.user_id === selectedUser.user_id && r.role === "admin");
                  const isUserMod = userRoles.some((r) => r.user_id === selectedUser.user_id && r.role === "moderator");
                  const isSelf = selectedUser.user_id === user?.id;
                  const level = getUserLevel(selectedUser.user_id);
                  const userListings = listings.filter(l => l.user_id === selectedUser.user_id);
                  const userReviews = reviews.filter(r => r.reviewed_user_id === selectedUser.user_id);
                  return (
                    <>
                      <SheetHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
                            {(selectedUser.full_name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <SheetTitle className="text-base">{selectedUser.full_name || "Adsız"}</SheetTitle>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {isUserAdmin && <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Admin</Badge>}
                              {isUserMod && <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[10px]">Mod</Badge>}
                              <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
                              {isSelf && <Badge variant="outline" className="text-[10px]">Siz</Badge>}
                            </div>
                          </div>
                        </div>
                      </SheetHeader>
                      <Separator className="mb-4" />
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Şəhər</span>
                          <span className="font-medium">{selectedUser.city || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefon</span>
                          <span className="font-medium">{selectedUser.phone || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Qeydiyyat tarixi</span>
                          <span className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString("az")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Elan sayı</span>
                          <span className="font-medium">{userListings.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rəy sayı</span>
                          <span className="font-medium">{userReviews.length}</span>
                        </div>
                      </div>
                      {!isSelf && (
                        <>
                          <Separator className="my-4" />
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol idarəsi</p>
                            <div className="flex gap-2">
                              <Button
                                variant={isUserAdmin ? "destructive" : "outline"}
                                size="sm" className="flex-1 gap-1.5"
                                onClick={() => toggleRole(selectedUser.user_id, "admin")}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {isUserAdmin ? "Admin rolu sil" : "Admin et"}
                              </Button>
                              <Button
                                variant={isUserMod ? "destructive" : "outline"}
                                size="sm" className="flex-1 gap-1.5"
                                onClick={() => toggleRole(selectedUser.user_id, "moderator")}
                              >
                                {isUserMod ? "Mod rolu sil" : "Mod et"}
                              </Button>
                            </div>
                            <Button
                              variant="destructive" size="sm" className="w-full gap-1.5 mt-2"
                              onClick={() => deleteUser(selectedUser.user_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> İstifadəçini sil
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </SheetContent>
            </Sheet>

            {loading ? (
              <LoadingState />
            ) : fProfiles.length === 0 ? (
              <EmptyState text="İstifadəçi tapılmadı" />
            ) : (
              <div className="space-y-2">
                {fProfiles.map((p) => {
                  const isUserAdmin = userRoles.some((r) => r.user_id === p.user_id && r.role === "admin");
                  const isUserMod = userRoles.some((r) => r.user_id === p.user_id && r.role === "moderator");
                  const isSelf = p.user_id === user?.id;
                  const level = getUserLevel(p.user_id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setSelectedUser(p)}
                    >
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
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.city || "—"} · {p.phone || "—"} · {new Date(p.created_at).toLocaleDateString("az")}
                        </p>
                      </div>
                      {!isSelf && (
                        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant={isUserAdmin ? "destructive" : "outline"}
                            size="sm" className="text-[11px] h-7 px-2"
                            onClick={() => toggleRole(p.user_id, "admin")}
                          >
                            <ShieldCheck className="mr-0.5 h-3 w-3" />
                            {isUserAdmin ? "Sil" : "Admin"}
                          </Button>
                          <Button
                            variant={isUserMod ? "destructive" : "outline"}
                            size="sm" className="text-[11px] h-7 px-2"
                            onClick={() => toggleRole(p.user_id, "moderator")}
                          >
                            {isUserMod ? "Sil" : "Mod"}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => deleteUser(p.user_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
            {loading ? (
              <LoadingState />
            ) : reviews.length === 0 ? (
              <EmptyState text="Rəy tapılmadı" />
            ) : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
                  >
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-1">{r.comment || "Şərh yoxdur"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {getProfileName(r.reviewer_id)} → {getProfileName(r.reviewed_user_id)} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("az")}
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
          <TabsContent value="reports" className="mt-3">
            <AdminReportsManager />
          </TabsContent>

          {/* Banners */}
          <TabsContent value="banners" className="mt-3">
            <AdminBannerManager />
          </TabsContent>

          {/* Pages */}
          <TabsContent value="pages" className="mt-3">
            <AdminPagesManager />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-3">
            <AdminSettingsManager />
          </TabsContent>
          <TabsContent value="balance" className="mt-3">
            <AdminBalanceManager />
          </TabsContent>
          <TabsContent value="referral" className="mt-3">
            <AdminReferralManager />
          </TabsContent>
          <TabsContent value="integrations" className="mt-3">
            <AdminIntegrationsManager />
          </TabsContent>
          <TabsContent value="gifts" className="mt-3">
            <AdminGiftsManager />
          </TabsContent>
          <TabsContent value="video" className="mt-3">
            <AdminVideoSettings />
          </TabsContent>
          <TabsContent value="scraper" className="mt-3">
            <AdminScraperManager />
          </TabsContent>
          <TabsContent value="theme" className="mt-3">
            <AdminThemeManager />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const LoadingState = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-12 text-center">
    <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AdminPanel;
