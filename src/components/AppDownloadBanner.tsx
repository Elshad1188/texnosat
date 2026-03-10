import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppDownloadBanner = () => {
  const [visible, setVisible] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if dismissed
    const dismissed = sessionStorage.getItem("app-banner-dismissed");
    if (dismissed) return;

    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Listen for PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Fetch store links
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

  if (!visible) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const hasStoreLinks = appStoreUrl || playStoreUrl;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 p-3 md:bottom-0 md:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
            <Smartphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Texnosat Tətbiqi</p>
            <p className="text-xs text-muted-foreground">Tətbiqi yüklə, daha rahat istifadə et</p>
          </div>
          <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex gap-2">
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
            <p className="text-xs text-muted-foreground">
              Paylaş → Ana ekrana əlavə et
            </p>
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
    </div>
  );
};

export default AppDownloadBanner;
