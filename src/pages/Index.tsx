import SEOHead from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateQRCodeURL } from "@/utils/qr";
import { Smartphone, QrCode } from "lucide-react";

const Index = () => {
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

  const playStoreUrl = (integrations as any)?.play_store_url || "";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://elan24.az";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-primary px-4 py-12">
      <SEOHead />
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-primary-foreground" style={{ letterSpacing: "-1.5px" }}>
          {theme.logo_text_main ?? "Elan"}
          <span className="text-white/90">{theme.logo_text_accent ?? "24"}</span>
          <span className="ml-1 text-xl font-medium text-primary-foreground/80">.az</span>
        </h1>

        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/15 p-5">
          <div className="rounded-lg bg-white p-2">
            <img src={generateQRCodeURL(siteUrl, 200)} alt="Elan24 QR kodu" className="h-40 w-40" />
          </div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground">
            <QrCode className="h-4 w-4" />
            {ru ? "Сканируйте" : "Skan edin"}
          </span>
          <span className="text-xs text-primary-foreground/80">
            {ru ? "Скачать приложение" : "Tətbiqi yüklə"}
          </span>
        </div>

        <a
          href={playStoreUrl || "#"}
          target={playStoreUrl ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-white transition-transform hover:scale-105"
        >
          <Smartphone className="h-6 w-6" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-white/70">
              {ru ? "Доступно в" : "Hazırdır"}
            </span>
            <span className="text-base font-semibold">Google Play</span>
          </div>
        </a>
      </main>
    </div>
  );
};

export default Index;
