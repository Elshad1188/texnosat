import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Trash2, Loader2 } from "lucide-react";

interface ShippingMethodsTabProps {
  storeId: string;
}

const ShippingMethodsTab = ({ storeId }: ShippingMethodsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", price: "", estimated_days: "" });
  const [adding, setAdding] = useState(false);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["shipping-methods", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("store_id", storeId).order("created_at");
      return data || [];
    },
    enabled: !!storeId,
  });

  const addMethod = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("shipping_methods").insert({
      store_id: storeId,
      name: form.name,
      description: form.description || null,
      price: Number(form.price) || 0,
      estimated_days: form.estimated_days || null,
    } as any);

    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Çatdırılma üsulu əlavə edildi" });
      setForm({ name: "", description: "", price: "", estimated_days: "" });
      queryClient.invalidateQueries({ queryKey: ["shipping-methods", storeId] });
    }
    setAdding(false);
  };

  const toggleMethod = async (id: string, isActive: boolean) => {
    await supabase.from("shipping_methods").update({ is_active: isActive } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["shipping-methods", storeId] });
  };

  const deleteMethod = async (id: string) => {
    await supabase.from("shipping_methods").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["shipping-methods", storeId] });
    toast({ title: "Çatdırılma üsulu silindi" });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Truck className="h-4 w-4" /> Çatdırılma üsulları
      </h3>

      {/* Add form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Üsul adı</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Kuryer, Poçt..." className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qiymət (₼)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00" className="h-9" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Açıqlama</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Təfərrüat..." className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Təxmini müddət</Label>
              <Input value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })}
                placeholder="1-3 iş günü" className="h-9" />
            </div>
          </div>
          <Button size="sm" className="gap-1" onClick={addMethod} disabled={adding || !form.name.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Əlavə et</>}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {methods.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Hələ çatdırılma üsulu yoxdur</p>
      ) : (
        <div className="space-y-2">
          {methods.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.price > 0 ? `${m.price} ₼` : "Pulsuz"}
                    {m.estimated_days && ` · ${m.estimated_days}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={m.is_active} onCheckedChange={(v) => toggleMethod(m.id, v)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMethod(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingMethodsTab;
