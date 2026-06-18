import { useEffect, useState } from "react";
import { Package, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CJItem {
  pid: string;
  title: string;
  image: string;
  price_azn: number;
  price_usd: number;
  category?: string;
  sku?: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cj-products`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CJProducts = () => {
  const [items, setItems] = useState<CJItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (p: number) => {
    const res = await fetch(`${FN_URL}?page=${p}&limit=12`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Yüklənmə xətası");
    return json.items as CJItem[];
  };

  useEffect(() => {
    fetchPage(1)
      .then((it) => {
        setItems(it);
        setHasMore(it.length >= 12);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const it = await fetchPage(next);
      setItems((prev) => [...prev, ...it]);
      setPage(next);
      setHasMore(it.length >= 12);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) return null;

  return (
    <section className="py-8 md:py-12 bg-muted/30 border-t">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center gap-2.5">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Dünya bazarından məhsullar
            </h2>
            <p className="text-xs text-muted-foreground md:text-sm">
              Birbaşa beynəlxalq tədarükçülərdən, çatdırılma daxil
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <article
                  key={p.pid}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      🌍 Beynəlxalq
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">{p.title}</h3>
                    <div className="mt-auto pt-2">
                      <div className="text-base font-bold text-primary">
                        {p.price_azn.toLocaleString("az-AZ", { minimumFractionDigits: 2 })} ₼
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ExternalLink className="h-3 w-3" /> Sifariş üçün admin ilə əlaqə
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Daha çox
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CJProducts;
