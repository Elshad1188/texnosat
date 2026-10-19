import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateQRCodeURL } from "@/utils/qr";
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
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://elan24.az";

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
          className="shrink-0 font-display text-base font-bold tracking-tight text-primary-foreground sm:text-lg"
          style={{ letterSpacing: "-0.5px" }}
        >
          {theme.logo_text_main ?? "Elan"}
          <span className="text-white/90">{theme.logo_text_accent ?? "24"}</span>
          <span className="ml-0.5 text-[11px] font-medium text-primary-foreground/80">.az</span>
        </span>

        {/* Right: compact QR + Google Play + close */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg bg-white/15 p-1 sm:flex">
            <img
              src={generateQRCodeURL(siteUrl, 48)}
              alt="Elan24 QR kodu"
              className="h-8 w-8 rounded-sm bg-white p-0.5"
              loading="lazy"
            />
            <span className="text-[10px] font-medium leading-tight text-primary-foreground/90">
              {ru ? "Сканруйте" : "Skan edin"}
            </span>
          </div>

          <a
            href={playStoreUrl || "#"}
            target={playStoreUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-black px-2 py-1 text-white transition-opacity hover:opacity-90"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold leading-none">Google Play</span>
          </a>

          <button
            type="button"
            onClick={close}
            aria-label={ru ? "Закрыть" : "Bağla"}
            className="shrink-0 rounded-md p-1 text-primary-foreground/80 transition-colors hover:bg-white/20 hover:text-primary-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomePromoBar;
