import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { iconMap } from "@/lib/icons";
import { useNavigate } from "react-router-dom";
import { CircuitBoard, LayoutGrid } from "lucide-react";
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
              Hamısı
            </span>
          </button>

          {categories.map((cat: any) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            // Generate a consistent pastel color from the category name
            const colors = [
              { bg: "bg-blue-500", shadow: "shadow-blue-400/30" },
              { bg: "bg-violet-500", shadow: "shadow-violet-400/30" },
              { bg: "bg-amber-500", shadow: "shadow-amber-400/30" },
              { bg: "bg-emerald-500", shadow: "shadow-emerald-400/30" },
              { bg: "bg-rose-500", shadow: "shadow-rose-400/30" },
              { bg: "bg-sky-500", shadow: "shadow-sky-400/30" },
              { bg: "bg-fuchsia-500", shadow: "shadow-fuchsia-400/30" },
              { bg: "bg-orange-500", shadow: "shadow-orange-400/30" },
              { bg: "bg-teal-500", shadow: "shadow-teal-400/30" },
              { bg: "bg-indigo-500", shadow: "shadow-indigo-400/30" },
            ];
            const colorIdx = (cat.name?.charCodeAt(0) || 0) % colors.length;
            const { bg, shadow } = colors[colorIdx];

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${bg} shadow-md transition-all group-hover:scale-105 group-hover:shadow-lg ${shadow}`}
                >
                  <Icon className="h-7 w-7 text-white" />
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
