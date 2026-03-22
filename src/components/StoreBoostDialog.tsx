import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Crown, Loader2, Wallet, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface StoreBoostDialogProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_STORE_PRICE = 20;

const StoreBoostDialog = ({ storeId, storeName, open, onOpenChange }: StoreBoostDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-general"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      return (data?.value as any) || {};
    },
  });

  const price = siteSettings?.store_premium_price !== undefined ? Number(siteSettings.store_premium_price) : DEFAULT_STORE_PRICE;
  const balance = Number((profile as any)?.balance || 0);
  const canAfford = balance >= price;

  const isAlreadyPremium = !!(queryClient.getQueryData(["store", storeId]) as any)?.is_premium;

  const handleUpgrade = async () => {
    if (!user) return;
    if (!canAfford || isAlreadyPremium) {
      toast({ title: isAlreadyPremium ? "Artıq Premiumdur" : "Balans kifayət deyil", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const { data: success } = await supabase.rpc("spend_balance", {
        _user_id: user.id,
        _amount: price,
        _description: `Mağaza Premium: ${storeName} (30 gün)`,
        _reference_id: storeId,
      });

      if (!success) {
        toast({ title: "Balans kifayət deyil", variant: "destructive" });
        return;
      }

      const premiumUntil = new Date(Date.now() + 30 * 86400000).toISOString();
      await supabase.from("stores").update({ 
        is_premium: true, 
        premium_until: premiumUntil 
      }).eq("id", storeId);

      toast({ title: "Mağazanız Premium-a yüksəldildi!" });
      queryClient.invalidateQueries({ queryKey: ["profile-balance"] });
      queryClient.invalidateQueries({ queryKey: ["store", storeId] });
      queryClient.invalidateQueries({ queryKey: ["my-stores"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mağazanızı yüksəldin</DialogTitle>
          <DialogDescription>
            Premium mağaza ilə daha çox müştəri qazanın və fərqlənin
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Balansınız:</span>
          <span className="text-sm font-bold text-primary">{balance.toFixed(2)} ₼</span>
          <Link to="/balance" className="ml-auto text-xs text-primary hover:underline">Artır</Link>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground font-display text-lg">Premium Mağaza</h3>
                <Badge className="bg-primary text-primary-foreground">30 gün</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  "Mağaza adının yanında qızılı Premium nişanı",
                  "Axtarış nəticələrində ön planda görünmə",
                  "Mağazalar siyahısında ən yuxarıda göstərilmə",
                  "Müştərilərin etibarını qazanma"
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                    <CheckCircle className="h-3 w-3 text-primary" /> {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t border-primary/10 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Qiymət:</span>
            <span className="text-2xl font-bold text-primary">{price} ₼</span>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:opacity-90 py-6 text-base font-bold shadow-lg shadow-primary/20"
            disabled={!canAfford || processing || isAlreadyPremium}
            onClick={handleUpgrade}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isAlreadyPremium ? (
              "Artıq Premiumdur"
            ) : canAfford ? (
              "İndi Yüksəlt"
            ) : (
              "Balans kifayət deyil"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreBoostDialog;
