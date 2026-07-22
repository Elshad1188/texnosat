import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteType = "real_estate" | "general" | "both";

/**
 * Global site type — controls which categories are visible.
 * - real_estate: only property categories (bina.az style)
 * - general: only general classifieds (avtomobil, elektronika, geyim, ...)
 * - both: everything
 */
export function useSiteType(): { siteType: SiteType; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["site-type"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site_type")
        .maybeSingle();
      const t = ((data?.value as any)?.type as SiteType) || "real_estate";
      return t;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { siteType: data || "real_estate", isLoading };
}

/** Whether a category with a given site_type should be shown under the current mode. */
export function categoryMatchesSite(
  categorySiteType: string | null | undefined,
  siteType: SiteType
): boolean {
  const cs = (categorySiteType || "real_estate") as SiteType;
  if (siteType === "both" || cs === "both") return true;
  return cs === siteType;
}
