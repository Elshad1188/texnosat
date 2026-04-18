import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Eye, Heart, MessageCircle, Share2, ArrowLeft, Loader2, Trash2 } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  reading_minutes: number | null;
  views_count: number;
  published_at: string | null;
  author_id: string;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [category, setCategory] = useState<{ name: string; slug: string } | null>(null);
  const [tags, setTags] = useState<{ name: string; slug: string }[]>([]);
  const [related, setRelated] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      setLoading(true);
      const { data: p } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!p) { setLoading(false); return; }
      setPost(p as Post);

      // increment views (fire and forget)
      supabase.from("blog_posts").update({ views_count: (p as Post).views_count + 1 }).eq("id", (p as Post).id).then(() => {});

      // SEO
      document.title = `${(p as Post).meta_title || (p as Post).title} — Elan24 Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", (p as Post).meta_description || (p as Post).excerpt || "");

      const [authorRes, catRes, tagRes, likesRes, likedRes, commentsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", (p as Post).author_id).maybeSingle(),
        (p as Post).category_id ? supabase.from("blog_categories").select("name, slug").eq("id", (p as Post).category_id!).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("blog_post_tags").select("tag_id, blog_tags(name, slug)").eq("post_id", (p as Post).id),
        supabase.from("blog_likes").select("id", { count: "exact", head: true }).eq("post_id", (p as Post).id),
        user ? supabase.from("blog_likes").select("id").eq("post_id", (p as Post).id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("blog_comments").select("*").eq("post_id", (p as Post).id).order("created_at", { ascending: true }),
      ]);

      if (authorRes.data) setAuthor(authorRes.data as any);
      if (catRes.data) setCategory(catRes.data as any);
      if (tagRes.data) setTags(tagRes.data.map((t: any) => t.blog_tags).filter(Boolean));
      if (likesRes.count !== null) setLikeCount(likesRes.count);
      setLiked(!!likedRes.data);

      if (commentsRes.data) {
        const userIds = [...new Set(commentsRes.data.map((c: any) => c.user_id))];
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
        const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        setComments(commentsRes.data.map((c: any) => ({ ...c, profile: profMap.get(c.user_id) })));
      }

      // related
      if ((p as Post).category_id) {
        const { data: rel } = await supabase.from("blog_posts").select("*").eq("is_published", true).eq("category_id", (p as Post).category_id).neq("id", (p as Post).id).limit(3);
        if (rel) setRelated(rel as Post[]);
      }

      setLoading(false);
    };
    fetchPost();
  }, [slug, user]);

  const toggleLike = async () => {
    if (!user || !post) { toast({ title: "Bəyənmək üçün daxil olun" }); return; }
    if (liked) {
      await supabase.from("blog_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false); setLikeCount((c) => c - 1);
    } else {
      await supabase.from("blog_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true); setLikeCount((c) => c + 1);
    }
  };

  const addComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    setPosting(true);
    const { data, error } = await supabase.from("blog_comments").insert({
      post_id: post.id, user_id: user.id, content: newComment.trim(),
    }).select("*").single();
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); setPosting(false); return; }
    const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle();
    setComments((prev) => [...prev, { ...(data as any), profile: prof }]);
    setNewComment("");
    setPosting(false);
  };

  const deleteComment = async (id: string) => {
    await supabase.from("blog_comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const sharePost = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: post?.title, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Linkkopyalandı" });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Yazı tapılmadı</p>
        <Button onClick={() => navigate("/blog")}><ArrowLeft className="h-4 w-4 mr-1" /> Bloga qayıt</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <article className="container mx-auto px-4 py-6 pb-20 md:pb-10 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Bütün yazılar
        </Link>

        {category && <Badge className="mb-3">{category.name}</Badge>}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          {author && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarImage src={author.avatar_url || undefined} /><AvatarFallback>{author.full_name?.[0] || "A"}</AvatarFallback></Avatar>
              <span className="text-foreground font-medium">{author.full_name || "Müəllif"}</span>
            </div>
          )}
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.published_at && new Date(post.published_at).toLocaleDateString("az-AZ")}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.reading_minutes} dəq oxuma</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.views_count}</span>
        </div>

        {post.cover_url && (
          <img src={post.cover_url} alt={post.title} className="w-full rounded-xl mb-6 aspect-video object-cover" />
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-img:rounded-lg prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: post.content }} />

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((t) => <Badge key={t.slug} variant="outline">#{t.name}</Badge>)}
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 border-y border-border py-4">
          <Button variant={liked ? "default" : "outline"} size="sm" onClick={toggleLike} className="gap-1.5">
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likeCount}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageCircle className="h-4 w-4" /> {comments.length}
          </Button>
          <Button variant="outline" size="sm" onClick={sharePost} className="gap-1.5 ml-auto">
            <Share2 className="h-4 w-4" /> Paylaş
          </Button>
        </div>

        {/* Comments */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Şərhlər ({comments.length})</h2>

          {user ? (
            <div className="mb-6 space-y-2">
              <Textarea placeholder="Şərhinizi yazın..." rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={addComment} disabled={posting || !newComment.trim()} size="sm">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Göndər"}
                </Button>
              </div>
            </div>
          ) : (
            <Card className="mb-6"><CardContent className="py-4 text-center text-sm text-muted-foreground">
              Şərh yazmaq üçün <Link to="/auth" className="text-primary hover:underline">daxil olun</Link>
            </CardContent></Card>
          )}

          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={c.profile?.avatar_url || undefined} />
                  <AvatarFallback>{c.profile?.full_name?.[0] || "A"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground">{c.profile?.full_name || "İstifadəçi"}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("az-AZ")}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                </div>
                {user?.id === c.user_id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteComment(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">İlk şərhi siz yazın</p>}
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Əlaqəli yazılar</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group">
                  <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
                    {r.cover_url && <img src={r.cover_url} alt={r.title} className="aspect-video w-full object-cover" />}
                    <CardContent className="p-3">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{r.title}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
