import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description:
    "Search active public real-estate listings on Elan24 by keyword, category slug, region, deal type (satilir/kiraye), and price range.",
  inputSchema: {
    query: z.string().optional().describe("Free-text search on title/description."),
    category_slug: z.string().optional().describe("Category slug, e.g. 'menziller'."),
    region: z.string().optional().describe("Region/city name."),
    deal_type: z.enum(["satilir", "kiraye"]).optional().describe("Sale or rent."),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    limit: z.number().optional().describe("Max results (default 20, cap 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const limit = Math.min(input.limit ?? 20, 50);
    let q = supabase
      .from("listings")
      .select("id,title,price,currency,region,category_slug,deal_type,created_at,image_urls")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (input.query) q = q.ilike("title", `%${input.query}%`);
    if (input.category_slug) q = q.eq("category_slug", input.category_slug);
    if (input.region) q = q.ilike("region", `%${input.region}%`);
    if (input.deal_type) q = q.eq("deal_type", input.deal_type);
    if (input.min_price != null) q = q.gte("price", input.min_price);
    if (input.max_price != null) q = q.lte("price", input.max_price);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
