import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Eye, Search, Star, Loader2, BookOpen } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  reading_minutes: number | null;
  views_count: number;
  is_featured: boolean;
  published_at: string | null;
  category_id: string | null;
}

interface Category { id: string; name: string; slug: string }

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q);

  useEffect(() => {
    document.title = "Blog — Elan24";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Elan24 blog — alış-veriş, mağaza idarəçiliyi və platforma yenilikləri haqqında məqalələr.");
  }, []);

  useEffect(() => { setSearch(q); }, [q]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [c, catRes] = await Promise.all([
        supabase.from("blog_categories").select("*").eq("is_active", true).order("sort_order"),
        Promise.resolve(null),
      ]);
      if (c.data) setCategories(c.data as Category[]);

      let cat: Category | undefined;
      if (categorySlug && c.data) {
        cat = (c.data as Category[]).find((x) => x.slug === categorySlug);
      }
      let query = supabase.from("blog_posts").select("*").eq("is_published", true).order("published_at", { ascending: false });
      if (cat) query = query.eq("category_id", cat.id);
      if (q) query = query.ilike("title", `%${q}%`);

      const { data } = await query.limit(60);
      if (data) setPosts(data as Post[]);
      setLoading(false);
    };
    fetchData();
  }, [categorySlug, q]);

  const featured = posts.find((p) => p.is_featured);
  const rest = posts.filter((p) => !featured || p.id !== featured.id);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) params.set("q", search); else params.delete("q");
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-10">
        {/* Hero */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <BookOpen className="h-3.5 w-3.5" /> Blog
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Məqalələr və yeniliklər</h1>
            <p className="mt-1 text-sm text-muted-foreground">Faydalı bələdçilər, məsləhətlər və platforma xəbərləri</p>
          </div>
          <form onSubmit={submitSearch} className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Axtar..." className="pl-9" />
          </form>
        </div>

        {/* Categories */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link to="/blog" className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${!categorySlug ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}>
            Hamısı
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/blog?category=${c.slug}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${categorySlug === c.slug ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              {c.name}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Hələ yazı yoxdur</p>
          </div>
        ) : (
          <>
            {featured && (
              <Link to={`/blog/${featured.slug}`} className="block mb-8 group">
                <Card className="overflow-hidden border-border hover:shadow-lg transition-shadow">
                  <div className="grid md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto bg-muted overflow-hidden">
                      {featured.cover_url ? (
                        <img src={featured.cover_url} alt={featured.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><BookOpen className="h-16 w-16 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <CardContent className="p-6 flex flex-col justify-center">
                      <Badge className="w-fit mb-3 gap-1"><Star className="h-3 w-3 fill-current" /> Önə çıxan</Badge>
                      <h2 className="font-display text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{featured.title}</h2>
                      {featured.excerpt && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{featured.excerpt}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{featured.published_at && new Date(featured.published_at).toLocaleDateString("az-AZ")}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{featured.reading_minutes} dəq</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{featured.views_count}</span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <Card className="overflow-hidden h-full border-border hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {post.cover_url ? (
                        <img src={post.cover_url} alt={post.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                      {post.excerpt && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{post.published_at && new Date(post.published_at).toLocaleDateString("az-AZ")}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_minutes} dəq</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
