import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Search, Languages } from "lucide-react";

interface Translation {
  id: string;
  key: string;
  az: string;
  ru: string;
  category: string;
}

const AdminTranslationsManager = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<Translation | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Translation>>({ key: "", az: "", ru: "", category: "common" });

  // Language settings
  const { data: settings } = useQuery({
    queryKey: ["language_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "language_settings").maybeSingle();
      return (data?.value as any) || { ru_enabled: true, default_language: "az" };
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (next: any) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "language_settings", value: next }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["language_settings"] });
      toast({ title: "Yadda saxlandı" });
    },
    onError: (e: any) => toast({ title: "Xəta", description: e.message, variant: "destructive" }),
  });

  // Translations
  const { data: items = [], isLoading } = useQuery<Translation[]>({
    queryKey: ["translations_admin"],
    queryFn: async () => {
      const { data } = await supabase.from("translations").select("*").order("category").order("key");
      return (data as any) || [];
    },
  });

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      if (filterCat !== "all" && i.category !== filterCat) return false;
      if (!q) return true;
      return i.key.toLowerCase().includes(q) || i.az.toLowerCase().includes(q) || i.ru.toLowerCase().includes(q);
    });
  }, [items, search, filterCat]);

  const save = useMutation({
    mutationFn: async (t: Partial<Translation>) => {
      if (!t.key?.trim()) throw new Error("Açar boş ola bilməz");
      if (t.id) {
        const { error } = await supabase
          .from("translations")
          .update({ key: t.key, az: t.az || "", ru: t.ru || "", category: t.category || "common" })
          .eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("translations")
          .insert({ key: t.key, az: t.az || "", ru: t.ru || "", category: t.category || "common" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Yadda saxlandı" });
      qc.invalidateQueries({ queryKey: ["translations_admin"] });
      setEditing(null);
      setCreating(false);
      setForm({ key: "", az: "", ru: "", category: "common" });
    },
    onError: (e: any) => toast({ title: "Xəta", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("translations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Silindi" });
      qc.invalidateQueries({ queryKey: ["translations_admin"] });
    },
  });

  const openEdit = (t: Translation) => {
    setEditing(t);
    setForm(t);
  };

  return (
    <div className="space-y-6">
      {/* Language settings */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Dil tənzimləmələri</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Rus dili aktiv</Label>
            <p className="text-xs text-muted-foreground">İstifadəçilər saytı rus dilində aça bilər</p>
          </div>
          <Switch
            checked={settings?.ru_enabled ?? true}
            onCheckedChange={(v) => updateSettings.mutate({ ...settings, ru_enabled: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Standart dil</Label>
            <p className="text-xs text-muted-foreground">Yeni ziyarətçilər üçün ilkin dil</p>
          </div>
          <Select
            value={settings?.default_language ?? "az"}
            onValueChange={(v) => updateSettings.mutate({ ...settings, default_language: v })}
          >
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="az">Azərbaycan</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Translations table */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Açar / mətn axtar..." className="pl-8" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setCreating(true); setForm({ key: "", az: "", ru: "", category: "common" }); }} className="gap-1">
            <Plus className="h-4 w-4" /> Yeni
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Tərcümə tapılmadı</p>
            ) : filtered.map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.key}</code>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-xs text-muted-foreground">AZ:</span> {t.az || <em className="text-muted-foreground">boş</em>}</div>
                      <div><span className="text-xs text-muted-foreground">RU:</span> {t.ru || <em className="text-muted-foreground">boş</em>}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Silmək istəyirsiniz?")) remove.mutate(t.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={!!editing || creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Tərcüməni redaktə et" : "Yeni tərcümə"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Açar (key)</Label>
              <Input value={form.key || ""} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="məs: nav.home" />
            </div>
            <div>
              <Label>Kateqoriya</Label>
              <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="common, header, footer..." />
            </div>
            <div>
              <Label>Azərbaycanca</Label>
              <Textarea value={form.az || ""} onChange={(e) => setForm({ ...form, az: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Rusca</Label>
              <Textarea value={form.ru || ""} onChange={(e) => setForm({ ...form, ru: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Ləğv et</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Yadda saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTranslationsManager;
