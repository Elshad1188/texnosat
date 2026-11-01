import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VisualSearchButton from "@/components/VisualSearchButton";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { usePlatformMode } from "@/hooks/usePlatformMode";

const HeroSection = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const platform = usePlatformMode();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const search = query.trim();
    navigate(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  };

  return (
    <section className="bg-background pb-3 pt-4">
      <div className="container mx-auto px-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex min-w-0 items-center gap-1 rounded-lg border border-input bg-card p-1.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 sm:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              aria-label={language === "ru" ? "Поиск объявлений" : "Elan axtarışı"}
              placeholder={t("nav.search_placeholder", { defaultValue: language === "ru" ? "Что вы ищете?" : "Nə axtarırsınız?" })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {platform.showVisualSearch && <VisualSearchButton />}
              <Button 
                type="submit" 
                size="sm"
                className="h-11 rounded-md px-3 text-sm font-semibold sm:px-5"
              >
                {t("hero.search_button", { defaultValue: language === "ru" ? "Поиск" : "Axtar" })}
              </Button>
            </div>
        </form>
      </div>
    </section>
  );
};

export default HeroSection;
