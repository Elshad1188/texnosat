import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHomeMode } from "@/contexts/HomeModeContext";
import { useSiteType } from "@/hooks/useSiteType";
import { categoryScopeMap } from "@/lib/listingScope";

export function useListingScope() {
  const { mode } = useHomeMode();
  const { siteType, isLoading: siteLoading } = useSiteType();
  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["listing-scope-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, slug, site_type, parent_id, name, name_ru, icon, is_active, sort_order");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categoryMap = useMemo(() => categoryScopeMap(categories), [categories]);
  return {
    scope: mode || siteType,
    categories,
    categoryMap,
    isLoading: isLoading || (!mode && siteLoading),
    isError,
    refetch,
  };
}