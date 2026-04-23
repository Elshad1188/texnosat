import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import electronicsImage from "@/assets/categories/electronics.jpg";
import transportImage from "@/assets/categories/transport.jpg";
import realEstateImage from "@/assets/categories/real-estate.jpg";
import homeGardenImage from "@/assets/categories/home-garden.jpg";
import fashionImage from "@/assets/categories/fashion.jpg";
import jobsServicesImage from "@/assets/categories/jobs-services.jpg";
import hobbySportImage from "@/assets/categories/hobby-sport.jpg";
import petsImage from "@/assets/categories/pets.jpg";
import kidsImage from "@/assets/categories/kids.jpg";
import businessIndustryImage from "@/assets/categories/business-industry.jpg";
import healthBeautyImage from "@/assets/categories/health-beauty.jpg";
import entertainmentEventsImage from "@/assets/categories/entertainment-events.jpg";
import foodDrinkImage from "@/assets/categories/food-drink.jpg";
import otherImage from "@/assets/categories/other.jpg";

const categoryImages: Record<string, string> = {
  elektronika: electronicsImage,
  neqliyyat: transportImage,
  "dasinmaz-emlak": realEstateImage,
  "ev-ve-bag": homeGardenImage,
  "geyim-aksesuar": fashionImage,
  "is-ve-xidmetler": jobsServicesImage,
  "hobbi-idman": hobbySportImage,
  heyvanlar: petsImage,
  "usaq-dunyasi": kidsImage,
  "biznes-senaye": businessIndustryImage,
  "saglamliq-gozellik": healthBeautyImage,
  "eylence-tedbirler": entertainmentEventsImage,
  "qida-icki": foodDrinkImage,
  diger: otherImage,
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
            const imageSrc = categoryImages[cat.slug] || otherImage;

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <img
                    src={imageSrc}
                    alt={cat.name}
                    width={768}
                    height={768}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
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
