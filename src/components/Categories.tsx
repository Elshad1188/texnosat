import { useNavigate } from "react-router-dom";
import { LayoutGrid, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";
import { iconMap } from "@/lib/icons";
import { useListingScope } from "@/hooks/useListingScope";
import { listingMatchesScope } from "@/lib/listingScope";
import { Button } from "@/components/ui/button";

const Categories = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { scope, categories: allCategories, categoryMap, isLoading, isError } = useListingScope();
  const categories = allCategories.filter(c => c.is_active && !c.parent_id && listingMatchesScope(c.slug, categoryMap, scope))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full" />
                <Skeleton className="h-3 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError && allCategories.length === 0) return null;

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 sm:gap-x-5 lg:gap-x-6">
          {/* All categories */}
          <Button
            variant="ghost"
            onClick={() => navigate("/products")}
            className="group h-auto w-[76px] min-w-0 shrink-0 flex-col gap-2 whitespace-normal px-0 py-1 hover:bg-transparent [&_svg]:size-6"
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary shadow-md transition-all group-hover:scale-105 group-hover:shadow-primary/30 group-hover:shadow-lg">
              <LayoutGrid className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="max-w-[68px] text-center text-[11px] font-medium leading-tight text-foreground">
              {t("common.all")}
            </span>
          </Button>

          {categories.map((cat: any) => {
            const Icon = (cat.icon && iconMap[cat.icon]) || Building2;

            return (
              <Button
            variant="ghost"
                key={cat.id}
                onClick={() => navigate(`/products?category=${encodeURIComponent(cat.slug)}`)}
                className="group h-auto w-[76px] min-w-0 shrink-0 flex-col gap-2 whitespace-normal px-0 py-1 hover:bg-transparent [&_svg]:size-6"
              >
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors group-hover:border-primary group-hover:bg-accent">
                  <Icon className="h-7 w-7 text-primary" strokeWidth={2} />
                </div>
                <span className="max-w-[68px] text-center text-[11px] font-medium leading-tight text-foreground break-words">
                  {language === "ru" && cat.name_ru ? cat.name_ru : cat.name}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
