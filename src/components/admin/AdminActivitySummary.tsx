import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag,
  Store,
  Users,
  MessageSquare,
  Flag,
  Wallet,
  CreditCard,
  Star,
  GitPullRequest,
  LifeBuoy,
  Bell,
  Activity,
  ChevronRight,
} from "lucide-react";

interface SummaryItem {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  tab: string;
}

const LAST_VISIT_KEY = "admin_last_visit";

interface Props {
  onNavigate?: (tab: string) => void;
}

const AdminActivitySummary = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`${LAST_VISIT_KEY}_${user.id}`);
    setLastVisit(stored);
    fetchSummary(stored);
  }, [user]);

  const fetchSummary = async (since: string | null) => {
    if (!since) {
      if (user) {
        localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, new Date().toISOString());
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    const queries = await Promise.all([
      supabase.from("listings").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "pending").gte("created_at", since),
      supabase.from("stores").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("stores").select("*", { count: "exact", head: true }).eq("status", "pending").gte("created_at", since),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["confirmed", "shipped", "delivered"]).gte("created_at", since),
      supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("reviews").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("balance_transactions").select("*", { count: "exact", head: true }).eq("type", "credit").ilike("description", "%kart%").gte("created_at", since),
      supabase.from("store_change_requests").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("tickets").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user?.id || "").eq("is_read", false),
      supabase.from("payout_requests").select("*", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const [
      newListings, pendingListings, newStores, pendingStores,
      newUsers, newOrders, confirmedOrders, newReports,
      newReviews, cardTopups, storeChanges, newTickets,
      unreadNotifs, payoutRequests,
    ] = queries.map((q) => q.count || 0);

    const summary: SummaryItem[] = [];

    if (newListings > 0) summary.push({ icon: ShoppingBag, label: "Yeni elan", count: newListings, color: "text-blue-500", tab: "listings" });
    if (pendingListings > 0) summary.push({ icon: ShoppingBag, label: "Təsdiq gözləyən elan", count: pendingListings, color: "text-amber-500", tab: "moderation" });
    if (newStores > 0) summary.push({ icon: Store, label: "Yeni mağaza", count: newStores, color: "text-purple-500", tab: "stores" });
    if (pendingStores > 0) summary.push({ icon: Store, label: "Təsdiq gözləyən mağaza", count: pendingStores, color: "text-amber-500", tab: "store-moderation" });
    if (storeChanges > 0) summary.push({ icon: GitPullRequest, label: "Mağaza redaktə sorğusu", count: storeChanges, color: "text-indigo-500", tab: "store-requests" });
    if (newUsers > 0) summary.push({ icon: Users, label: "Yeni istifadəçi", count: newUsers, color: "text-green-500", tab: "users" });
    if (newOrders > 0) summary.push({ icon: CreditCard, label: "Yeni sifariş", count: newOrders, color: "text-blue-500", tab: "orders" });
    if (confirmedOrders > 0) summary.push({ icon: CreditCard, label: "Uğurlu satış", count: confirmedOrders, color: "text-green-500", tab: "orders" });
    if (cardTopups > 0) summary.push({ icon: Wallet, label: "Kartla balans artırma", count: cardTopups, color: "text-emerald-500", tab: "epoint" });
    if (payoutRequests > 0) summary.push({ icon: Wallet, label: "Pul çıxarışı sorğusu", count: payoutRequests, color: "text-orange-500", tab: "balance" });
    if (newReports > 0) summary.push({ icon: Flag, label: "Yeni şikayət", count: newReports, color: "text-red-500", tab: "reports" });
    if (newReviews > 0) summary.push({ icon: Star, label: "Yeni rəy", count: newReviews, color: "text-yellow-500", tab: "reviews" });
    if (newTickets > 0) summary.push({ icon: LifeBuoy, label: "Yeni dəstək sorğusu", count: newTickets, color: "text-cyan-500", tab: "tickets" });
    if (unreadNotifs > 0) summary.push({ icon: Bell, label: "Oxunmamış bildiriş", count: unreadNotifs, color: "text-pink-500", tab: "notifications" });

    setItems(summary);
    setLoading(false);

    if (summary.length > 0) {
      setOpen(true);
    }

    if (user) {
      localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, new Date().toISOString());
    }
  };

  const handleItemClick = (tab: string) => {
    setOpen(false);
    onNavigate?.(tab);
  };

  const timeSince = lastVisit ? formatTimeSince(lastVisit) : null;

  if (loading || items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Fəaliyyət xülasəsi
          </DialogTitle>
          <DialogDescription>
            {timeSince ? `Son girişinizdən bəri (${timeSince}) baş verən dəyişikliklər:` : "Son dəyişikliklər:"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-2">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleItemClick(item.tab)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                      {item.count}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <Button onClick={() => setOpen(false)} className="w-full mt-2">
          Bağla
        </Button>
      </DialogContent>
    </Dialog>
  );
};

function formatTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} dəq əvvəl`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  return `${days} gün əvvəl`;
}

export default AdminActivitySummary;
