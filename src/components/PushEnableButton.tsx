import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { enablePushNotifications, isInPreviewOrIframe, isPushSupported } from "@/lib/firebase";

interface Props {
  userId: string;
}

const PushEnableButton = ({ userId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const handleEnable = async () => {
    if (isInPreviewOrIframe()) {
      toast({
        title: "Önizləmədə işləmir",
        description: "Bildirişlər yalnız yayımlanan saytda işləyir (elan24.az).",
      });
      return;
    }

    if (isIOS && !isStandalone) {
      toast({
        title: "iPhone üçün təlimat",
        description:
          "Safari-də Paylaş (⬆️) → Ana ekrana əlavə et seçin, sonra ana ekrandakı ikondan açıb yenidən cəhd edin.",
      });
      return;
    }

    setLoading(true);
    const result = await enablePushNotifications(userId);
    setLoading(false);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");

    if (result.ok) {
      toast({ title: "Bildirişlər aktiv edildi", description: "Artıq mesaj və elan bildirişləri alacaqsınız." });
      return;
    }

    if (result.reason === "denied") {
      toast({
        title: "İcazə verilmədi",
        description: "Brauzer parametrlərindən bildirişlərə icazə verin və yenidən cəhd edin.",
        variant: "destructive",
      });
    } else if (result.reason === "unsupported") {
      toast({
        title: "Bu brauzer dəstəkləmir",
        description: "Chrome və ya Safari (iOS 16.4+) istifadə edin.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Aktivləşdirmək alınmadı",
        description: "Bir az sonra yenidən cəhd edin.",
        variant: "destructive",
      });
    }
  };

  if (permission === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4" />
        Push bildirişləri bu brauzerdə dəstəklənmir
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-xs text-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        Push bildirişləri aktivdir
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleEnable} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Push bildirişləri aktiv et
    </Button>
  );
};

export default PushEnableButton;
