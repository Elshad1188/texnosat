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
  /** Vizual axtarış (şəkillə axtarış) mövcuddur */
  showVisualSearch: boolean;
  /** Anbar (warehouse) tabı mövcuddur */
  showWarehouse: boolean;
  /** AI ilə avtomatik elan doldurma mövcuddur */
  showAiAutofill: boolean;
  /** Mağaza panelində Telegram bot inteqrasiyası mövcuddur */
  showTelegramBot: boolean;
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
        showVisualSearch: true,
        showWarehouse: false,
        showAiAutofill: true,
        showTelegramBot: true,
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
        showVisualSearch: true,
        showWarehouse: true,
        showAiAutofill: true,
        showTelegramBot: true,
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
        showVisualSearch: true,
        showWarehouse: true,
        showAiAutofill: true,
        showTelegramBot: true,
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
      const general = (generalRow?.value as any) || {};
      return {
        mode,
        disableShipping: !!general.disable_shipping,
        disableVisualSearch: !!general.disable_visual_search,
        disableWarehouse: !!general.disable_warehouse,
        disableAiAutofill: !!general.disable_ai_autofill,
        disableTelegramBot: !!general.disable_telegram_bot,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const cfg = getConfig(data?.mode || "both");
  if (data?.disableShipping) cfg.showShipping = false;
  if (data?.disableVisualSearch) cfg.showVisualSearch = false;
  if (data?.disableWarehouse) cfg.showWarehouse = false;
  if (data?.disableAiAutofill) cfg.showAiAutofill = false;
  if (data?.disableTelegramBot) cfg.showTelegramBot = false;
  // Real-estate-only platform: disable all non-realestate user-facing features
  cfg.showSales = false;
  cfg.showStock = false;
  cfg.showOrders = false;
  cfg.showShipping = false;
  cfg.showCheckout = false;
  cfg.showVisualSearch = false;
  return { ...cfg, isLoading };
}
