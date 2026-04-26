import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Region {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  type?: string;
}

const AdminRegionManager = () => {
  const { toast } = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", parent_id: "", sort_order: 0, is_active: true });

  const fetchRegions = async () => {
    const { data } = await supabase.from("regions").select("*").order("sort_order");
    setRegions((data as Region[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRegions(); }, []);

  const parents = regions.filter((r) => !r.parent_id);
  const getChildren = (parentId: string) => regions.filter((r) => r.parent_id === parentId);

  const resetForm = () => { setForm({ name: "", parent_id: "", sort_order: 0, is_active: true }); setEditId(null); };

  const openAdd = (parentId?: string) => {
    resetForm();
    if (parentId) setForm((f) => ({ ...f, parent_id: parentId }));
    setDialogOpen(true);
  };

  const openEdit = (reg: Region) => {
    setEditId(reg.id);
    setForm({ name: reg.name, parent_id: reg.parent_id || "", sort_order: reg.sort_order, is_active: reg.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Ad daxil edin", variant: "destructive" }); return; }
    const payload = { name: form.name, parent_id: form.parent_id || null, sort_order: form.sort_order, is_active: form.is_active };
    if (editId) {
      const { error } = await supabase.from("regions").update(payload).eq("id", editId);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Bölgə yeniləndi" });
    } else {
      const { error } = await supabase.from("regions").insert(payload);
      if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Bölgə əlavə edildi" });
    }
    setDialogOpen(false);
    resetForm();
    fetchRegions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bölgə silindi" });
    fetchRegions();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("regions").update({ is_active: !current }).eq("id", id);
    fetchRegions();
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const renderRegion = (reg: Region, isChild = false) => {
    const children = getChildren(reg.id);
    const isExpanded = expanded.has(reg.id);
    return (
      <div key={reg.id}>
        <div className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 ${isChild ? "ml-8" : ""} ${!reg.is_active ? "opacity-50" : ""}`}>
          {!isChild && children.length > 0 && (
            <button onClick={() => toggleExpand(reg.id)} className="text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <MapPin className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{reg.name}</span>
              {children.length > 0 && <Badge variant="secondary" className="text-[10px]">{children.length} alt</Badge>}
              {!reg.is_active && <Badge variant="outline" className="text-[10px]">Deaktiv</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isChild && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdd(reg.id)} title="Alt bölgə əlavə et">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Switch checked={reg.is_active} onCheckedChange={() => toggleActive(reg.id, reg.is_active)} className="scale-75" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(reg)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(reg.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {!isChild && isExpanded && children.map((child) => renderRegion(child, true))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Bölgələr ({parents.length})</h3>
        <Button size="sm" onClick={() => openAdd()} className="gap-1.5"><Plus className="h-4 w-4" /> Yeni bölgə</Button>
      </div>
      <div className="space-y-2">{parents.map((r) => renderRegion(r))}</div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Bölgəni redaktə et" : "Yeni bölgə"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bölgə adı" />
            </div>
            <div className="space-y-2">
              <Label>Əsas bölgə</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yoxdur (əsas bölgə)</SelectItem>
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

export default AdminRegionManager;
