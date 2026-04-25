import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const MobileTopSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (y < 200) setVisible(false);
      else if (dy < -6) setVisible(true);
      else if (dy > 6) setVisible(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border 2xl:hidden transition-transform duration-300 ease-out will-change-transform",
        visible ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <form onSubmit={handleSubmit} className="container mx-auto flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nav.search_placeholder")}
            className="w-full h-10 pl-9 pr-3 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold whitespace-nowrap"
        >
          {t("hero.search_button")}
        </button>
      </form>
    </div>
  );
};

export default MobileTopSearch;
