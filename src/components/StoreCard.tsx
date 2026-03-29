import { Link } from "react-router-dom";
import { Store, MapPin, Crown, Package, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StoreCardProps {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url?: string | null;
  city?: string | null;
  is_premium?: boolean;
  listingCount?: number;
  className?: string;
}

const StoreCard = ({
  id,
  name,
  logo_url,
  cover_url,
  city,
  is_premium,
  listingCount,
  className,
}: StoreCardProps) => {
  return (
    <Link
      to={`/store/${id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      {/* Cover Image / Gradient */}
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background">
        {cover_url ? (
          <img
            src={cover_url}
            alt={`${name} cover`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
        )}
        
        {is_premium && (
          <div className="absolute right-3 top-3 z-10">
            <Badge className="gap-1 border-none bg-amber-500 py-1 px-2.5 text-[10px] font-bold text-white shadow-xl backdrop-blur-md ring-1 ring-white/20">
              <Crown className="h-3 w-3 fill-current" />
              PREMIUM
            </Badge>
          </div>
        )}
      </div>

      {/* Logo Overlay */}
      <div className="absolute left-4 top-16 z-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-card shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2">
        {logo_url ? (
          <img
            src={logo_url}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <Store className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col pt-12 pb-5 px-5">
        <h3 className="line-clamp-1 font-display text-lg font-bold text-foreground transition-colors group-hover:text-primary tracking-tight">
          {name}
        </h3>
        
        <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4">
          {city && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary/60" />
              <span>{city}</span>
            </div>
          )}
          
          {typeof listingCount === "number" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Package className="h-3.5 w-3.5 text-primary/60" />
              <span>{listingCount} elan</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70 group-hover:text-primary transition-colors flex items-center gap-1">
            Mağazaya keç <ChevronRight className="h-3 w-3" />
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/5 text-primary opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default StoreCard;
