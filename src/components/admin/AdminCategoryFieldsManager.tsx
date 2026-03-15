import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Settings2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface CategoryField {
  id: string;
  category_slug: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: any;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

const fieldTypes = [
  { value: "text", label: "Mətn" },
  { value: "number", label: "Rəqəm" },
  { value: "select", label: "Seçim (dropdown)" },
];

const AdminCategoryFieldsManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    options_text: "",
    is_required: false,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    supabase.from("categories").select("*").is("parent_id", null).eq("is_active", true).order("sort_order")
      .then(({ data }) => { setCategories(data || []); setLoading(false); });
  }, []);

  const fetchFields = async (slug: string) => {
    const { data } = await supabase.from("category_fields").select("*").eq("category_slug", slug).order("sort_order");
    setFields((data as CategoryField[]) || []);
  };

  useEffect(() => {
    if (selectedCategory) fetchFields(selectedCategory);
    else setFields([]);
  }, [selectedCategory]);

  const generateFieldName = (label: string) =>
    label.toLowerCase().replace(/[əƏ]/g, "e").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const resetForm = () => {
    setForm({ field_name: "", field_label: "", field_type: "text", options_text: "", is_required: false, sort_order: 0, is_active: true });
    setEditId(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (f: CategoryField) => {
    setEditId(f.id);
    const optionsText = f.field_type === "select" && Array.isArray(f.options) ? f.options.join("\n") : "";
    setForm({
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type,
      options_text: optionsText,
      is_required: f.is_required,
      sort_order: f.sort_order,
      is_active: f.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.field_label || !selectedCategory) {
      toast({ title: "Sahə adı daxil edin", variant: "destructive" });
      return;
    }
    const fieldName = form.field_name || generateFieldName(form.field_label);
    const options = form.field_type === "select" ? form.options_text.split("\n").map(s => s.trim()).filter(Boolean) : null;

    const payload = {
      category_slug: selectedCategory,
      field_name: fieldName,
      field_label: form.field_label,
      field_type: form.field_type,
      options,
      is_required: form.is_required,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase.from("category_fields").update(payload).eq("id", editId);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Sahə yeniləndi" });
    } else {
      const { error } = await supabase.from("category_fields").insert(payload);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Sahə əlavə edildi" });
    }
    setDialogOpen(false);
    resetForm();
    fetchFields(selectedCategory);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("category_fields").delete().eq("id", id);
    toast({ title: "Sahə silindi" });
    fetchFields(selectedCategory);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("category_fields").update({ is_active: !current }).eq("id", id);
    fetchFields(selectedCategory);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Kateqoriya sahələri</h3>
      </div>

      <div className="mb-4 space-y-2">
        <Label>Kateqoriya seçin</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger><SelectValue placeholder="Kateqoriya seçin" /></SelectTrigger>
          <SelectContent>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{fields.length} sahə</p>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" /> Yeni sahə
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map(f => (
              <div key={f.id} className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 ${!f.is_active ? "opacity-50" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Settings2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{f.field_label}</span>
                    <Badge variant="secondary" className="text-[10px]">{f.field_type}</Badge>
                    {f.is_required && <Badge variant="destructive" className="text-[10px]">Məcburi</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{f.field_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={f.is_active} onCheckedChange={() => toggleActive(f.id, f.is_active)} className="scale-75" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(f.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Bu kateqoriya üçün hələ sahə əlavə edilməyib</p>
            )}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Sahəni redaktə et" : "Yeni sahə"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sahə adı (göstəriləcək)</Label>
              <Input value={form.field_label} onChange={e => setForm({ ...form, field_label: e.target.value, field_name: generateFieldName(e.target.value) })} placeholder="Məs: RAM" />
            </div>
            <div className="space-y-2">
              <Label>Sahə kodu</Label>
              <Input value={form.field_name} onChange={e => setForm({ ...form, field_name: e.target.value })} placeholder="ram" />
            </div>
            <div className="space-y-2">
              <Label>Sahə tipi</Label>
              <Select value={form.field_type} onValueChange={v => setForm({ ...form, field_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.field_type === "select" && (
              <div className="space-y-2">
                <Label>Seçimlər (hər sətirdə bir)</Label>
                <Textarea value={form.options_text} onChange={e => setForm({ ...form, options_text: e.target.value })} placeholder={"8 GB\n16 GB\n32 GB"} rows={4} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Sıra nömrəsi</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_required} onCheckedChange={v => setForm({ ...form, is_required: v })} />
                <Label>Məcburi</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Aktiv</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editId ? "Yenilə" : "Əlavə et"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategoryFieldsManager;
