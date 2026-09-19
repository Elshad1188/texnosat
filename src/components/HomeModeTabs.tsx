import { Car, Building2, LayoutGrid } from "lucide-react";
import { useHomeMode, HomeMode } from "@/contexts/HomeModeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const MODES: { value: HomeMode; icon: any; az: string; ru: string; descAz: string; descRu: string; gradient: string }[] = [
  {
    value: "transport",
    icon: Car,
    az: "Nəqliyyat",
    ru: "Транспорт",
    descAz: "Avtomobil, moto, ehtiyat hissələri",
    descRu: "Авто, мото, запчасти",
    gradient: "from-blue-600 to-blue-500",
  },
  {
    value: "real_estate",
    icon: Building2,
    az: "Daşınmaz əmlak",
    ru: "Недвижимость",
    descAz: "Mənzil, ev, ofis, torpaq",
    descRu: "Квартиры, дома, офисы, участки",
    gradient: "from-emerald-600 to-emerald-500",
  },
  {
    value: "general",
    icon: LayoutGrid,
    az: "Qarışıq",
    ru: "Разное",
    descAz: "Elektronika, geyim, ev əşyaları",
    descRu: "Электроника, одежда, товары для дома",
    gradient: "from-amber-600 to-amber-500",
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
              <button
                key={m.value}
                onClick={() => setMode(active ? null : m.value)}
                className={`flex flex-col items-center gap-1.5 sm:gap-2 rounded-2xl border p-3 sm:p-5 text-center transition-all ${
                  active
                    ? `border-transparent bg-gradient-to-br ${m.gradient} text-white shadow-lg scale-[1.02]`
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${active ? "text-white" : "text-primary"}`} />
                <span className="text-xs font-bold sm:text-base leading-tight">
                  {isRu ? m.ru : m.az}
                </span>
                <span className={`hidden sm:block text-[11px] leading-tight ${active ? "text-white/80" : "text-muted-foreground"}`}>
                  {isRu ? m.descRu : m.descAz}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeModeTabs;
