import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { iconMap } from "@/lib/icons";

// Daşınmaz əmlak kateqoriyaları üçün rəng paleti (slug → tailwind gradient)
const categoryColors: Record<string, string> = {
  menziller: "from-blue-500 to-blue-600",
  "heyet-evi": "from-emerald-500 to-emerald-600",
  ofisler: "from-indigo-500 to-indigo-600",
  qarajlar: "from-amber-500 to-amber-600",
  torpaq: "from-teal-500 to-teal-600",
  obyektler: "from-rose-500 to-rose-600",
  "qeyri-yasayis": "from-slate-500 to-slate-600",
};

const Categories = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-3 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
          {/* All categories */}
          <button
            onClick={() => navigate("/products")}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md transition-all group-hover:scale-105 group-hover:shadow-primary/30 group-hover:shadow-lg">
              <LayoutGrid className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="max-w-[68px] text-center text-[11px] font-medium leading-tight text-foreground">
              {t("common.all")}
            </span>
          </button>

          {categories.map((cat: any) => {
            const Icon = (cat.icon && iconMap[cat.icon]) || Building2;
            const gradient = categoryColors[cat.slug] || "from-primary to-primary/70";

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${gradient} shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20`}>
                  <Icon className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <span className="max-w-[68px] text-center text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
