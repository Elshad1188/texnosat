import { Car, Bike, Truck, Bus, Tractor, Ship, Plane, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VEHICLE_TYPES, type VehicleType } from "@/data/autoData";
import { useLanguage } from "@/contexts/LanguageContext";

const icons: Record<VehicleType, any> = {
  car: Car,
  moto: Bike,
  truck: Truck,
  bus: Bus,
  agro: Tractor,
  water: Ship,
  air: Plane,
  parts: Wrench,
};

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  variant?: "navigate" | "controlled";
  className?: string;
}

const VehicleTypeTabs = ({ value, onChange, variant = "navigate", className = "" }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleClick = (v: VehicleType) => {
    if (variant === "navigate") {
      navigate(`/products?type=${v}`);
    } else if (onChange) {
      onChange(value === v ? "" : v);
    }
  };

  return (
    <div className={`grid grid-cols-4 gap-2 md:grid-cols-8 ${className}`}>
      {VEHICLE_TYPES.map((vt) => {
        const Icon = icons[vt.value];
        const active = value === vt.value;
        return (
          <button
            key={vt.value}
            type="button"
            onClick={() => handleClick(vt.value)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight sm:text-xs">
              {language === "ru" ? vt.label_ru : vt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default VehicleTypeTabs;
