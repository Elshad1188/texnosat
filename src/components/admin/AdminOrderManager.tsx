import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShoppingCart, Package, Search, Settings, DollarSign, Truck, CheckCircle, XCircle, Clock } from "lucide-react";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Gözləyir", color: "bg-yellow-500/20 text-yellow-600" },
  confirmed: { label: "Təsdiqləndi", color: "bg-blue-500/20 text-blue-600" },
  shipped: { label: "Göndərildi", color: "bg-purple-500/20 text-purple-600" },
  delivered: { label: "Çatdırıldı", color: "bg-green-500/20 text-green-600" },
  cancelled: { label: "Ləğv edildi", color: "bg-red-500/20 text-red-600" },
  refunded: { label: "Geri qaytarıldı", color: "bg-gray-500/20 text-gray-600" },
};

const AdminOrderManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // E-commerce settings
  const { data: ecomSettings } = useQuery({
    queryKey: ["ecommerce-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ecommerce").maybeSingle();
      return (data?.value as any) || { enabled: false, commission_rate: 5 };
    },
  });

  const [settingsForm, setSettingsForm] = useState<{ enabled: boolean; commission_rate: number }>({
    enabled: ecomSettings?.enabled ?? false,
    commission_rate: ecomSettings?.commission_rate ?? 5,
  });

  // Sync form when data loads
  useState(() => {
    if (ecomSettings) {
      setSettingsForm({ enabled: ecomSettings.enabled ?? false, commission_rate: ecomSettings.commission_rate ?? 5 });
    }
  });

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data } = await query;
      return data || [];
    },
  });

  // Fetch payout requests
  const { data: payouts = [] } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payout_requests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch profiles for names
  const sellerIds = [...new Set(orders.map((o: any) => o.seller_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-order-profiles", sellerIds],
    queryFn: async () => {
      if (sellerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      return data || [];
    },
    enabled: sellerIds.length > 0,
  });

  const getProfileName = (uid: string) => profiles.find((p: any) => p.user_id === uid)?.full_name || "Adsız";

  const saveSettings = async () => {
    const { error } = await supabase.from("site_settings").upsert({
      key: "ecommerce",
      value: settingsForm as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tənzimləmələr saxlanıldı" });
      queryClient.invalidateQueries({ queryKey: ["ecommerce-settings"] });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "shipped") updates.shipped_at = new Date().toISOString();
    if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();
    if (newStatus === "cancelled") updates.cancelled_at = new Date().toISOString();

    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sifariş statusu yeniləndi" });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  };

  const approvePayout = async (payoutId: string, approve: boolean) => {
    const updates: any = {
      status: approve ? "approved" : "rejected",
      processed_at: new Date().toISOString(),
    };

    if (approve) {
      const payout = payouts.find((p: any) => p.id === payoutId);
      if (payout) {
        // Mark as completed (admin manually transfers money)
        updates.status = "completed";
      }
    }

    const { error } = await supabase.from("payout_requests").update(updates).eq("id", payoutId);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: approve ? "Payout təsdiqləndi" : "Payout rədd edildi" });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    }
  };

  const filteredOrders = orders.filter((o: any) => 
    !search || (o.order_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const pendingPayouts = payouts.filter((p: any) => p.status === "pending");
  const totalRevenue = orders.filter((o: any) => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.commission_amount), 0);

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> E-ticarət tənzimləmələri
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Birbaşa satış</p>
              <p className="text-xs text-muted-foreground">Mağazalar məhsul sata bilsin</p>
            </div>
            <Switch
              checked={settingsForm.enabled}
              onCheckedChange={(v) => setSettingsForm({ ...settingsForm, enabled: v })}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Komisiya faizi (%)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={settingsForm.commission_rate}
                onChange={(e) => setSettingsForm({ ...settingsForm, commission_rate: Number(e.target.value) })}
                className="h-9"
              />
            </div>
            <Button size="sm" className="mt-5" onClick={saveSettings}>Saxla</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Sifarişlər", value: orders.length, icon: ShoppingCart },
          { label: "Gözləyən", value: orders.filter((o: any) => o.status === "pending").length, icon: Clock },
          { label: "Payout istəyi", value: pendingPayouts.length, icon: DollarSign },
          { label: "Komisiya gəliri", value: `${totalRevenue.toFixed(2)} ₼`, icon: DollarSign },
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

      {/* Payout requests */}
      {pendingPayouts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pul çıxarışı istəkləri ({pendingPayouts.length})
          </h3>
          {pendingPayouts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{getProfileName(p.seller_id)}</p>
                  <p className="text-lg font-bold text-primary">{Number(p.amount).toFixed(2)} ₼</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.bank_name && `${p.bank_name} · `}{p.card_number || p.bank_account}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => approvePayout(p.id, true)}>
                    Təsdiqlə
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8" onClick={() => approvePayout(p.id, false)}>
                    Rədd et
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Orders */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Sifariş nömrəsi axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="pending">Gözləyir</SelectItem>
              <SelectItem value="confirmed">Təsdiqləndi</SelectItem>
              <SelectItem value="shipped">Göndərildi</SelectItem>
              <SelectItem value="delivered">Çatdırıldı</SelectItem>
              <SelectItem value="cancelled">Ləğv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Sifariş tapılmadı</p>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order: any) => {
              const status = statusMap[order.status] || statusMap.pending;
              return (
                <Card key={order.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">#{order.order_number}</p>
                        <p className="text-sm font-bold text-primary">{Number(order.total_amount).toFixed(2)} ₼</p>
                      </div>
                      <Badge className={`${status.color} border-0 text-[10px]`}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Satıcı: {getProfileName(order.seller_id)}</span>
                      <span>Komisiya: {Number(order.commission_amount).toFixed(2)} ₼</span>
                    </div>
                    <div className="flex gap-1.5">
                      {order.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderStatus(order.id, "confirmed")}>Təsdiqlə</Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateOrderStatus(order.id, "cancelled")}>Ləğv et</Button>
                        </>
                      )}
                      {order.status === "shipped" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderStatus(order.id, "delivered")}>Çatdırıldı</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderManager;
