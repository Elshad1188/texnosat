import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformMode = "classifieds" | "marketplace" | "both";

export interface PlatformConfig {
  mode: PlatformMode;
  /** Elan yerləşdirmə mövcuddur */
  showListings: boolean;
  /** Satış/alış funksiyaları mövcuddur */
  showSales: boolean;
  /** Mağazalar mövcuddur */
  showStores: boolean;
  /** Stok idarəetməsi mövcuddur */
  showStock: boolean;
  /** Sifarişlər mövcuddur */
  showOrders: boolean;
  /** Çatdırılma mövcuddur */
  showShipping: boolean;
  /** Checkout mövcuddur */
  showCheckout: boolean;
}

function getConfig(mode: PlatformMode): PlatformConfig {
  switch (mode) {
    case "classifieds":
      return {
        mode,
        showListings: true,
        showSales: false,
        showStores: true,
        showStock: false,
        showOrders: false,
        showShipping: false,
        showCheckout: false,
      };
    case "marketplace":
      return {
        mode,
        showListings: true,
        showSales: true,
        showStores: true,
        showStock: true,
        showOrders: true,
        showShipping: true,
        showCheckout: true,
      };
    case "both":
    default:
      return {
        mode: "both",
        showListings: true,
        showSales: true,
        showStores: true,
        showStock: true,
        showOrders: true,
        showShipping: true,
        showCheckout: true,
      };
  }
}

export function usePlatformMode(): PlatformConfig & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-mode"],
    queryFn: async () => {
      const [{ data: modeRow }, { data: generalRow }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "platform_mode").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
      ]);
      const mode = ((modeRow?.value as any)?.mode as PlatformMode) || "both";
      const disableShipping = !!(generalRow?.value as any)?.disable_shipping;
      return { mode, disableShipping };
    },
    staleTime: 5 * 60 * 1000,
  });

  const cfg = getConfig(data?.mode || "both");
  if (data?.disableShipping) {
    cfg.showShipping = false;
  }
  return { ...cfg, isLoading };
}
