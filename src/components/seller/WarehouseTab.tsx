import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, ScanBarcode, Package, Plus, Minus, RotateCcw,
  ArrowDownToLine, ArrowUpFromLine, History, BarChart3, AlertTriangle, Search
} from "lucide-react";

interface WarehouseTabProps {
  storeId: string;
}

const WarehouseTab = ({ storeId }: WarehouseTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [adjustDialog, setAdjustDialog] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"in" | "out" | "adjustment">("in");
  const [adjustNote, setAdjustNote] = useState("");
  const [searchText, setSearchText] = useState("");
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Fetch listings with stock info
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["warehouse-listings", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, image_urls, stock, barcode, price, currency, cost_price")
        .eq("store_id", storeId)
        .order("title");
      return data || [];
    },
    enabled: !!storeId,
  });

  // Fetch movement history
  const { data: movements = [] } = useQuery({
    queryKey: ["inventory-movements", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!storeId,
  });

  // Start barcode scanner
  const startScanner = useCallback(async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
        (decodedText: string) => {
          handleBarcodeScan(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err: any) {
      toast({ title: "Kamera xətası", description: err?.message || "Kamera açıla bilmədi", variant: "destructive" });
      setScanning(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleBarcodeScan = async (barcode: string) => {
    // Search for existing listing with this barcode
    const found = listings.find(l => l.barcode === barcode);
    if (found) {
      setScanResult({ type: "found", listing: found, barcode });
    } else {
      setScanResult({ type: "not_found", barcode });
    }
  };

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) return;
    handleBarcodeScan(manualBarcode.trim());
    setManualBarcode("");
  };

  const assignBarcode = async (listingId: string, barcode: string) => {
    const { error } = await supabase
      .from("listings")
      .update({ barcode } as any)
      .eq("id", listingId);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Barkod təyin edildi" });
      queryClient.invalidateQueries({ queryKey: ["warehouse-listings"] });
      setScanResult(null);
    }
  };

  const adjustStock = async () => {
    if (!adjustDialog || !adjustQty || Number(adjustQty) <= 0) return;
    const listing = adjustDialog;
    const qty = Number(adjustQty);
    const prevStock = listing.stock || 0;
    let newStock: number;

    if (adjustType === "in") newStock = prevStock + qty;
    else if (adjustType === "out") newStock = Math.max(0, prevStock - qty);
    else newStock = qty; // adjustment = set to exact

    // Update listing stock
    const { error: updateErr } = await supabase
      .from("listings")
      .update({ stock: newStock })
      .eq("id", listing.id);

    if (updateErr) {
      toast({ title: "Xəta", description: updateErr.message, variant: "destructive" });
      return;
    }

    // Record movement
    await supabase.from("inventory_movements").insert({
      store_id: storeId,
      listing_id: listing.id,
      user_id: user!.id,
      movement_type: adjustType,
      quantity: qty,
      previous_stock: prevStock,
      new_stock: newStock,
      note: adjustNote || null,
      barcode: listing.barcode || null,
    } as any);

    toast({ title: "Stok yeniləndi", description: `${listing.title}: ${prevStock} → ${newStock}` });
    queryClient.invalidateQueries({ queryKey: ["warehouse-listings"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    setAdjustDialog(null);
    setAdjustQty("");
    setAdjustNote("");
  };

  // Stats
  const totalItems = listings.reduce((s, l) => s + (l.stock || 0), 0);
  const totalValue = listings.reduce((s, l) => s + (l.stock || 0) * Number(l.cost_price || l.price || 0), 0);
  const lowStock = listings.filter(l => (l.stock || 0) > 0 && (l.stock || 0) <= 3);
  const outOfStock = listings.filter(l => (l.stock || 0) === 0);

  const filteredListings = listings.filter(l =>
    !searchText || l.title?.toLowerCase().includes(searchText.toLowerCase()) || l.barcode?.includes(searchText)
  );

  const getListingTitle = (id: string) => listings.find(l => l.id === id)?.title || "Məhsul";

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-primary">{totalItems}</p>
          <p className="text-[10px] text-muted-foreground">Ümumi stok</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalValue.toFixed(0)} ₼</p>
          <p className="text-[10px] text-muted-foreground">Anbar dəyəri</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-amber-500">{lowStock.length}</p>
          <p className="text-[10px] text-muted-foreground">Az qalıb</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-destructive">{outOfStock.length}</p>
          <p className="text-[10px] text-muted-foreground">Bitib</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="scanner" className="flex-1 gap-1 text-xs"><ScanBarcode className="h-3.5 w-3.5" />Skan</TabsTrigger>
          <TabsTrigger value="stock" className="flex-1 gap-1 text-xs"><Package className="h-3.5 w-3.5" />Stok</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1 text-xs"><History className="h-3.5 w-3.5" />Tarixçə</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 gap-1 text-xs"><BarChart3 className="h-3.5 w-3.5" />Hesabat</TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Barkod daxil edin..."
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManualSearch()}
                  className="h-9"
                />
                <Button size="sm" className="h-9 gap-1" onClick={handleManualSearch}>
                  <Search className="h-3.5 w-3.5" /> Axtar
                </Button>
              </div>

              <div className="relative">
                <div id="barcode-reader" className="w-full overflow-hidden rounded-lg" style={{ minHeight: scanning ? 250 : 0 }} />
                {!scanning && (
                  <Button className="w-full gap-2" onClick={startScanner}>
                    <ScanBarcode className="h-4 w-4" /> Kameranı aç və skan et
                  </Button>
                )}
                {scanning && (
                  <Button variant="destructive" className="w-full mt-2" onClick={stopScanner}>
                    Skaneri bağla
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scan result */}
          {scanResult && (
            <Card className="border-primary">
              <CardContent className="p-4 space-y-3">
                {scanResult.type === "found" ? (
                  <>
                    <div className="flex items-center gap-3">
                      {scanResult.listing.image_urls?.[0] && (
                        <img src={scanResult.listing.image_urls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{scanResult.listing.title}</p>
                        <p className="text-xs text-muted-foreground">Barkod: {scanResult.barcode}</p>
                        <p className="text-sm font-bold text-primary">Stok: {scanResult.listing.stock || 0}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                        setAdjustDialog(scanResult.listing);
                        setAdjustType("in");
                        setScanResult(null);
                      }}>
                        <ArrowDownToLine className="h-3.5 w-3.5" /> Giriş
                      </Button>
                      <Button size="sm" className="flex-1 gap-1" variant="destructive" onClick={() => {
                        setAdjustDialog(scanResult.listing);
                        setAdjustType("out");
                        setScanResult(null);
                      }}>
                        <ArrowUpFromLine className="h-3.5 w-3.5" /> Çıxış
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="text-sm font-semibold">Barkod tapılmadı: {scanResult.barcode}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bu barkodu mövcud bir məhsula təyin edə və ya yeni elan yarada bilərsiniz
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {listings.slice(0, 10).map(l => (
                        <button
                          key={l.id}
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-muted transition-colors"
                          onClick={() => assignBarcode(l.id, scanResult.barcode)}
                        >
                          {l.image_urls?.[0] && <img src={l.image_urls[0]} alt="" className="h-8 w-8 rounded object-cover" />}
                          <span className="text-xs font-medium truncate flex-1">{l.title}</span>
                          <Badge variant="secondary" className="text-[9px]">Təyin et</Badge>
                        </button>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => {
                      window.open(`/create-listing?barcode=${scanResult.barcode}`, "_blank");
                      setScanResult(null);
                    }}>
                      <Plus className="h-3.5 w-3.5" /> Yeni elan yarat
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="w-full" onClick={() => setScanResult(null)}>Bağla</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-3">
          <Input
            placeholder="Məhsul adı və ya barkod axtar..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="h-9"
          />
          {filteredListings.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Package className="mx-auto h-8 w-8 opacity-40 mb-2" />
              Məhsul tapılmadı
            </CardContent></Card>
          ) : (
            <div className="space-y-1.5">
              {filteredListings.map(l => {
                const stock = l.stock || 0;
                const isLow = stock > 0 && stock <= 3;
                const isOut = stock === 0;
                return (
                  <Card key={l.id} className={isOut ? "border-destructive/30" : isLow ? "border-amber-500/30" : ""}>
                    <CardContent className="flex items-center gap-3 p-2.5">
                      {l.image_urls?.[0] ? (
                        <img src={l.image_urls[0]} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{l.title}</p>
                        {l.barcode && <p className="text-[10px] text-muted-foreground">📊 {l.barcode}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[10px] ${isOut ? "bg-destructive/20 text-destructive" : isLow ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"}`}>
                          {stock} ədəd
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setAdjustDialog(l);
                          setAdjustType("in");
                        }}>
                          <Plus className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setAdjustDialog(l);
                          setAdjustType("out");
                        }}>
                          <Minus className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-2">
          {movements.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              <History className="mx-auto h-8 w-8 opacity-40 mb-2" />
              Hələ hərəkət yoxdur
            </CardContent></Card>
          ) : (
            movements.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 p-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    m.movement_type === "in" ? "bg-green-500/20" : m.movement_type === "out" ? "bg-destructive/20" : "bg-blue-500/20"
                  }`}>
                    {m.movement_type === "in" ? <ArrowDownToLine className="h-4 w-4 text-green-600" /> :
                     m.movement_type === "out" ? <ArrowUpFromLine className="h-4 w-4 text-destructive" /> :
                     <RotateCcw className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{getListingTitle(m.listing_id)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.previous_stock} → {m.new_stock} ({m.movement_type === "in" ? "+" : m.movement_type === "out" ? "-" : "="}{m.quantity})
                    </p>
                    {m.note && <p className="text-[10px] text-muted-foreground">📝 {m.note}</p>}
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">Anbar xülasəsi</CardTitle></CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ümumi məhsul növü</span>
                <span className="font-semibold">{listings.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ümumi stok</span>
                <span className="font-semibold">{totalItems} ədəd</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Anbar dəyəri (maya/qiymət)</span>
                <span className="font-semibold">{totalValue.toFixed(2)} ₼</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Son 30 gün giriş</span>
                <span className="font-semibold text-green-600">
                  +{movements.filter((m: any) => m.movement_type === "in" && new Date(m.created_at) > new Date(Date.now() - 30 * 86400000)).reduce((s: number, m: any) => s + m.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Son 30 gün çıxış</span>
                <span className="font-semibold text-destructive">
                  -{movements.filter((m: any) => m.movement_type === "out" && new Date(m.created_at) > new Date(Date.now() - 30 * 86400000)).reduce((s: number, m: any) => s + m.quantity, 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {lowStock.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> Az qalan məhsullar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                {lowStock.map(l => (
                  <div key={l.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1">{l.title}</span>
                    <Badge className="bg-amber-500/20 text-amber-600 text-[9px]">{l.stock} ədəd</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {outOfStock.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Bitmiş məhsullar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                {outOfStock.map(l => (
                  <div key={l.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1">{l.title}</span>
                    <Badge className="bg-destructive/20 text-destructive text-[9px]">0 ədəd</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={o => { if (!o) setAdjustDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {adjustType === "in" ? "Stok girişi" : adjustType === "out" ? "Stok çıxışı" : "Stok düzəlişi"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {adjustDialog?.title} — Cari stok: {adjustDialog?.stock || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Əməliyyat növü</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Giriş (stok artır)</SelectItem>
                  <SelectItem value="out">Çıxış (stok azalt)</SelectItem>
                  <SelectItem value="adjustment">Düzəliş (dəqiq say təyin et)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{adjustType === "adjustment" ? "Yeni stok sayı" : "Miqdar"}</Label>
              <Input
                type="number"
                min="0"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Qeyd (ixtiyari)</Label>
              <Input
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Yeni partiya, qaytarma və s."
                className="h-9"
              />
            </div>
            <Button className="w-full" disabled={!adjustQty || Number(adjustQty) < 0} onClick={adjustStock}>
              {adjustType === "in" ? <ArrowDownToLine className="h-4 w-4 mr-1.5" /> :
               adjustType === "out" ? <ArrowUpFromLine className="h-4 w-4 mr-1.5" /> :
               <RotateCcw className="h-4 w-4 mr-1.5" />}
              Təsdiqlə
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseTab;
