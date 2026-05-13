import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Smartphone, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateQRCodeURL } from "@/utils/qr";

const AppDownloadBanner = () => {
  const [visible, setVisible] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [siteUrl, setSiteUrl] = useState("https://elan24.az");

  useEffect(() => {
    setSiteUrl(window.location.origin);
    const dismissed = sessionStorage.getItem("app-banner-dismissed");
    if (dismissed) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "integrations")
      .maybeSingle()
      .then(({ data }) => {
        const val = data?.value as any;
        setAppStoreUrl(val?.app_store_url || "");
        setPlayStoreUrl(val?.play_store_url || "");
      });

    setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("app-banner-dismissed", "1");
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
    }
  };

  const downloadQR = async () => {
    try {
      const url = generateQRCodeURL(siteUrl, 512);
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "elan24-qr.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("QR download failed", e);
    }
  };

  if (!visible) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const hasStoreLinks = appStoreUrl || playStoreUrl;

  return (
    <div className="fixed bottom-36 left-0 right-0 z-30 px-3 md:bottom-4">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-3 shadow-lg md:max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
            <Smartphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Elan24 Tətbiqi</p>
            <p className="text-xs text-muted-foreground">Tətbiqi yüklə, daha rahat istifadə et</p>
          </div>
          <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile actions */}
        <div className="mt-2 flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
            <img
              src={generateQRCodeURL(siteUrl, 100)}
              alt="Elan24 QR kodu"
              className="h-20 w-20 shrink-0 rounded"
              loading="lazy"
            />
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Telefonunuzla skan edin</p>
              <Button size="sm" variant="outline" className="w-fit gap-1 text-xs" onClick={downloadQR}>
                <Download className="h-3.5 w-3.5" /> QR-ni yüklə
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            {deferredPrompt && (
              <Button size="sm" className="flex-1 gap-1 bg-gradient-primary text-primary-foreground text-xs" onClick={installPWA}>
                <Download className="h-3.5 w-3.5" /> Yüklə
              </Button>
            )}
            {isIOS && appStoreUrl && (
              <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">App Store</a>
              </Button>
            )}
            {isAndroid && playStoreUrl && (
              <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer">Google Play</a>
              </Button>
            )}
            {!deferredPrompt && !hasStoreLinks && isIOS && (
              <p className="text-xs text-muted-foreground">Paylaş → Ana ekrana əlavə et</p>
            )}
            {!deferredPrompt && hasStoreLinks && !isIOS && !isAndroid && (
              <div className="flex gap-2 flex-1">
                {appStoreUrl && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                    <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">App Store</a>
                  </Button>
                )}
                {playStoreUrl && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                    <a href={playStoreUrl} target="_blank" rel="noopener noreferrer">Google Play</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop QR */}
        <div className="hidden md:flex mt-3 items-center gap-3">
          <div className="shrink-0 rounded-lg border border-border overflow-hidden bg-white p-1">
            <img
              src={generateQRCodeURL(siteUrl, 120)}
              alt="Elan24 QR kodu"
              className="h-[120px] w-[120px]"
              loading="lazy"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Telefonunuzla skan edin
            </p>
            <p className="text-xs text-muted-foreground">
              Kameranızı QR koda yaxınlaşdırın və saytı mobil cihazınızda açın.
            </p>
            <Button size="sm" variant="outline" className="w-fit gap-1 text-xs" onClick={downloadQR}>
              <Download className="h-3.5 w-3.5" /> QR-ni yüklə
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadBanner;
