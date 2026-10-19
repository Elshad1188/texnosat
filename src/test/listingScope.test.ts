import { describe, expect, it } from "vitest";
import { categoryScopeMap, listingMatchesScope } from "@/lib/listingScope";

const categories = [
  { id: "car", slug: "avtomobiller", site_type: "transport", parent_id: null },
  { id: "home", slug: "menziller", site_type: "real_estate", parent_id: null },
  { id: "misc", slug: "elektronika", site_type: "general", parent_id: null },
  { id: "child", slug: "sedan", site_type: null, parent_id: "car" },
];
const map = categoryScopeMap(categories);

describe("the three homepage sections", () => {
  it("keeps transport and its inherited subcategories separate", () => {
    expect(categories.filter(c => listingMatchesScope(c.slug, map, "transport")).map(c => c.slug))
      .toEqual(["avtomobiller", "sedan"]);
  });
  it("keeps real estate separate", () => {
    expect(categories.filter(c => listingMatchesScope(c.slug, map, "real_estate")).map(c => c.slug))
      .toEqual(["menziller"]);
  });
  it("keeps mixed classifieds separate", () => {
    expect(categories.filter(c => listingMatchesScope(c.slug, map, "general")).map(c => c.slug))
      .toEqual(["elektronika"]);
  });
});