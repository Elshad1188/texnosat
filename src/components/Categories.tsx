import {
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Monitor,
  Gamepad2,
  Camera,
  Watch,
  Cpu,
  Printer,
  Wifi,
  CircuitBoard,
  type LucideIcon,
} from "lucide-react";
import { categories } from "@/data/products";
import { useNavigate } from "react-router-dom";

const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard,
};

const Categories = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Kateqoriyalar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Elektronika kateqoriyasını seçin</p>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Hamısına bax →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.id}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <span className="block text-xs font-medium text-foreground sm:text-sm">{cat.label}</span>
                  <span className="text-xs text-muted-foreground">{cat.count.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
