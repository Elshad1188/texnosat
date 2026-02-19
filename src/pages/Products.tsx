import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { products, categories } from "@/data/products";

const iconMap: Record<string, LucideIcon> = {
  Smartphone, Laptop, Tablet, Headphones, Monitor, Gamepad2,
  Camera, Watch, Cpu, Printer, Wifi, CircuitBoard,
};

const conditions = ["Hamısı", "Yeni", "Yeni kimi", "İşlənmiş"];
const sortOptions = [
  { value: "newest", label: "Ən yeni" },
  { value: "price-asc", label: "Ucuzdan bahaya" },
  { value: "price-desc", label: "Bahadan ucuza" },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCondition, setSelectedCondition] = useState("Hamısı");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (selectedCondition !== "Hamısı") {
      result = result.filter((p) => p.condition === selectedCondition);
    }

    if (priceMin) result = result.filter((p) => p.price >= Number(priceMin));
    if (priceMax) result = result.filter((p) => p.price <= Number(priceMax));

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);

    return result;
  }, [query, selectedCategory, selectedCondition, sortBy, priceMin, priceMax]);

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedCondition("Hamısı");
    setPriceMin("");
    setPriceMax("");
    setSortBy("newest");
    setSearchParams({});
  };

  const hasActiveFilters = query || selectedCategory || selectedCondition !== "Hamısı" || priceMin || priceMax;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Məhsul axtar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </form>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filterlər
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 animate-fade-in rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vəziyyət</label>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCondition(c)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedCondition === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qiymət aralığı (₼)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="h-9 w-24 rounded-lg border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="h-9 w-24 rounded-lg border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
                <X className="h-3 w-3" /> Filterləri sıfırla
              </button>
            )}
          </div>
        )}

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Hamısı
          </button>
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || CircuitBoard;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? "" : cat.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredProducts.length} məhsul tapıldı
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ListingCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={`${product.price.toLocaleString()} ${product.currency}`}
                location={product.location}
                time={product.time}
                image={product.image}
                condition={product.condition}
                isPremium={product.isPremium}
                isUrgent={product.isUrgent}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-display text-lg font-semibold text-foreground">Məhsul tapılmadı</h3>
            <p className="mt-1 text-sm text-muted-foreground">Axtarış meyarlarınızı dəyişməyi yoxlayın</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Filterləri sıfırla
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Products;
