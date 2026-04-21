import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { language, setLanguage, ruEnabled } = useLanguage();

  if (!ruEnabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Language">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setLanguage("az")} className={language === "az" ? "font-semibold text-primary" : ""}>
          🇦🇿 Azərbaycan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("ru")} className={language === "ru" ? "font-semibold text-primary" : ""}>
          🇷🇺 Русский
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
