import { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Loader2, Image as ImageIcon, X } from "lucide-react";
import { slugify, estimateReadingMinutes, stripHtml } from "@/lib/blog";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  views_count: number;
  created_at: string;
}

interface Category { id: string; name: string; slug: string; description: string | null; sort_order: number; is_active: boolean }
interface Tag { id: string; name: string; slug: string }

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ color: [] }, { background: [] }],
    ["blockquote", "code-block"],
    ["link", "image", "video"],
    ["clean"],
  ],
};

const AdminBlogManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [editingTagIds, setEditingTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newTag, setNewTag] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [p, c, t] = await Promise.all([
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_categories").select("*").order("sort_order"),
      supabase.from("blog_tags").select("*").order("name"),
    ]);
    if (p.data) setPosts(p.data as Post[]);
    if (c.data) setCategories(c.data as Category[]);
    if (t.data) setTags(t.data as Tag[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openEditor = async (post?: Post) => {
    if (post) {
      setEditing(post);
      const { data } = await supabase.from("blog_post_tags").select("tag_id").eq("post_id", post.id);
      setEditingTagIds(data?.map((d: any) => d.tag_id) || []);
    } else {
      setEditing({ title: "", slug: "", excerpt: "", content: "", cover_url: "", category_id: null, meta_title: "", meta_description: "", is_published: false, is_featured: false });
      setEditingTagIds([]);
    }
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
    if (error) {
      toast({ title: "Yükləmə xətası", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
    setEditing((prev) => prev ? { ...prev, cover_url: data.publicUrl } : prev);
    setUploading(false);
  };

  const savePost = async () => {
    if (!editing || !user) return;
    if (!editing.title?.trim()) { toast({ title: "Başlıq tələb olunur", variant: "destructive" }); return; }
    if (!editing.content?.trim()) { toast({ title: "Məzmun tələb olunur", variant: "destructive" }); return; }

    setSaving(true);
    const slug = editing.slug?.trim() || slugify(editing.title);
    const reading_minutes = estimateReadingMinutes(editing.content);
    const excerpt = editing.excerpt?.trim() || stripHtml(editing.content, 200);
    const meta_title = editing.meta_title?.trim() || editing.title;
    const meta_description = editing.meta_description?.trim() || stripHtml(editing.content, 160);

    const payload = {
      author_id: user.id,
      title: editing.title,
      slug,
      excerpt,
      content: editing.content,
      cover_url: editing.cover_url || null,
      category_id: editing.category_id || null,
      meta_title,
      meta_description,
      reading_minutes,
      is_published: !!editing.is_published,
      is_featured: !!editing.is_featured,
      published_at: editing.is_published ? (editing.published_at || new Date().toISOString()) : null,
    };

    let postId = editing.id;
    if (postId) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", postId);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); setSaving(false); return; }
      postId = data.id;
    }

    // sync tags
    await supabase.from("blog_post_tags").delete().eq("post_id", postId!);
    if (editingTagIds.length) {
      await supabase.from("blog_post_tags").insert(editingTagIds.map((tag_id) => ({ post_id: postId!, tag_id })));
    }

    toast({ title: "Yazı saxlanıldı ✓" });
    setEditing(null);
    setSaving(false);
    fetchAll();
  };

  const togglePublish = async (post: Post) => {
    const { error } = await supabase.from("blog_posts").update({
      is_published: !post.is_published,
      published_at: !post.is_published ? new Date().toISOString() : post.published_at,
    }).eq("id", post.id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Yazını silmək istədiyinizdən əminsiniz?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;
    const { error } = await supabase.from("blog_categories").insert({
      name: newCategory.name, slug: slugify(newCategory.name), description: newCategory.description || null,
    });
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setNewCategory({ name: "", description: "" });
    fetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Kateqoriyanı silmək istəyirsiniz?")) return;
    await supabase.from("blog_categories").delete().eq("id", id);
    fetchAll();
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const { error } = await supabase.from("blog_tags").insert({ name: newTag, slug: slugify(newTag) });
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    setNewTag("");
    fetchAll();
  };

  const deleteTag = async (id: string) => {
    await supabase.from("blog_tags").delete().eq("id", id);
    fetchAll();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editing.id ? "Yazını redaktə et" : "Yeni yazı"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Başlıq *</Label>
            <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Kateqoriya</Label>
              <Select value={editing.category_id || "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Yoxdur —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Üz şəkli</Label>
            <div className="flex gap-2 items-center">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} disabled={uploading} />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {editing.cover_url && <img src={editing.cover_url} alt="cover" className="mt-2 h-32 rounded-lg object-cover" />}
          </div>

          <div className="space-y-2">
            <Label>Qısa təsvir</Label>
            <Textarea rows={2} value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} placeholder="Boşdursa məzmundan götürülür" />
          </div>

          <div className="space-y-2">
            <Label>Məzmun *</Label>
            <div className="bg-background rounded-lg">
              <ReactQuill theme="snow" value={editing.content || ""} onChange={(v) => setEditing({ ...editing, content: v })} modules={quillModules} className="text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teqlər</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const active = editingTagIds.includes(t.id);
                return (
                  <Badge key={t.id} variant={active ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setEditingTagIds((prev) => active ? prev.filter((id) => id !== t.id) : [...prev, t.id])}>
                    #{t.name}
                  </Badge>
                );
              })}
              {tags.length === 0 && <p className="text-xs text-muted-foreground">Hələ teq yoxdur — Teqlər tabından əlavə edin.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SEO Meta Title</Label>
              <Input value={editing.meta_title || ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SEO Meta Description</Label>
              <Input value={editing.meta_description || ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
              <Label>Dərc et</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />
              <Label>Önə çıxar</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={savePost} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saxla"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Ləğv et</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="posts" className="space-y-4">
      <TabsList>
        <TabsTrigger value="posts">Yazılar</TabsTrigger>
        <TabsTrigger value="categories">Kateqoriyalar</TabsTrigger>
        <TabsTrigger value="tags">Teqlər</TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-foreground">{posts.length} yazı</h3>
          <Button onClick={() => openEditor()} size="sm"><Plus className="h-4 w-4 mr-1" /> Yeni yazı</Button>
        </div>
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {post.cover_url ? (
                <img src={post.cover_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{post.title}</p>
                  {post.is_featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={post.is_published ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {post.is_published ? "Dərc edilib" : "Qaralama"}
                  </Badge>
                  <span>{post.views_count} baxış</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString("az-AZ")}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.is_published ? "Gizlət" : "Dərc et"}>
                  {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditor(post)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Hələ yazı yoxdur</p>}
        </div>
      </TabsContent>

      <TabsContent value="categories" className="space-y-3">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input placeholder="Ad" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
              <Input placeholder="Açıqlama (ixtiyari)" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
              <Button onClick={addCategory}><Plus className="h-4 w-4 mr-1" /> Əlavə et</Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="tags" className="space-y-3">
        <Card>
          <CardContent className="pt-4 flex gap-2">
            <Input placeholder="Teq adı" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
            <Button onClick={addTag}><Plus className="h-4 w-4 mr-1" /> Əlavə et</Button>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge key={t.id} variant="outline" className="gap-1 py-1">
              #{t.name}
              <button onClick={() => deleteTag(t.id)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default AdminBlogManager;
