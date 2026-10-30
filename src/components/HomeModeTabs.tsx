import { Button } from "@/components/ui/button";
import { Car, Building2, LayoutGrid, type LucideIcon } from "lucide-react";
import { useHomeMode, HomeMode } from "@/contexts/HomeModeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const MODES: { value: HomeMode; icon: LucideIcon; az: string; ru: string; descAz: string; descRu: string }[] = [
  {
    value: "transport",
    icon: Car,
    az: "Nəqliyyat",
    ru: "Транспорт",
    descAz: "Avtomobil, moto, ehtiyat hissələri",
    descRu: "Авто, мото, запчасти",
  },
  {
    value: "real_estate",
    icon: Building2,
    az: "Daşınmaz əmlak",
    ru: "Недвижимость",
    descAz: "Mənzil, ev, ofis, torpaq",
    descRu: "Квартиры, дома, офисы, участки",
  },
  {
    value: "general",
    icon: LayoutGrid,
    az: "Qarışıq",
    ru: "Разное",
    descAz: "Elektronika, geyim, ev əşyaları",
    descRu: "Электроника, одежда, товары для дома",
  },
];

const HomeModeTabs = () => {
  const { mode, setMode } = useHomeMode();
  const { language } = useLanguage();
  const isRu = language === "ru";

  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.value;
            return (
              <Button
                variant="outline"
                aria-pressed={active}
                key={m.value}
                onClick={() => setMode(active ? null : m.value)}
                className={`h-auto min-h-[96px] whitespace-normal flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg border p-3 sm:p-5 text-center transition-colors [&_svg]:size-6 sm:[&_svg]:size-8 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${active ? "text-primary-foreground" : "text-primary"}`} />
                <span className="text-xs font-bold sm:text-base leading-tight">
                  {isRu ? m.ru : m.az}
                </span>
                <span className={`hidden sm:block text-[11px] leading-tight ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {isRu ? m.descRu : m.descAz}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeModeTabs;
