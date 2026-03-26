import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useWatermarkSettings = () => {
  return useQuery({
    queryKey: ["watermark-settings"],
    queryFn: async () => {
      // Fetch general settings for watermark config
      const { data: generalData } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle();
      const gen = generalData?.value as any;
      
      if (!gen?.watermark_enabled) return null;
      
      let watermarkUrl = gen.watermark_url;
      
      // If "use site logo" is enabled, fetch the theme logo
      if (gen.use_site_logo_as_watermark) {
        const { data: themeData } = await supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle();
        const theme = themeData?.value as any;
        if (theme?.logo_url) {
          watermarkUrl = theme.logo_url;
        } else {
          // Fallback to PWA icon if no custom logo
          watermarkUrl = "/pwa-192.png";
        }
      }
      
      if (!watermarkUrl) return null;

      return {
        url: watermarkUrl as string,
        position: (gen.watermark_position || "bottom-right") as string,
        opacity: (gen.watermark_opacity || 50) as number,
      };
    },
    staleTime: 0,
  });
};

const WatermarkOverlay = ({ className = "" }: { className?: string }) => {
  const { data: wm } = useWatermarkSettings();
  if (!wm) return null;

  const posClass =
    wm.position === "top-left" ? "top-2 left-2" :
    wm.position === "top-right" ? "top-2 right-2" :
    wm.position === "bottom-left" ? "bottom-2 left-2" :
    wm.position === "bottom-right" ? "bottom-2 right-2" :
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";

  return (
    <div className={`absolute inset-0 pointer-events-none z-30 ${className}`}>
      <img
        src={wm.url}
        alt=""
        className={`absolute ${posClass} h-12 w-auto object-contain max-w-[40%] max-h-[30%] pointer-events-none`}
        style={{ opacity: wm.opacity / 100 }}
      />
    </div>
  );
};

export default WatermarkOverlay;
