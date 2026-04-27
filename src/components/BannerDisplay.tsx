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

  const { data: banners = [], isLoading, isFetched } = useQuery({
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
    staleTime: 5 * 60 * 1000,
  });

  const next = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [banners.length, interval, next]);

  useEffect(() => {
    if (current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  // Preload images to avoid flicker on transition
  useEffect(() => {
    banners.forEach((b: any) => {
      if (b.image_url) {
        const img = new window.Image();
        img.src = b.image_url;
      }
    });
  }, [banners]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full max-w-3xl mx-auto group">
      {/* Stacked layers with cross-fade — eliminates flicker */}
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 5" }}>
        {banners.map((banner: any, idx: number) => {
          const isActive = idx === current;
          const inner = banner.video_url ? (
            <video
              src={banner.video_url}
              poster={banner.image_url}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={banner.image_url}
              alt={banner.title}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          );
          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {banner.link ? (
                <Link to={banner.link} className="block h-full w-full">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
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
              onClick={() => setCurrent(i)}
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
