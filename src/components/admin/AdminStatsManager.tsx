import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, ShoppingBag, Star, Eye, MessageCircle, Wifi, CalendarDays } from "lucide-react";

interface Props {
  onNavigate?: (tab: string) => void;
}

const AdminStatsManager = ({ onNavigate }: Props) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

      const [listings, profiles, reviews, stores, messages, reports,
             newListingsWeek, newUsersWeek, pendingListings, onlineUsers, todayVisitors] = await Promise.all([
        supabase.from("listings").select("id, views_count, created_at, category, is_premium", { count: "exact" }),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("reviews").select("id, rating", { count: "exact" }),
        supabase.from("stores").select("id", { count: "exact" }),
        supabase.from("messages").select("id", { count: "exact" }),
        supabase.from("reports").select("id, status", { count: "exact" }),
        supabase.from("listings").select("id", { count: "exact" }).gte("created_at", weekAgo),
        supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", weekAgo),
        supabase.from("listings").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact" }).gte("last_seen", twoMinAgo),
        supabase.from("profiles").select("id", { count: "exact" }).gte("last_seen", today),
      ]);

      const allListings = listings.data || [];
      const totalViews = allListings.reduce((s, l: any) => s + (l.views_count || 0), 0);
      const premiumCount = allListings.filter((l: any) => l.is_premium).length;

      const catMap: Record<string, number> = {};
      allListings.forEach((l: any) => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
      const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

      const dailyListings: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const count = allListings.filter((l: any) => l.created_at >= dayStart && l.created_at < dayEnd).length;
        dailyListings.push({ date: d.toLocaleDateString("az", { day: "numeric", month: "short" }), count });
      }

      const allReviews = reviews.data || [];
      const avgRating = allReviews.length > 0 ? (allReviews.reduce((s, r: any) => s + r.rating, 0) / allReviews.length).toFixed(1) : "0";

      const pendingReports = (reports.data || []).filter((r: any) => r.status === "pending").length;

      setStats({
        totalListings: listings.count || 0,
        totalUsers: profiles.count || 0,
        totalReviews: reviews.count || 0,
        totalStores: stores.count || 0,
        totalMessages: messages.count || 0,
        totalViews,
        premiumCount,
        newListingsWeek: newListingsWeek.count || 0,
        newUsersWeek: newUsersWeek.count || 0,
        pendingListings: pendingListings.count || 0,
        pendingReports,
        avgRating,
        topCategories,
        dailyListings,
        onlineNow: onlineUsers.count || 0,
        todayVisitors: todayVisitors.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyListings.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Online & Today */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 border-green-500/30 bg-green-500/5 cursor-pointer hover:bg-green-500/10 transition-colors" onClick={() => onNavigate?.("users")}>
          <div className="flex items-center gap-2 text-green-600"><Wifi className="h-5 w-5" /><span className="text-xs font-medium">Hal-hazırda onlayn</span></div>
          <p className="mt-1 font-display text-2xl font-bold text-green-600">{stats.onlineNow}</p>
          <p className="text-[10px] text-muted-foreground">Son 2 dəqiqədə aktiv</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onNavigate?.("users")}>
          <div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-5 w-5" /><span className="text-xs font-medium">Bu gün gələn</span></div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.todayVisitors}</p>
          <p className="text-[10px] text-muted-foreground">Bugünkü unikal ziyarətçi</p>
        </Card>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Ümumi elanlar" value={stats.totalListings} sub={`+${stats.newListingsWeek} bu həftə`} onClick={() => onNavigate?.("listings")} />
        <MetricCard icon={<Users className="h-5 w-5" />} label="İstifadəçilər" value={stats.totalUsers} sub={`+${stats.newUsersWeek} bu həftə`} onClick={() => onNavigate?.("users")} />
        <MetricCard icon={<Eye className="h-5 w-5" />} label="Ümumi baxış" value={stats.totalViews.toLocaleString()} onClick={() => onNavigate?.("listings")} />
        <MetricCard icon={<Star className="h-5 w-5" />} label="Orta reytinq" value={stats.avgRating} sub={`${stats.totalReviews} rəy`} onClick={() => onNavigate?.("reviews")} />
        <MetricCard icon={<MessageCircle className="h-5 w-5" />} label="Mesajlar" value={stats.totalMessages} />
      </div>

      {/* Alerts */}
      {(stats.pendingListings > 0 || stats.pendingReports > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingListings > 0 && (
            <button
              onClick={() => onNavigate?.("moderation")}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 hover:bg-amber-500/20 transition-colors"
            >
              ⏳ {stats.pendingListings} elan təsdiq gözləyir
            </button>
          )}
          {stats.pendingReports > 0 && (
            <button
              onClick={() => onNavigate?.("reports")}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
            >
              🚨 {stats.pendingReports} şikayət həll gözləyir
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" /> Son 7 gündə yeni elanlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.dailyListings.map((d: any, i: number) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-foreground">{d.count}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 min-h-[4px] transition-all"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top categories */}
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onNavigate?.("categories")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Populyar kateqoriyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories.map(([cat, count]: [string, number]) => {
                const pct = Math.round((count / stats.totalListings) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground font-medium">{cat}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.topCategories.length === 0 && <p className="text-xs text-muted-foreground">Məlumat yoxdur</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick numbers */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onNavigate?.("listings")}>
          <p className="text-2xl font-bold text-primary">{stats.premiumCount}</p>
          <p className="text-xs text-muted-foreground">Premium elan</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onNavigate?.("stores")}>
          <p className="text-2xl font-bold text-primary">{stats.totalStores}</p>
          <p className="text-xs text-muted-foreground">Mağaza</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onNavigate?.("moderation")}>
          <p className="text-2xl font-bold text-primary">{stats.pendingListings}</p>
          <p className="text-xs text-muted-foreground">Gözləyən elan</p>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; onClick?: () => void }) => (
  <Card className={`p-3 ${onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`} onClick={onClick}>
    <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-[10px] text-primary">{sub}</p>}
  </Card>
);

export default AdminStatsManager;
