import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, QrCode, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { generateQRCodeURL } from "@/utils/qr";

const Footer = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobileOrTablet(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobileOrTablet(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["site-settings-general"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "general").maybeSingle();
      return data?.value as any || {};
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["footer-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("pages").select("slug, title").eq("is_published", true);
      return data || [];
    },
  });

  const phone = settings?.contact_phone || "+994 50 123 45 67";
  const email = settings?.contact_email || "info@elan24.az";
  const address = settings?.contact_address || "Bakı, Azərbaycan";
  const footerText = settings?.footer_text || "© 2026 Elan24. Bütün hüquqlar qorunur.";

  if (isMobileOrTablet) return null;

  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold">
                {theme.logo_text_main ?? "Elan"}<span className="text-primary" style={{ color: theme.logo_color ? theme.logo_color : undefined }}>{theme.logo_text_accent ?? "24"}</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-secondary-foreground/60">
              {settings?.site_description || "Azərbaycanın pulsuz elan saytı."}
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("categories.title")}</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li><Link to="/products?category=telefonlar" className="hover:text-primary">Telefonlar</Link></li>
              <li><Link to="/products?category=noutbuklar" className="hover:text-primary">Noutbuklar</Link></li>
              <li><Link to="/products?category=plansetler" className="hover:text-primary">Planşetlər</Link></li>
              <li><Link to="/products?category=aksesuarlar" className="hover:text-primary">Aksesuarlar</Link></li>
              <li><Link to="/blog" className="hover:text-primary">{t("nav.blog")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("footer.about")}</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              {pages.length > 0 ? (
                pages.map((p: any) => (
                  <li key={p.slug}><Link to={`/page/${p.slug}`} className="hover:text-primary">{p.title}</Link></li>
                ))
              ) : (
                <>
                  <li><Link to="/page/about" className="hover:text-primary">{t("footer.about")}</Link></li>
                  <li><Link to="/page/rules" className="hover:text-primary">{t("footer.rules")}</Link></li>
                  <li><Link to="/page/privacy" className="hover:text-primary">{t("footer.privacy")}</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("footer.contact")}</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {address}</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Tətbiqi yüklə
            </h4>
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg border border-border overflow-hidden bg-white p-1">
                <img
                  src={generateQRCodeURL(typeof window !== "undefined" ? window.location.origin : "https://elan24.az", 100)}
                  alt="Elan24 QR kodu"
                  className="h-[100px] w-[100px]"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-secondary-foreground/60">
                  Telefonunuzla skan edin və saytı mobil cihazınızda açın.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const url = generateQRCodeURL(typeof window !== "undefined" ? window.location.origin : "https://elan24.az", 512);
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
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-fit"
                >
                  <Download className="h-3.5 w-3.5" /> QR-ni yüklə
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-secondary-foreground/10 pt-6 text-center text-xs text-secondary-foreground/40">
          {footerText}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
