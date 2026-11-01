import { Home, Key, CalendarDays, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const DEAL_TYPES = [
  { value: "sale", label: "Alqı-satqı", tKey: "deal.sale", icon: Home },
  { value: "rent", label: "Kirayə", tKey: "deal.rent", icon: Key },
  { value: "daily", label: "Günlük", tKey: "deal.daily", icon: CalendarDays },
  { value: "business", label: "Hazır biznes", tKey: "deal.business", icon: Briefcase },
] as const;

export type DealValue = typeof DEAL_TYPES[number]["value"];

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  variant?: "navigate" | "controlled";
  className?: string;
}

const DealTypeTabs = ({ value, onChange, variant = "navigate", className = "" }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const russianLabels: Record<string, string> = { sale: "Продажа", rent: "Аренда", daily: "Посуточно", business: "Бизнес" };

  const handleClick = (dealValue: string) => {
    if (variant === "navigate") {
      navigate(`/products?deal=${dealValue}`);
    } else if (onChange) {
      onChange(value === dealValue ? "" : dealValue);
    }
  };

  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {DEAL_TYPES.map((dt) => {
        const Icon = dt.icon;
        const active = value === dt.value;
        return (
          <Button
            variant="ghost"
            aria-pressed={active}
            key={dt.value}
            onClick={() => handleClick(dt.value)}
            className={`h-[68px] min-w-0 flex flex-col items-center justify-center gap-1.5 whitespace-normal rounded-md border px-1 py-2 text-center transition-colors [&_svg]:size-5 ${
              active
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-accent"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-tight sm:text-xs">{t(dt.tKey, { defaultValue: language === "ru" ? russianLabels[dt.value] : dt.label })}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default DealTypeTabs;
