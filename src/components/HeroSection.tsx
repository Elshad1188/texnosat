import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  return (
    <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 text-center">
        <h1 className="animate-fade-in font-display text-3xl font-bold text-secondary-foreground md:text-5xl lg:text-6xl">
          Al, sat, dəyişdir —{" "}
          <span className="text-gradient-primary">Texnosat</span> ilə
        </h1>
        <p className="mx-auto mt-4 max-w-2xl animate-fade-in text-base text-secondary-foreground/70 md:text-lg" style={{ animationDelay: "0.1s" }}>
          Azərbaycanın ən böyük elan platforması. Minlərlə elan arasından axtarış edin və ya öz elanınızı dərc edin.
        </p>

        {/* Search Bar */}
        <div
          className="mx-auto mt-8 max-w-3xl animate-slide-up rounded-2xl bg-card p-2 shadow-hero"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nə axtarırsınız?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Şəhər"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button className="h-12 bg-gradient-primary px-6 text-primary-foreground hover:opacity-90">
              <Search className="mr-2 h-4 w-4" />
              Axtar
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-secondary-foreground/60" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">125K+</span> aktiv elan
          </div>
          <div className="h-4 w-px bg-secondary-foreground/20" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">50K+</span> istifadəçi
          </div>
          <div className="h-4 w-px bg-secondary-foreground/20" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-2xl font-bold text-primary">30+</span> kateqoriya
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
