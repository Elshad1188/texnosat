import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateQRCodeURL } from "@/utils/qr";
import { Smartphone, QrCode } from "lucide-react";

const HomePromoBar = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const ru = language === "ru";

  const { data: integrations = {} } = useQuery({
    queryKey: ["integrations-promo"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "integrations").maybeSingle();
      return (data?.value as any) || {};
    },
  });

  const playStoreUrl = integrations?.play_store_url || "";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://elan24.az";

  return (
    <section className="border-b border-border bg-gradient-primary">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold text-primary-foreground tracking-tight" style={{ letterSpacing: "-1px" }}>
              {theme.logo_text_main ?? "Elan"}
              <span className="text-white/90">{theme.logo_text_accent ?? "24"}</span>
              <span className="ml-1 text-sm font-medium text-primary-foreground/80">.az</span>
            </span>
          </div>

          {/* Right: QR + Google Play */}
          <div className="flex items-center gap-3">
            {/* QR */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/15 p-1.5 backdrop-blur-sm">
              <div className="shrink-0 rounded bg-white p-0.5">
                <img
                  src={generateQRCodeURL(siteUrl, 72)}
                  alt="Elan24 QR kodu"
                  className="h-14 w-14"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col">
                <span className="flex items-center gap-1 text-[11px] font-medium text-primary-foreground">
                  <QrCode className="h-3 w-3" />
                  {ru ? "Сканируйте" : "Skan edin"}
                </span>
                <span className="text-[10px] text-primary-foreground/80">
                  {ru ? "Скачать приложение" : "Tətbiqi yüklə"}
                </span>
              </div>
            </div>

            {/* Google Play */}
            <a
              href={playStoreUrl || "#"}
              target={playStoreUrl ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-white transition-transform hover:scale-105"
            >
              <Smartphone className="h-5 w-5" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] uppercase tracking-wide text-white/70">
                  {ru ? "Доступно в" : "Hazırdır"}
                </span>
                <span className="text-sm font-semibold">Google Play</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePromoBar;
