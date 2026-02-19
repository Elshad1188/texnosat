import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/products${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 text-center">
        <h1 className="animate-fade-in font-display text-3xl font-bold text-secondary-foreground md:text-5xl lg:text-6xl">
          Elektronika dünyası —{" "}
          <span className="text-gradient-primary">Texnosat</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl animate-fade-in text-base text-secondary-foreground/70 md:text-lg" style={{ animationDelay: "0.1s" }}>
          Telefon, noutbuk, planşet və digər elektronika məhsullarını ən sərfəli qiymətlərlə al-sat.
        </p>

        <div
          className="mx-auto mt-8 max-w-2xl animate-slide-up rounded-2xl bg-card p-2 shadow-hero"
          style={{ animationDelay: "0.2s" }}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Məhsul axtar... (məs: iPhone, MacBook)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button type="submit" className="h-12 bg-gradient-primary px-6 text-primary-foreground hover:opacity-90">
              <Search className="mr-2 h-4 w-4" />
              Axtar
            </Button>
          </form>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-secondary-foreground/60">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">12K+</span> elektronika elanı
          </div>
          <div className="h-4 w-px bg-secondary-foreground/20" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">5K+</span> satıcı
          </div>
          <div className="h-4 w-px bg-secondary-foreground/20" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">12</span> kateqoriya
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
