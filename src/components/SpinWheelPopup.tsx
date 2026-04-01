import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SpinWheelPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["spin-popup-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("last_spin_at")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: hasActivePrizes } = useQuery({
    queryKey: ["spin-popup-prizes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("spin_prizes")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return (count || 0) > 0;
    },
  });

  const canSpin = () => {
    if (!profile?.last_spin_at) return true;
    const lastSpin = new Date(profile.last_spin_at).getTime();
    const now = Date.now();
    return now - lastSpin >= 24 * 60 * 60 * 1000;
  };

  useEffect(() => {
    if (!user || dismissed) return;
    if (!hasActivePrizes) return;

    const sessionKey = `spin_popup_shown_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    if (canSpin()) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem(sessionKey, "1");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, hasActivePrizes, dismissed]);

  if (!user || !hasActivePrizes) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm text-center border-border bg-card">
        <DialogTitle className="sr-only">Hədiyyə Çarxı</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">
            Hədiyyə Çarxınız hazırdır! 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            Bu gün çarxı çevirərək hədiyyə qazana bilərsiniz. Şansınızı sınayın!
          </p>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                setDismissed(true);
              }}
            >
              Sonra
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:opacity-90"
              onClick={() => {
                setOpen(false);
                navigate("/spin-win");
              }}
            >
              <Trophy className="h-4 w-4 mr-1" />
              Çarxı çevir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpinWheelPopup;
