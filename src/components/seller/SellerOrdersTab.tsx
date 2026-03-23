import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Package, Truck, CheckCircle, XCircle, Clock, DollarSign, CreditCard } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Gözləyir", color: "bg-yellow-500/20 text-yellow-600" },
  confirmed: { label: "Təsdiqləndi", color: "bg-blue-500/20 text-blue-600" },
  shipped: { label: "Göndərildi", color: "bg-purple-500/20 text-purple-600" },
  delivered: { label: "Çatdırıldı", color: "bg-green-500/20 text-green-600" },
  cancelled: { label: "Ləğv edildi", color: "bg-red-500/20 text-red-600" },
  refunded: { label: "Geri qaytarıldı", color: "bg-gray-500/20 text-gray-600" },
};

interface SellerOrdersTabProps {
  storeId: string;
}

const SellerOrdersTab = ({ storeId }: SellerOrdersTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shipDialog, setShipDialog] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [payoutDialog, setPayoutDialog] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", bank_name: "", card_number: "" });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch listing names
  const listingIds = [...new Set(orders.map((o: any) => o.listing_id).filter(Boolean))];
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-order-listings", listingIds],
    queryFn: async () => {
      if (listingIds.length === 0) return [];
      const { data } = await supabase.from("listings").select("id, title, image_urls").in("id", listingIds);
      return data || [];
    },
    enabled: listingIds.length > 0,
  });

  // Fetch buyer profiles
  const buyerIds = [...new Set(orders.map((o: any) => o.buyer_id))];
  const { data: buyers = [] } = useQuery({
    queryKey: ["seller-order-buyers", buyerIds],
    queryFn: async () => {
      if (buyerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", buyerIds);
      return data || [];
    },
    enabled: buyerIds.length > 0,
  });

  // Calculate available balance (delivered orders minus commission minus payouts)
  const deliveredTotal = orders.filter((o: any) => o.status === "delivered")
    .reduce((s: number, o: any) => s + Number(o.total_amount) - Number(o.commission_amount) - Number(o.shipping_price), 0);

  const { data: payouts = [] } = useQuery({
    queryKey: ["seller-payouts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("payout_requests").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const paidOut = payouts.filter((p: any) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pendingPayout = payouts.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const availableBalance = Math.max(0, deliveredTotal - paidOut - pendingPayout);

  const getBuyerName = (uid: string) => buyers.find((b: any) => b.user_id === uid)?.full_name || "Müştəri";
  const getListing = (lid: string) => listings.find((l: any) => l.id === lid);

  const updateStatus = async (orderId: string, status: string, extra?: any) => {
    const updates: any = { status, ...extra };
    if (status === "shipped") updates.shipped_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();

    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sifariş yeniləndi" });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
    }
  };

  const submitPayout = async () => {
    if (!user || !payoutForm.amount || Number(payoutForm.amount) <= 0) return;
    const amt = Number(payoutForm.amount);
    if (amt > availableBalance) {
      toast({ title: "Mövcud balansdan çox çıxarmaq olmaz", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("payout_requests").insert({
      seller_id: user.id,
      store_id: storeId,
      amount: amt,
      bank_name: payoutForm.bank_name || null,
      card_number: payoutForm.card_number || null,
    } as any);

    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pul çıxarışı istəyi göndərildi" });
      setPayoutDialog(false);
      setPayoutForm({ amount: "", bank_name: "", card_number: "" });
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Earnings summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{availableBalance.toFixed(2)} ₼</p>
            <p className="text-[10px] text-muted-foreground">Çıxarıla bilən</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Button size="sm" className="w-full gap-1" onClick={() => setPayoutDialog(true)} disabled={availableBalance <= 0}>
              <DollarSign className="h-3.5 w-3.5" /> Pul çıxar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <Package className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Hələ sifariş yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => {
            const listing = getListing(order.listing_id);
            const status = statusMap[order.status] || statusMap.pending;
            return (
              <Card key={order.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    {listing?.image_urls?.[0] && (
                      <img src={listing.image_urls[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{listing?.title || "Məhsul"}</p>
                      <p className="text-xs text-muted-foreground">{getBuyerName(order.buyer_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{Number(order.total_amount).toFixed(2)} ₼</p>
                      <Badge className={`${status.color} border-0 text-[9px]`}>{status.label}</Badge>
                    </div>
                  </div>

                  {order.shipping_address && (
                    <p className="text-[10px] text-muted-foreground">📍 {order.shipping_address}</p>
                  )}
                  {order.buyer_note && (
                    <p className="text-[10px] text-muted-foreground">💬 {order.buyer_note}</p>
                  )}

                  <div className="flex gap-1.5">
                    {order.status === "pending" && (
                      <>
                        <Button size="sm" className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus(order.id, "confirmed")}>
                          Təsdiqlə
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                          onClick={() => updateStatus(order.id, "cancelled")}>
                          Ləğv et
                        </Button>
                      </>
                    )}
                    {order.status === "confirmed" && (
                      <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => setShipDialog(order)}>
                        <Truck className="h-3 w-3" /> Göndər
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ship dialog */}
      <Dialog open={!!shipDialog} onOpenChange={(o) => { if (!o) setShipDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Göndərmə məlumatları</DialogTitle>
            <DialogDescription>İzləmə kodunu daxil edin</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">İzləmə nömrəsi</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="İzləmə kodu..." className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">İzləmə linki (ixtiyari)</Label>
              <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." className="h-9" />
            </div>
            <Button className="w-full" disabled={!trackingNumber.trim()} onClick={() => {
              updateStatus(shipDialog.id, "shipped", { tracking_number: trackingNumber, tracking_url: trackingUrl || null });
              setShipDialog(null);
              setTrackingNumber("");
              setTrackingUrl("");
            }}>
              Göndərildi olaraq işarələ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout dialog */}
      <Dialog open={payoutDialog} onOpenChange={setPayoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Pul çıxarışı</DialogTitle>
            <DialogDescription>Mövcud balans: {availableBalance.toFixed(2)} ₼</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Məbləğ (₼)</Label>
              <Input type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                placeholder="0.00" className="h-9" max={availableBalance} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bank adı</Label>
              <Input value={payoutForm.bank_name} onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                placeholder="Kapital Bank..." className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kart / Hesab nömrəsi</Label>
              <Input value={payoutForm.card_number} onChange={(e) => setPayoutForm({ ...payoutForm, card_number: e.target.value })}
                placeholder="4169 XXXX XXXX XXXX" className="h-9" />
            </div>
            <Button className="w-full gap-2" onClick={submitPayout} disabled={!payoutForm.amount || Number(payoutForm.amount) <= 0}>
              <CreditCard className="h-4 w-4" /> İstək göndər
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerOrdersTab;
