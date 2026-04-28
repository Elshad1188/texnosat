import { Home, Key, CalendarDays, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DEAL_TYPES = [
  { value: "sale", label: "Alqı-satqı", icon: Home },
  { value: "rent", label: "Kirayə", icon: Key },
  { value: "daily", label: "Günlük", icon: CalendarDays },
  { value: "business", label: "Hazır biznes", icon: Briefcase },
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
          <button
            key={dt.value}
            onClick={() => handleClick(dt.value)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-tight sm:text-xs">{dt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DealTypeTabs;
