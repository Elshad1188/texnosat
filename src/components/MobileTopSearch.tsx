import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MobileTopSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const lastY = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(65);

  useEffect(() => {
    setVisible(false);
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setHeaderHeight(header.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, [pathname]);

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
    const search = query.trim();
    navigate(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  };

  if (pathname !== "/") return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-40 bg-card border-b border-border 2xl:hidden transition-opacity duration-150 motion-reduce:transition-none",
        visible ? "opacity-100" : "invisible pointer-events-none opacity-0"
      )}
      style={{ top: headerHeight }}
      aria-hidden={!visible}
    >
      <form onSubmit={handleSubmit} className="container mx-auto flex items-center gap-2 px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label={t("nav.search_placeholder")}
            tabIndex={visible ? 0 : -1}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nav.search_placeholder")}
            className="w-full h-11 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          type="submit"
          tabIndex={visible ? 0 : -1}
          className="h-11 shrink-0 px-4 text-sm font-semibold"
        >
          {t("hero.search_button")}
        </Button>
      </form>
    </div>
  );
};

export default MobileTopSearch;
