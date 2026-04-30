import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { enablePushNotifications, isInPreviewOrIframe, isPushSupported } from "@/lib/firebase";
import { toast } from "sonner";

const DISMISS_KEY = "push_prompt_dismissed_at";
const DISMISS_DAYS = 3;

const PushPermissionPrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (isInPreviewOrIframe()) return;
    if (Notification.permission !== "default") return; // already granted/denied
    if (isIOS && !isStandalone) return; // iOS needs PWA install first

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, [user, isIOS, isStandalone]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const handleEnable = async () => {
    if (!user) return;
    setLoading(true);
    const result = await enablePushNotifications(user.id);
    setLoading(false);

    if (result.ok) {
      toast.success("Bildirişlər aktiv edildi", {
        description: "Artıq mesaj və elan bildirişləri alacaqsınız.",
      });
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setOpen(false);
      return;
    }

    if (result.reason === "denied") {
      toast.error("İcazə verilmədi", {
        description: "Brauzer parametrlərindən bildirişlərə icazə verə bilərsiniz.",
      });
      handleDismiss();
    } else {
      toast.error("Aktivləşdirmək alınmadı", { description: "Bir az sonra yenidən cəhd edin." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <Bell className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-xl">Bildirişləri aktiv edin</DialogTitle>
          <DialogDescription className="text-center">
            Yeni mesajlar, sifarişlər və sizi maraqlandıran elanlar barədə dərhal xəbərdar olun.
            Heç bir vacib məlumatı qaçırmayın!
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">✓</span>
            <span>Yeni mesajlar haqqında ani bildiriş</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">✓</span>
            <span>Sifariş və ödəniş yenilikləri</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">✓</span>
            <span>Yadda saxlanmış axtarışlara uyğun yeni elanlar</span>
          </li>
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleEnable}
            disabled={loading}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            İndi aktiv et
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full" size="sm">
            Sonra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushPermissionPrompt;
