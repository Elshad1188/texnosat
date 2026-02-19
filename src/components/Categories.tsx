import {
  Smartphone,
  Car,
  Home,
  Shirt,
  Sofa,
  Briefcase,
  Baby,
  Dumbbell,
  Laptop,
  Wrench,
  Dog,
  Palette,
} from "lucide-react";

const categories = [
  { icon: Smartphone, label: "Elektronika", count: "24,500", color: "bg-accent text-accent-foreground" },
  { icon: Car, label: "Nəqliyyat", count: "18,200", color: "bg-accent text-accent-foreground" },
  { icon: Home, label: "Daşınmaz əmlak", count: "12,800", color: "bg-accent text-accent-foreground" },
  { icon: Shirt, label: "Geyim", count: "15,300", color: "bg-accent text-accent-foreground" },
  { icon: Sofa, label: "Ev və bağ", count: "9,400", color: "bg-accent text-accent-foreground" },
  { icon: Briefcase, label: "İş elanları", count: "6,700", color: "bg-accent text-accent-foreground" },
  { icon: Baby, label: "Uşaq aləmi", count: "8,100", color: "bg-accent text-accent-foreground" },
  { icon: Dumbbell, label: "İdman", count: "4,200", color: "bg-accent text-accent-foreground" },
  { icon: Laptop, label: "Kompüter", count: "11,600", color: "bg-accent text-accent-foreground" },
  { icon: Wrench, label: "Xidmətlər", count: "7,900", color: "bg-accent text-accent-foreground" },
  { icon: Dog, label: "Heyvanlar", count: "3,500", color: "bg-accent text-accent-foreground" },
  { icon: Palette, label: "Hobbi", count: "5,200", color: "bg-accent text-accent-foreground" },
];

const Categories = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Kateqoriyalar</h2>
            <p className="mt-1 text-sm text-muted-foreground">İstədiyiniz kateqoriyanı seçin</p>
          </div>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            Hamısına bax →
          </a>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
          {categories.map((cat) => (
            <button
              key={cat.label}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-primary/30"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color} transition-colors group-hover:bg-primary group-hover:text-primary-foreground`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-medium text-foreground sm:text-sm">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{cat.count}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
