import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Search, TrendingUp, ArrowUpCircle, ShoppingBag, Loader2 } from "lucide-react";

interface BalanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const AdminEpointManager = () => {
  const [topups, setTopups] = useState<BalanceTransaction[]>([]);
  const [cardOrders, setCardOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "topup" | "order">("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, oRes, pRes] = await Promise.all([
      supabase
        .from("balance_transactions")
        .select("*")
        .eq("type", "credit")
        .ilike("description", "%kart%")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("orders")
        .select("*")
        .eq("payment_method", "card")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    if (tRes.data) setTopups(tRes.data);
    if (oRes.data) setCardOrders(oRes.data as Order[]);
    if (pRes.data) setProfiles(pRes.data);
    setLoading(false);
  };

  const getName = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.full_name || "Adsız";

  const totalTopup = topups.reduce((s, t) => s + t.amount, 0);
  const totalOrders = cardOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0);
  const successOrders = cardOrders.filter((o) => o.paid_at).length;

  const q = search.toLowerCase();

  const filteredTopups = topups.filter((t) =>
    getName(t.user_id).toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
  );
  const filteredOrders = cardOrders.filter((o) =>
    getName(o.buyer_id).toLowerCase().includes(q) || o.order_number.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold text-foreground">{(totalTopup + totalOrders).toFixed(2)} ₼</p>
            <p className="text-xs text-muted-foreground">Ümumi dövriyyə</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowUpCircle className="mx-auto mb-1 h-5 w-5 text-green-500" />
            <p className="text-lg font-bold text-foreground">{totalTopup.toFixed(2)} ₼</p>
            <p className="text-xs text-muted-foreground">Balans artırma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="mx-auto mb-1 h-5 w-5 text-blue-500" />
            <p className="text-lg font-bold text-foreground">{totalOrders.toFixed(2)} ₼</p>
            <p className="text-xs text-muted-foreground">Sifariş ödənişləri</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="mx-auto mb-1 h-5 w-5 text-amber-500" />
            <p className="text-lg font-bold text-foreground">{topups.length + successOrders}</p>
            <p className="text-xs text-muted-foreground">Uğurlu əməliyyat</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hamısı</SelectItem>
            <SelectItem value="topup">Balans artırma</SelectItem>
            <SelectItem value="order">Sifariş ödənişi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topups */}
      {(filter === "all" || filter === "topup") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              Balans artırma ({filteredTopups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İstifadəçi</TableHead>
                    <TableHead>Məbləğ</TableHead>
                    <TableHead>Açıqlama</TableHead>
                    <TableHead>Tarix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Nəticə tapılmadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTopups.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{getName(t.user_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            +{t.amount} ₼
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {t.description}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString("az-AZ")} {new Date(t.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card Orders */}
      {(filter === "all" || filter === "order") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              Kart ilə sifariş ödənişləri ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sifariş №</TableHead>
                    <TableHead>Alıcı</TableHead>
                    <TableHead>Məbləğ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nəticə tapılmadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="font-medium">{getName(o.buyer_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            {o.total_amount} ₼
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={o.paid_at ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {o.paid_at ? "Ödənilib" : o.status === "cancelled" ? "Ləğv" : "Gözləyir"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString("az-AZ")} {new Date(o.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminEpointManager;
