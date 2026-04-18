import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, ArrowRight } from "lucide-react";

const LatestBlogPosts = () => {
  const { data: posts = [] } = useQuery({
    queryKey: ["latest-blog-posts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_url, reading_minutes, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  if (posts.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Son blog yazıları</h2>
        </div>
        <Link
          to="/blog"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Hamısı <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post: any) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group">
            <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:-translate-y-0.5">
              {post.cover_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={post.cover_url}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {post.reading_minutes || 1} dəq oxunuş
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LatestBlogPosts;
