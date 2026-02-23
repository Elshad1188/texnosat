import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { iconMap } from "@/lib/icons";
import { useNavigate } from "react-router-dom";
import { CircuitBoard } from "lucide-react";
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
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Kateqoriyalar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Elektronika kateqoriyasını seçin</p>
          </div>
          <button onClick={() => navigate("/products")} className="text-sm font-medium text-primary hover:underline">
            Hamısına bax →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories.map((cat: any) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-center text-xs font-medium text-foreground sm:text-sm">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
