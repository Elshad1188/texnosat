
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Gift, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Trophy, 
  History, 
  TrendingUp, 
  DollarSign,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SpinPrize {
  id: string;
  label: string;
  amount: number;
  chance: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface SpinHistory {
  id: string;
  user_id: string;
  prize_id: string;
  amount: number;
  created_at: string;
  user_email?: string;
}

const AdminGiftsManager = () => {
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<SpinPrize[]>([]);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Partial<SpinPrize> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prizesData } = await supabase
        .from("spin_prizes")
        .select("*")
        .order("chance", { ascending: false });
      
      const { data: historyData } = await supabase
        .from("spin_history")
        .select(`
          *,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      setPrizes(prizesData || []);
      setHistory(historyData || []);
    } catch (err: any) {
      toast({ title: "Məlumat yüklənmədi", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrize = async () => {
    if (!editingPrize?.label || editingPrize.chance === undefined) return;
    setSaving(true);
    try {
      if (editingPrize.id) {
        const { error } = await supabase
          .from("spin_prizes")
          .update(editingPrize)
          .eq("id", editingPrize.id);
        if (error) throw error;
        toast({ title: "Hədiyyə yeniləndi" });
      } else {
        const { error } = await supabase
          .from("spin_prizes")
          .insert(editingPrize);
        if (error) throw error;
        toast({ title: "Yeni hədiyyə əlavə edildi" });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm("Bu hədiyyəni silmək istədiyinizə əminsiniz?")) return;
    try {
      const { error } = await supabase.from("spin_prizes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Hədiyyə silindi" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
  };

  const stats = {
    totalGiven: history.reduce((acc, h) => acc + Number(h.amount), 0),
    totalSpins: history.length,
    activePrizes: prizes.filter(p => p.is_active).length
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Cəmi Verilən</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalGiven.toFixed(2)} AZN</div>
          <div className="flex items-center gap-1 text-[10px] text-green-500">
            <TrendingUp className="h-3 w-3" /> Son 50 fırlatma üzrə
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Cəmi Fırlatma</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalSpins}</div>
          <div className="text-xs text-muted-foreground">İstifadəçi aktivliyi</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Aktiv Hədiyyələr</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.activePrizes}</div>
          <div className="text-xs text-muted-foreground">Çarx üzərindəki bölmələr</div>
        </div>
      </div>

      {/* Prizes Management */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">🎡 Çarx Hədiyyələri</h3>
          </div>
          <Button 
            size="sm" 
            className="h-8 gap-1.5 bg-gradient-primary" 
            onClick={() => {
              setEditingPrize({ label: "", amount: 0, chance: 1, color: "#f97316", is_active: true });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Əlavə et
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adı</TableHead>
                <TableHead>Məbləğ</TableHead>
                <TableHead>Şans (Weight)</TableHead>
                <TableHead>Rəng</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prizes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell>{p.amount} AZN</TableCell>
                  <TableCell>{p.chance}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: p.color }} />
                      <span className="text-xs font-mono">{p.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {p.is_active ? "Aktiv" : "Deaktiv"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => {
                          setEditingPrize(p);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive" 
                        onClick={() => handleDeletePrize(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Son Qazananlar</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İstifadəçi ID</TableHead>
                <TableHead>Udulmuş Məbləğ</TableHead>
                <TableHead>Tarix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs text-muted-foreground">{h.user_id}</TableCell>
                  <TableCell className="font-semibold text-green-600">+{h.amount} AZN</TableCell>
                  <TableCell className="text-xs">
                    {new Date(h.created_at).toLocaleString("az-AZ")}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Hələ qalib yoxdur
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPrize?.id ? "Hədiyyəni Redaktə Et" : "Yeni Hədiyyə Əlavə Et"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="label">Adı (Məsələn: 1 AZN)</Label>
              <Input 
                id="label" 
                value={editingPrize?.label || ""} 
                onChange={(e) => setEditingPrize(prev => ({ ...prev, label: e.target.value }))}
                placeholder="0.50 AZN"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Məbləğ (AZN)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01"
                  value={editingPrize?.amount || 0} 
                  onChange={(e) => setEditingPrize(prev => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chance">Şans (Weight)</Label>
                <Input 
                  id="chance" 
                  type="number" 
                  value={editingPrize?.chance || 1} 
                  onChange={(e) => setEditingPrize(prev => ({ ...prev, chance: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Fond Rəngi</Label>
              <div className="flex gap-2">
                <Input 
                  id="color" 
                  type="color" 
                  className="h-10 w-12 p-1"
                  value={editingPrize?.color || "#f97316"} 
                  onChange={(e) => setEditingPrize(prev => ({ ...prev, color: e.target.value }))}
                />
                <Input 
                  value={editingPrize?.color || "#f97316"} 
                  onChange={(e) => setEditingPrize(prev => ({ ...prev, color: e.target.value }))}
                  className="h-10 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktivdir</Label>
              <Switch 
                id="active" 
                checked={editingPrize?.is_active || false} 
                onCheckedChange={(v) => setEditingPrize(prev => ({ ...prev, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Ləğv et</Button>
            <Button className="bg-gradient-primary" onClick={handleSavePrize} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Yadda saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGiftsManager;
