import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FeaturedListings from "@/components/FeaturedListings";

const fixtures = vi.hoisted(() => ({
  scope: "real_estate",
  listings: Array.from({ length: 17 }, (_, i) => ({
    id: `listing-${i}`, title: `Listing ${i}`, price: 10, currency: "₼",
    category: "menziller", created_at: "2026-10-01", store_id: null,
  })),
}));
vi.mock("@/hooks/useListingScope", () => ({ useListingScope: () => ({
  scope: fixtures.scope, categoryMap: { menziller: "real_estate", avtomobiller: "transport" },
  isLoading: false, isError: false,
}) }));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "az" }), useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/ListingCard", () => ({ default: ({ id }: { id: string }) => <div data-testid="listing">{id}</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let start = 0, end = 7, promoted = false, slugs: string[] = [];
  const builder = {
    select: () => builder,
    eq: (column: string) => { if (column === "is_premium" || column === "is_urgent") promoted = true; return builder; },
    in: (_column: string, values: string[]) => { slugs = values; return builder; },
    order: () => builder, limit: () => builder,
    range: (from: number, to: number) => { start = from; end = to; return builder; },
    maybeSingle: async () => ({ data: { value: { homepage_premium_count: 0, homepage_urgent_count: 0, homepage_new_count: 8 } } }),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: table === "listings" && !promoted
      ? fixtures.listings.filter(l => slugs.includes(l.category)).slice(start, end + 1) : [] }),
  };
  return builder;
} } }));

describe("homepage pagination regression", () => {
  it("retains additional pages across rerenders and clears them when the section changes", async () => {
    fixtures.scope = "real_estate";
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = () => <QueryClientProvider client={client}><MemoryRouter><FeaturedListings /></MemoryRouter></QueryClientProvider>;
    const { rerender } = render(view());
    await waitFor(() => expect(screen.getAllByTestId("listing")).toHaveLength(8));
    fireEvent.click(screen.getByRole("button", { name: "home.load_more" }));
    await waitFor(() => expect(screen.getAllByTestId("listing")).toHaveLength(16));
    rerender(view());
    expect(screen.getAllByTestId("listing")).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: "home.load_more" }));
    await waitFor(() => expect(screen.getAllByTestId("listing")).toHaveLength(17));
    expect(screen.queryByRole("button", { name: "home.load_more" })).toBeNull();
    fixtures.scope = "transport";
    await act(async () => rerender(view()));
    await waitFor(() => expect(screen.queryAllByTestId("listing")).toHaveLength(0));
    client.clear();
  });
});