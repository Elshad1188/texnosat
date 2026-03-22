import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Crown, Zap, Star, Loader2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

interface ListingBoostDialogProps {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_PRICES = {
  premium: 5,
  urgent: 3,
  vip: 10,
};


const ListingBoostDialog = ({ listingId, open, onOpenChange }: ListingBoostDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);

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

  const getPrice = (key: keyof typeof DEFAULT_PRICES) => {
    const settingKey = `${key}_price`;
    return siteSettings?.[settingKey] !== undefined ? Number(siteSettings[settingKey]) : DEFAULT_PRICES[key];
  };

  const boostOptions = [
    {
      key: "premium",
      label: "Premium elan",
      description: "Elanınız axtarış nəticələrində birinci sırada göstərilir",
      price: getPrice("premium"),
      duration: "7 gün",
      icon: Crown,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      key: "urgent",
      label: "Təcili elan",
      description: "Elanınız \"Təcili\" etiketi ilə fərqlənir",
      price: getPrice("urgent"),
      duration: "7 gün",
      icon: Zap,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      key: "vip",
      label: "VIP elan",
      description: "Premium + Təcili birlikdə, ana səhifədə önə çıxarılır",
      price: getPrice("vip"),
      duration: "14 gün",
      icon: Star,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const balance = Number((profile as any)?.balance || 0);

  const handleBoost = async (option: typeof boostOptions[0]) => {
    if (!user) return;
    if (balance < option.price) {
      toast({ title: "Balans kifayət deyil", description: "Balansınızı artırın", variant: "destructive" });
      return;
    }

    setProcessing(option.key);
    try {
      const { data: success } = await supabase.rpc("spend_balance", {
        _user_id: user.id,
        _amount: option.price,
        _description: `${option.label} - ${option.duration}`,
        _reference_id: listingId,
      });

      if (!success) {
        toast({ title: "Balans kifayət deyil", variant: "destructive" });
        return;
      }

      const durationDays = option.key === "vip" ? 14 : 7;
      const premiumUntil = new Date(Date.now() + durationDays * 86400000).toISOString();

      const updateData: any = { premium_until: premiumUntil };
      if (option.key === "premium" || option.key === "vip") updateData.is_premium = true;
      if (option.key === "urgent" || option.key === "vip") updateData.is_urgent = true;

      await supabase.from("listings").update(updateData).eq("id", listingId);

      toast({ title: `${option.label} aktivləşdirildi!` });
      queryClient.invalidateQueries({ queryKey: ["profile-balance"] });
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Elanı yüksəlt</DialogTitle>
          <DialogDescription>
            Elanınızı daha çox insana çatdırmaq üçün bir paket seçin
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Balansınız:</span>
          <span className="text-sm font-bold text-primary">{balance.toFixed(2)} ₼</span>
          <Link to="/balance" className="ml-auto text-xs text-primary hover:underline">Artır</Link>
        </div>

        <div className="space-y-3">
          {boostOptions.map((opt) => {
            const Icon = opt.icon;
            const canAfford = balance >= opt.price;
            return (
              <div
                key={opt.key}
                className={`rounded-xl border border-border p-4 transition-colors ${canAfford ? "hover:border-primary/50" : "opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${opt.bg}`}>
                    <Icon className={`h-5 w-5 ${opt.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{opt.label}</h3>
                      <Badge variant="outline" className="text-[10px]">{opt.duration}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{opt.price} ₼</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-gradient-primary text-primary-foreground"
                  disabled={!canAfford || !!processing}
                  onClick={() => handleBoost(opt)}
                >
                  {processing === opt.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : canAfford ? (
                    "Aktivləşdir"
                  ) : (
                    "Balans kifayət deyil"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingBoostDialog;
