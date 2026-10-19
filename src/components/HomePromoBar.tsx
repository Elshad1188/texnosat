import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Smartphone, X } from "lucide-react";

const DISMISS_KEY = "elan24_promo_dismissed";

const HomePromoBar = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const ru = language === "ru";
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { data: integrations = {} } = useQuery({
    queryKey: ["integrations-promo"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "integrations").maybeSingle();
      return (data?.value as any) || {};
    },
  });

  const playStoreUrl = integrations?.play_store_url || "";
  const siteUrl = "https://elan24.az";
  const hasPlayStore = /^https:\/\/play\.google\.com\//i.test(playStoreUrl);

  if (dismissed) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section className="border-b border-border bg-gradient-primary">
      <div className="container mx-auto flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
        {/* Left: Logo */}
        <span
          className="shrink-0 font-display text-base font-bold text-primary-foreground sm:text-lg"
        >
          {theme.logo_text_main ?? "Elan"}
          <span className="text-primary-foreground/90">{theme.logo_text_accent ?? "24"}</span>
          <span className="ml-0.5 text-[11px] font-medium text-primary-foreground/80">.az</span>
        </span>

        {/* Right: compact QR + Google Play + close */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg bg-primary-foreground/15 p-1 sm:flex">
            <QRCodeSVG value={siteUrl} size={32} className="h-8 w-8 rounded-sm bg-card p-0.5" />
            <span className="text-[10px] font-medium leading-tight text-primary-foreground/90">
              {ru ? "Сканируйте" : "Skan edin"}
            </span>
          </div>

          {hasPlayStore && <Button asChild size="sm" variant="secondary" className="h-8 px-2 text-[11px]">
          <a
            href={playStoreUrl}
            target={playStoreUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold leading-none">Google Play</span>
          </a>
          </Button>}

          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={close}
            aria-label={ru ? "Закрыть" : "Bağla"}
            className="h-8 w-8 shrink-0 rounded-md p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomePromoBar;
