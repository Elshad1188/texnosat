import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { iconMap } from "@/lib/icons";
import { useNavigate } from "react-router-dom";
import { CircuitBoard, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Categories = () => {
  const navigate = useNavigate();

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
      <section className="py-4">
        <div className="container mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 flex-shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {/* All categories button */}
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-1.5 flex-shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Hamısı
            <ChevronRight className="h-4 w-4" />
          </button>
          
          {categories.map((cat: any) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="flex items-center gap-2 flex-shrink-0 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
              >
                <Icon className="h-4 w-4 text-primary" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
