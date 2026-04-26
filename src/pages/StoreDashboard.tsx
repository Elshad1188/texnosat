import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformMode } from "@/hooks/usePlatformMode";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingBoostDialog from "@/components/ListingBoostDialog";
import StoreHeader from "@/components/seller/StoreHeader";
import StoreStats from "@/components/seller/StoreStats";
import StoreListingsTab from "@/components/seller/StoreListingsTab";
import StoreFollowersTab from "@/components/seller/StoreFollowersTab";
import BulkListingUpload from "@/components/BulkListingUpload";
import SellerOrdersTab from "@/components/seller/SellerOrdersTab";
import ShippingMethodsTab from "@/components/seller/ShippingMethodsTab";
import TelegramBotTab from "@/components/seller/TelegramBotTab";
import WarehouseTab from "@/components/seller/WarehouseTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store, Package, Users, Plus, Loader2, ShoppingCart, Truck, Bot, Warehouse, Upload,
} from "lucide-react";

const StoreDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const platform = usePlatformMode();
  const [boostListingId, setBoostListingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const storeIdParam = searchParams.get("id");

  const { data: store, isLoading } = useQuery({
    queryKey: ["my-store", user?.id, storeIdParam],
    queryFn: async () => {
      let query = supabase.from("stores").select("*").eq("user_id", user!.id);
      if (storeIdParam) query = query.eq("id", storeIdParam);
      const { data } = await query.order("created_at", { ascending: false }).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["store-dashboard-listings", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings").select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["store-followers", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_followers").select("id, user_id, created_at")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: followerProfiles = [] } = useQuery({
    queryKey: ["follower-profiles", followers.map(f => f.user_id)],
    queryFn: async () => {
      if (followers.length === 0) return [];
      const { data } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url, city")
        .in("user_id", followers.map(f => f.user_id));
      return data || [];
    },
    enabled: followers.length > 0,
  });

  if (!user) { navigate("/auth"); return null; }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center py-32 text-center px-4">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Hələ agentliyiniz yoxdur</h1>
          <p className="mt-2 text-sm text-muted-foreground">Daşınmaz əmlak agentliyi yaradın və elanlarınızı idarə edin</p>
          <Button className="mt-6 bg-gradient-primary text-primary-foreground" asChild>
            <Link to="/create-store">Agentlik yarat</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);
  const activeCount = listings.filter(l => l.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 max-w-2xl">
        <StoreHeader store={store} userId={user.id} />
        <StoreStats
          listingsCount={listings.length}
          activeCount={activeCount}
          totalViews={totalViews}
          followersCount={followers.length}
        />

        <Tabs defaultValue="listings" className="space-y-3">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-4 h-auto gap-0.5 p-1">
            <TabsTrigger value="listings" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-3 w-3" />Obyektlər
            </TabsTrigger>
            {platform.showWarehouse && (
              <TabsTrigger value="warehouse" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Warehouse className="h-3 w-3" />Anbar
              </TabsTrigger>
            )}
            {platform.showOrders && (
              <TabsTrigger value="orders" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShoppingCart className="h-3 w-3" />Müraciətlər
              </TabsTrigger>
            )}
            {platform.showShipping && (
              <TabsTrigger value="shipping" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Truck className="h-3 w-3" />Çatdırılma
              </TabsTrigger>
            )}
            <TabsTrigger value="followers" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3" />Müştərilər
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="h-3 w-3" />Toplu
            </TabsTrigger>
            {platform.showTelegramBot && (
              <TabsTrigger value="telegram" className="gap-1 text-[11px] px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bot className="h-3 w-3" />Bot
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="listings">
            <StoreListingsTab listings={listings} onBoost={setBoostListingId} />
          </TabsContent>

          {platform.showWarehouse && (
            <TabsContent value="warehouse">
              <WarehouseTab storeId={store.id} />
            </TabsContent>
          )}

          {platform.showOrders && (
            <TabsContent value="orders">
              <SellerOrdersTab storeId={store.id} />
            </TabsContent>
          )}

          {platform.showShipping && (
            <TabsContent value="shipping">
              <ShippingMethodsTab storeId={store.id} />
            </TabsContent>
          )}

          <TabsContent value="followers">
            <StoreFollowersTab followers={followers} followerProfiles={followerProfiles} />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkListingUpload storeId={store.id} />
          </TabsContent>

          {platform.showTelegramBot && (
            <TabsContent value="telegram">
              <TelegramBotTab storeId={store.id} />
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />

      {boostListingId && (
        <ListingBoostDialog
          listingId={boostListingId}
          open={!!boostListingId}
          onOpenChange={(open) => { if (!open) setBoostListingId(null); }}
        />
      )}
    </div>
  );
};

export default StoreDashboard;
