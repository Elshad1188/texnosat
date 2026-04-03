import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VisualSearchButton from "@/components/VisualSearchButton";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/products${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <section className="relative bg-gradient-to-b from-primary/5 to-background pt-6 pb-4">
      <div className="container mx-auto px-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Axtar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-32 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <VisualSearchButton />
              <Button 
                type="submit" 
                size="sm"
                className="h-8 bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl px-4"
              >
                Axtar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default HeroSection;
