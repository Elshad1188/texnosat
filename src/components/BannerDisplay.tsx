import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface BannerDisplayProps {
  position: string;
}

const BannerDisplay = ({ position }: BannerDisplayProps) => {
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
      // Filter by date range client-side
      return (data || []).filter((b: any) => {
        if (b.starts_at && b.starts_at > now) return false;
        if (b.ends_at && b.ends_at < now) return false;
        return true;
      });
    },
  });

  if (banners.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto py-2">
      {banners.map((b: any) => (
        <div key={b.id} className="flex-shrink-0 w-full max-w-3xl mx-auto">
          {b.link ? (
            <Link to={b.link}>
              <img src={b.image_url} alt={b.title} className="w-full rounded-xl object-cover max-h-48 shadow-card" />
            </Link>
          ) : (
            <img src={b.image_url} alt={b.title} className="w-full rounded-xl object-cover max-h-48 shadow-card" />
          )}
        </div>
      ))}
    </div>
  );
};

export default BannerDisplay;
