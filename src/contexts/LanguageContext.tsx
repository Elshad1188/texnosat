import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/lib/i18n";

type Lang = "az" | "ru";

interface LanguageContextType {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  ruEnabled: boolean;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "az",
  setLanguage: () => {},
  ruEnabled: true,
  isLoaded: false,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Lang>(
    (localStorage.getItem("app_language") as Lang) || "az"
  );
  const [ruEnabled, setRuEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      // Load language settings
      const { data: settings } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "language_settings")
        .maybeSingle();
      const ru = (settings?.value as any)?.ru_enabled ?? true;
      const defaultLang = (settings?.value as any)?.default_language ?? "az";
      if (cancelled) return;
      setRuEnabled(ru);

      // If RU disabled and current is RU, force to AZ
      const stored = localStorage.getItem("app_language") as Lang | null;
      let effective: Lang = stored || (defaultLang as Lang);
      if (effective === "ru" && !ru) effective = "az";
      setLanguageState(effective);
      i18n.changeLanguage(effective);

      // Load all translations from DB
      const { data: rows } = await supabase.from("translations").select("key, az, ru");
      if (rows && !cancelled) {
        const azBundle: Record<string, string> = {};
        const ruBundle: Record<string, string> = {};
        rows.forEach((r: any) => {
          azBundle[r.key] = r.az || r.key;
          ruBundle[r.key] = r.ru || r.az || r.key;
        });
        i18n.addResourceBundle("az", "translation", azBundle, true, true);
        i18n.addResourceBundle("ru", "translation", ruBundle, true, true);
      }

      setIsLoaded(true);
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  const setLanguage = (lang: Lang) => {
    if (lang === "ru" && !ruEnabled) return;
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, ruEnabled, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Convenience re-export
export { useTranslation };
