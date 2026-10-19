import { categoryMatchesSite, type SiteType } from "@/hooks/useSiteType";

export interface ScopeCategory {
  id: string;
  slug: string;
  site_type: string | null;
  parent_id: string | null;
}

export function categoryScopeMap(categories: ScopeCategory[]): Record<string, string> {
  const byId = new Map(categories.map(category => [category.id, category]));
  return Object.fromEntries(categories.map(category => {
    let current: ScopeCategory | undefined = category;
    const visited = new Set<string>();
    while (current && !current.site_type && current.parent_id && !visited.has(current.id)) {
      visited.add(current.id);
      current = byId.get(current.parent_id);
    }
    return [category.slug, current?.site_type || "real_estate"];
  }));
}

export function listingMatchesScope(category: string, map: Record<string, string>, scope: SiteType): boolean {
  return categoryMatchesSite(map[category], scope);
}