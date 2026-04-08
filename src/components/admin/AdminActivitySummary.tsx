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
} from "lucide-react";

interface SummaryItem {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}

const LAST_VISIT_KEY = "admin_last_visit";

const AdminActivitySummary = () => {
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
      // First visit - save timestamp and skip
      if (user) {
        localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, new Date().toISOString());
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    const queries = await Promise.all([
      // New listings
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // Pending listings
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("created_at", since),
      // New stores
      supabase
        .from("stores")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // Pending stores
      supabase
        .from("stores")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("created_at", since),
      // New users
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // New orders
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // Confirmed orders (sales)
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["confirmed", "shipped", "delivered"])
        .gte("created_at", since),
      // New reports
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // New reviews
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // Balance top-ups (card)
      supabase
        .from("balance_transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "credit")
        .ilike("description", "%kart%")
        .gte("created_at", since),
      // Store change requests
      supabase
        .from("store_change_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // New tickets
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      // New messages
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id || "")
        .eq("is_read", false),
      // Payout requests
      supabase
        .from("payout_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    const [
      newListings, pendingListings, newStores, pendingStores,
      newUsers, newOrders, confirmedOrders, newReports,
      newReviews, cardTopups, storeChanges, newTickets,
      unreadNotifs, payoutRequests,
    ] = queries.map((q) => q.count || 0);

    const summary: SummaryItem[] = [];

    if (newListings > 0) summary.push({ icon: ShoppingBag, label: "Yeni elan", count: newListings, color: "text-blue-500" });
    if (pendingListings > 0) summary.push({ icon: ShoppingBag, label: "Təsdiq gözləyən elan", count: pendingListings, color: "text-amber-500" });
    if (newStores > 0) summary.push({ icon: Store, label: "Yeni mağaza", count: newStores, color: "text-purple-500" });
    if (pendingStores > 0) summary.push({ icon: Store, label: "Təsdiq gözləyən mağaza", count: pendingStores, color: "text-amber-500" });
    if (storeChanges > 0) summary.push({ icon: GitPullRequest, label: "Mağaza redaktə sorğusu", count: storeChanges, color: "text-indigo-500" });
    if (newUsers > 0) summary.push({ icon: Users, label: "Yeni istifadəçi", count: newUsers, color: "text-green-500" });
    if (newOrders > 0) summary.push({ icon: CreditCard, label: "Yeni sifariş", count: newOrders, color: "text-blue-500" });
    if (confirmedOrders > 0) summary.push({ icon: CreditCard, label: "Uğurlu satış", count: confirmedOrders, color: "text-green-500" });
    if (cardTopups > 0) summary.push({ icon: Wallet, label: "Kartla balans artırma", count: cardTopups, color: "text-emerald-500" });
    if (payoutRequests > 0) summary.push({ icon: Wallet, label: "Pul çıxarışı sorğusu", count: payoutRequests, color: "text-orange-500" });
    if (newReports > 0) summary.push({ icon: Flag, label: "Yeni şikayət", count: newReports, color: "text-red-500" });
    if (newReviews > 0) summary.push({ icon: Star, label: "Yeni rəy", count: newReviews, color: "text-yellow-500" });
    if (newTickets > 0) summary.push({ icon: LifeBuoy, label: "Yeni dəstək sorğusu", count: newTickets, color: "text-cyan-500" });
    if (unreadNotifs > 0) summary.push({ icon: Bell, label: "Oxunmamış bildiriş", count: unreadNotifs, color: "text-pink-500" });

    setItems(summary);
    setLoading(false);

    if (summary.length > 0) {
      setOpen(true);
    }

    // Update last visit
    if (user) {
      localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, new Date().toISOString());
    }
  };

  const timeSince = lastVisit
    ? formatTimeSince(lastVisit)
    : null;

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
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                    {item.count}
                  </span>
                </div>
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
