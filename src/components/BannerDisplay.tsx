import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerDisplayProps {
  position: string;
  interval?: number;
}

const BannerDisplay = ({ position, interval = 5000 }: BannerDisplayProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: banners = [] } = useQuery({
    queryKey: ["banners", position],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("position", position)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []).filter((b: any) => {
        if (b.starts_at && b.starts_at > now) return false;
        if (b.ends_at && b.ends_at < now) return false;
        return true;
      });
    },
  });

  const goTo = useCallback(
    (index: number, dir: "left" | "right") => {
      if (isAnimating || index === current) return;
      setDirection(dir);
      setIsAnimating(true);
      setCurrent(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [current, isAnimating]
  );

  const next = useCallback(() => {
    if (banners.length <= 1) return;
    goTo((current + 1) % banners.length, "right");
  }, [current, banners.length, goTo]);

  const prev = useCallback(() => {
    if (banners.length <= 1) return;
    goTo((current - 1 + banners.length) % banners.length, "left");
  }, [current, banners.length, goTo]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [banners.length, interval, next]);

  // Reset current if banners change
  useEffect(() => {
    if (current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  if (banners.length === 0) return null;

  const banner = banners[current] as any;

  const imgEl = (
    <img
      key={banner.id}
      src={banner.image_url}
      alt={banner.title}
      className={`w-full rounded-xl object-cover max-h-48 shadow-card transition-all duration-500 ease-in-out ${
        isAnimating
          ? direction === "right"
            ? "animate-slide-in-from-right"
            : "animate-slide-in-from-left"
          : ""
      }`}
    />
  );

  return (
    <div className="relative w-full max-w-3xl mx-auto group">
      {/* Banner */}
      <div className="overflow-hidden rounded-xl">
        {banner.link ? <Link to={banner.link}>{imgEl}</Link> : imgEl}
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? "right" : "left")}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-5 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerDisplay;
