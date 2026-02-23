import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { iconMap, availableIconNames } from "@/lib/icons";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, CircuitBoard, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const AdminCategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", slug: "", icon: "CircuitBoard", parent_id: "", sort_order: 0, is_active: true });

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const parents = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const resetForm = () => {
    setForm({ name: "", slug: "", icon: "CircuitBoard", parent_id: "", sort_order: 0, is_active: true });
    setEditId(null);
  };

  const openAdd = (parentId?: string) => {
    resetForm();
    if (parentId) setForm((f) => ({ ...f, parent_id: parentId }));
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || "CircuitBoard", parent_id: cat.parent_id || "", sort_order: cat.sort_order, is_active: cat.is_active });
    setDialogOpen(true);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[ə]/g, "e").replace(/[ü]/g, "u").replace(/[ö]/g, "o").replace(/[ş]/g, "s").replace(/[ç]/g, "c").replace(/[ğ]/g, "g").replace(/[ı]/g, "i").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Ad daxil edin", variant: "destructive" }); return; }
    const slug = form.slug || generateSlug(form.name);
    const payload = { name: form.name, slug, icon: form.icon, parent_id: form.parent_id || null, sort_order: form.sort_order, is_active: form.is_active };

    if (editId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editId);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Kateqoriya yeniləndi" });
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Kateqoriya əlavə edildi" });
    }
    setDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kateqoriya silindi" });
    fetchCategories();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("categories").update({ is_active: !current }).eq("id", id);
    fetchCategories();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCategory = (cat: Category, isChild = false) => {
    const Icon = iconMap[cat.icon] || CircuitBoard;
    const children = getChildren(cat.id);
    const isExpanded = expanded.has(cat.id);

    return (
      <div key={cat.id}>
        <div className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 ${isChild ? "ml-8" : ""} ${!cat.is_active ? "opacity-50" : ""}`}>
          {!isChild && children.length > 0 && (
            <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{cat.name}</span>
              <Badge variant="secondary" className="text-[10px]">{cat.slug}</Badge>
              {!cat.is_active && <Badge variant="outline" className="text-[10px]">Deaktiv</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isChild && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdd(cat.id)} title="Alt kateqoriya əlavə et">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} className="scale-75" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {!isChild && isExpanded && children.map((child) => renderCategory(child, true))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Kateqoriyalar ({parents.length})</h3>
        <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Yeni kateqoriya
        </Button>
      </div>

      <div className="space-y-2">
        {parents.map((cat) => renderCategory(cat))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Kateqoriyanı redaktə et" : "Yeni kateqoriya"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} placeholder="Kateqoriya adı" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="kateqoriya-slug" />
            </div>
            <div className="space-y-2">
              <Label>İkon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIconNames.map((name) => {
                    const Ic = iconMap[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          <Ic className="h-4 w-4" />
                          <span>{name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Əsas kateqoriya</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yoxdur (əsas kateqoriya)</SelectItem>
                  {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sıra nömrəsi</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktiv</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editId ? "Yenilə" : "Əlavə et"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategoryManager;
