import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, ShoppingCart, Truck, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Gözləyir", color: "bg-yellow-500/20 text-yellow-600", icon: Clock },
  confirmed: { label: "Təsdiqləndi", color: "bg-blue-500/20 text-blue-600", icon: Package },
  shipped: { label: "Göndərildi", color: "bg-purple-500/20 text-purple-600", icon: Truck },
  delivered: { label: "Çatdırıldı", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  cancelled: { label: "Ləğv edildi", color: "bg-red-500/20 text-red-600", icon: XCircle },
  refunded: { label: "Geri qaytarıldı", color: "bg-gray-500/20 text-gray-600", icon: XCircle },
};

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: buyOrders = [], isLoading: loadingBuy } = useQuery({
    queryKey: ["my-buy-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: sellOrders = [], isLoading: loadingSell } = useQuery({
    queryKey: ["my-sell-orders", user?.id],
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

  // Fetch listing info for orders
  const allListingIds = [...new Set([...buyOrders, ...sellOrders].map((o: any) => o.listing_id).filter(Boolean))];
  const { data: listings = [] } = useQuery({
    queryKey: ["order-listings", allListingIds],
    queryFn: async () => {
      if (allListingIds.length === 0) return [];
      const { data } = await supabase.from("listings").select("id, title, image_urls").in("id", allListingIds);
      return data || [];
    },
    enabled: allListingIds.length > 0,
  });

  if (!user) { navigate("/auth"); return null; }

  const isLoading = loadingBuy || loadingSell;

  const renderOrder = (order: any) => {
    const listing = listings.find((l: any) => l.id === order.listing_id);
    const status = statusMap[order.status] || statusMap.pending;
    const StatusIcon = status.icon;

    return (
      <Card key={order.id} className="overflow-hidden">
        <CardContent className="flex items-center gap-3 p-3">
          <Link to={order.listing_id ? `/product/${order.listing_id}` : "#"} className="shrink-0">
            {listing?.image_urls?.[0] ? (
              <img src={listing.image_urls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {listing?.title || "Məhsul"}
            </p>
            <p className="text-sm font-bold text-primary">{Number(order.total_amount).toFixed(2)} ₼</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`${status.color} border-0 text-[10px] gap-1`}>
                <StatusIcon className="h-3 w-3" /> {status.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString("az")}
              </span>
            </div>
            {order.tracking_number && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Truck className="h-3 w-3" /> İzləmə: {order.tracking_number}
              </p>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            #{order.order_number}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Sifarişlərim</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="purchases">
            <TabsList className="w-full">
              <TabsTrigger value="purchases" className="flex-1 gap-1 text-xs">
                <ShoppingCart className="h-3.5 w-3.5" /> Aldıqlarım ({buyOrders.length})
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex-1 gap-1 text-xs">
                <Package className="h-3.5 w-3.5" /> Satdıqlarım ({sellOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              {buyOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Hələ sifariş verməmisiniz</p>
                  <Button className="mt-4" asChild><Link to="/products">Məhsullara bax</Link></Button>
                </div>
              ) : (
                <div className="space-y-2">{buyOrders.map(renderOrder)}</div>
              )}
            </TabsContent>

            <TabsContent value="sales" className="mt-4">
              {sellOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Hələ satış yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">{sellOrders.map(renderOrder)}</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
