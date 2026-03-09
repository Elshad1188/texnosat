import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Save, Trash2, Loader2, Edit2, X } from "lucide-react";

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

const AdminPagesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", content: "", is_published: true });
  const [adding, setAdding] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await supabase.from("pages").select("*").order("created_at");
    setPages((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const startEdit = (page: Page) => {
    setEditingId(page.id);
    setForm({ slug: page.slug, title: page.title, content: page.content, is_published: page.is_published });
    setAdding(false);
  };

  const savePage = async () => {
    if (!form.title || !form.slug) {
      toast({ title: "Başlıq və slug tələb olunur", variant: "destructive" });
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("pages").update({
        title: form.title,
        content: form.content,
        is_published: form.is_published,
        updated_by: user?.id,
      }).eq("id", editingId);
      if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }
      toast({ title: "Səhifə yeniləndi" });
    } else {
      const { error } = await supabase.from("pages").insert({
        slug: form.slug,
        title: form.title,
        content: form.content,
        is_published: form.is_published,
        updated_by: user?.id,
      });
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Səhifə əlavə edildi" });
    }

    setEditingId(null);
    setAdding(false);
    setForm({ slug: "", title: "", content: "", is_published: true });
    fetchPages();
  };

  const deletePage = async (id: string) => {
    await supabase.from("pages").delete().eq("id", id);
    setPages(prev => prev.filter(p => p.id !== id));
    toast({ title: "Səhifə silindi" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Statik səhifələr ({pages.length})</h3>
        <Button size="sm" onClick={() => { setAdding(true); setEditingId(null); setForm({ slug: "", title: "", content: "", is_published: true }); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni səhifə
        </Button>
      </div>

      {(adding || editingId) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlıq</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="h-9"
                disabled={!!editingId}
                placeholder="about, rules, privacy..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Məzmun</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} placeholder="Səhifə məzmununu yazın..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            <span className="text-xs text-muted-foreground">Yayımla</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={savePage} className="gap-1"><Save className="h-3.5 w-3.5" /> Saxla</Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setEditingId(null); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Ləğv
            </Button>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Hələ səhifə yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                  <span className="text-[10px] text-muted-foreground">/{p.slug}</span>
                  {!p.is_published && <span className="text-[10px] text-amber-600">Qaralama</span>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{p.content.slice(0, 100)}...</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(p)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deletePage(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPagesManager;
