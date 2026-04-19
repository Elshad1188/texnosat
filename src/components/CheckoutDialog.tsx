import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Truck, MapPin, ShoppingCart, CheckCircle, Wallet } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    user_id: string;
    store_id: string | null;
    image_urls: string[] | null;
    custom_fields?: any;
  };
}

const CheckoutDialog = ({ open, onOpenChange, listing }: CheckoutDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<"shipping" | "payment" | "confirm" | "success">("shipping");
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "balance">("card");
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);

  // Fetch shipping methods for this store (filtered by listing's selected methods)
  const { data: allShippingMethods = [] } = useQuery({
    queryKey: ["shipping-methods", listing.store_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("store_id", listing.store_id!)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!listing.store_id && open,
  });

  // Filter to only listing's selected shipping methods (if specified)
  const listingShippingIds = listing.custom_fields?._shipping_methods;
  const shippingMethods = Array.isArray(listingShippingIds) && listingShippingIds.length > 0
    ? allShippingMethods.filter((m: any) => listingShippingIds.includes(m.id))
    : allShippingMethods;

  // Fetch ecommerce settings (commission + balance payment toggle)
  const { data: ecomSettings } = useQuery({
    queryKey: ["ecommerce-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ecommerce").maybeSingle();
      return (data?.value as any) || { commission_rate: 5, balance_payment_enabled: false };
    },
    enabled: open,
  });

  // Fetch user balance
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user && open,
  });

  const commissionRate = ecomSettings?.commission_rate || 5;
  const balancePaymentEnabled = ecomSettings?.balance_payment_enabled === true;
  const userBalance = userProfile?.balance || 0;
  const selectedShippingMethod = shippingMethods.find((s: any) => s.id === selectedShipping);
  const shippingPrice = selectedShippingMethod?.price || 0;
  const unitPrice = listing.price;
  const subtotal = unitPrice * quantity;
  const commissionAmount = (subtotal * commissionRate) / 100;
  const totalAmount = subtotal + shippingPrice;
  const canAffordWithBalance = userBalance >= totalAmount;

  const handleOrder = async () => {
    if (!user) return;
    setProcessing(true);

    try {
      if (paymentMethod === "balance") {
        // Pay with balance
        const { data: spent, error: spendErr } = await supabase.rpc("spend_balance", {
          _user_id: user.id,
          _amount: totalAmount,
          _description: `Sifariş ödənişi: ${listing.title}`,
        });

        if (spendErr || !spent) {
          toast({ title: "Balans kifayət deyil", description: "Balansınızda kifayət qədər vəsait yoxdur.", variant: "destructive" });
          setProcessing(false);
          return;
        }

        // Create order as paid
        const { error } = await supabase.from("orders").insert({
          buyer_id: user.id,
          seller_id: listing.user_id,
          store_id: listing.store_id,
          listing_id: listing.id,
          quantity,
          unit_price: unitPrice,
          shipping_price: shippingPrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          total_amount: totalAmount,
          payment_method: "balance",
          shipping_method_id: selectedShipping || null,
          shipping_address: shippingAddress,
          buyer_note: buyerNote || null,
          status: "confirmed",
          paid_at: new Date().toISOString(),
        } as any);

        if (error) throw error;

        setStep("success");
      } else {
        // Card payment via Epoint
        const { data: newOrder, error } = await supabase.from("orders").insert({
          buyer_id: user.id,
          seller_id: listing.user_id,
          store_id: listing.store_id,
          listing_id: listing.id,
          quantity,
          unit_price: unitPrice,
          shipping_price: shippingPrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          total_amount: totalAmount,
          payment_method: "card",
          shipping_method_id: selectedShipping || null,
          shipping_address: shippingAddress,
          buyer_note: buyerNote || null,
          status: "pending",
        } as any).select("id").single();

        if (error) throw error;

        const { data: epointData, error: epointError } = await supabase.functions.invoke("epoint-payment", {
          body: {
            order_id: newOrder.id,
            amount: totalAmount,
            description: `Sifariş: ${listing.title}`,
          },
        });

        if (epointError || !epointData?.success) {
          toast({ title: "Ödəniş xətası", description: epointData?.error || "Epoint ilə əlaqə yaradıla bilmədi", variant: "destructive" });
          return;
        }

        window.location.href = epointData.redirect_url;
      }
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const resetDialog = () => {
    setStep("shipping");
    setSelectedShipping("");
    setShippingAddress("");
    setBuyerNote("");
    setPaymentMethod("card");
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetDialog(); onOpenChange(o); }}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {step === "success" ? "Sifariş tamamlandı" : "Sifariş ver"}
          </DialogTitle>
          <DialogDescription>
            {step === "shipping" && "Çatdırılma üsulunu seçin"}
            {step === "payment" && "Ödəniş üsulunu seçin"}
            {step === "confirm" && "Sifarişi təsdiqləyin"}
            {step === "success" && "Sifarişiniz uğurla yaradıldı"}
          </DialogDescription>
        </DialogHeader>

        {/* Product summary */}
        {step !== "success" && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            {listing.image_urls?.[0] && (
              <img src={listing.image_urls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
              <p className="text-lg font-bold text-primary">{unitPrice} {listing.currency}</p>
            </div>
          </div>
        )}

        {/* Step 1: Shipping */}
        {step === "shipping" && (
          <div className="space-y-4">
            {shippingMethods.length > 0 ? (
              <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping}>
                {shippingMethods.map((sm: any) => (
                  <div key={sm.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value={sm.id} id={sm.id} />
                    <Label htmlFor={sm.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{sm.name}</p>
                          {sm.description && <p className="text-xs text-muted-foreground">{sm.description}</p>}
                          {sm.estimated_days && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Truck className="h-3 w-3" /> {sm.estimated_days}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-bold">
                          {sm.price > 0 ? `${sm.price} ₼` : "Pulsuz"}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bu mağaza üçün çatdırılma üsulu mövcud deyil.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Çatdırılma ünvanı</Label>
              <Textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Tam ünvanınızı daxil edin..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Qeyd (ixtiyari)</Label>
              <Input
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                placeholder="Satıcıya qeyd..."
              />
            </div>

            <Button
              className="w-full"
              disabled={shippingMethods.length > 0 && !selectedShipping || !shippingAddress.trim()}
              onClick={() => setStep("payment")}
            >
              Davam et
            </Button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === "payment" && (
          <div className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "balance")}>
              {/* Card option - always available */}
              <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="card" id="pay-card" />
                <Label htmlFor="pay-card" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Kart ilə ödəniş</p>
                      <p className="text-xs text-muted-foreground">Epoint vasitəsilə təhlükəsiz onlayn ödəniş</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Balance option - only if admin enabled */}
              {balancePaymentEnabled && (
                <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 ${paymentMethod === "balance" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="balance" id="pay-balance" disabled={!canAffordWithBalance} />
                  <Label htmlFor="pay-balance" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Balans ilə ödəniş</p>
                        <p className="text-xs text-muted-foreground">
                          Balansınız: <span className={canAffordWithBalance ? "text-green-600 font-bold" : "text-destructive font-bold"}>{userBalance.toFixed(2)} ₼</span>
                          {!canAffordWithBalance && <span className="text-destructive ml-1">(kifayət deyil)</span>}
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>

            {!balancePaymentEnabled && (
              <p className="text-xs text-muted-foreground text-center">
                Hazırda yalnız kart ilə ödəniş dəstəklənir.
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("shipping")}>Geri</Button>
              <Button className="flex-1" onClick={() => setStep("confirm")}>
                Davam et
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Məhsul</span><span className="font-medium">{subtotal.toFixed(2)} ₼</span></div>
              {shippingPrice > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Çatdırılma</span><span className="font-medium">{shippingPrice.toFixed(2)} ₼</span></div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>Cəmi</span><span className="text-primary">{totalAmount.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
              <p><strong>Ödəniş:</strong> {paymentMethod === "balance" ? "Balans ilə" : "Kart ilə (Epoint)"}</p>
              {selectedShippingMethod && <p><strong>Çatdırılma:</strong> {selectedShippingMethod.name}</p>}
              <p><strong>Ünvan:</strong> {shippingAddress}</p>
              {buyerNote && <p><strong>Qeyd:</strong> {buyerNote}</p>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("payment")}>Geri</Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={processing}
                onClick={handleOrder}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Sifarişi təsdiqlə</>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Sifarişiniz qəbul edildi!</h3>
              <p className="text-sm text-muted-foreground mt-1">Satıcı sifarişinizi təsdiqləyəcək və sizə bildiriş göndərəcək.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { resetDialog(); onOpenChange(false); }}>Bağla</Button>
              <Button className="flex-1" onClick={() => { resetDialog(); onOpenChange(false); navigate("/orders"); }}>
                Sifarişlərim
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
