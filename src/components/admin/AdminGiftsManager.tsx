
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
  AlertCircle,
  RotateCw,
  Search,
  Users,
  Edit
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SpinPrize {
  id: string;
  label: string;
  amount: number;
  chance: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

const AdminGiftsManager = () => {
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<SpinPrize[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
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
      
      setPrizes(prizesData || []);

      // Try with join first
      const { data: historyWithProfiles, error: joinError } = await supabase
        .from("spin_history")
        .select(`
          *,
          profiles(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (joinError) {
        console.warn("History join failed, falling back to simple fetch:", joinError);
        const { data: simpleHistory, error: simpleError } = await supabase
          .from("spin_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (simpleError) throw simpleError;
        setHistory(simpleHistory || []);
      } else {
        setHistory(historyWithProfiles || []);
      }
    } catch (err: any) {
      console.error("Fetch data error:", err);
      toast({ title: "Məlumat yüklənmədi", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim();
      
      // Build filters safe for or()
      const filters = [];
      filters.push(`full_name.ilike.*${q}*`);
      
      // Only add user_id filter if it looks like a UUID to prevent DB error
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(q)) {
        filters.push(`user_id.eq.${q}`);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, last_spin_at")
        .or(filters.join(','))
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data || []);
      if (data?.length === 0) {
        toast({ title: "Nəticə tapılmadı" });
      }
    } catch (err: any) {
      console.error("User search error:", err);
      toast({ title: "Axtarış xətası", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleResetCooldown = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("reset_user_spin_cooldown", {
        _user_id: userId
      });
      if (error) throw error;
      toast({ title: "İstifadəçinin şansı yeniləndi" });
      
      // Update local results if relevant
      setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, last_spin_at: null } : u));
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
  };

  const handleSavePrize = async () => {
    if (!editingPrize?.label) {
      toast({ title: "Ad sahəsi vacibdir", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const prizeData = {
        label: editingPrize.label,
        amount: Number(editingPrize.amount) || 0,
        chance: Number(editingPrize.chance) || 1,
        color: editingPrize.color || "#f97316",
        is_active: editingPrize.is_active ?? true
      };

      let result;
      if (editingPrize.id) {
        result = await supabase
          .from("spin_prizes")
          .update(prizeData)
          .eq("id", editingPrize.id);
      } else {
        result = await supabase
          .from("spin_prizes")
          .insert([prizeData]);
      }

      if (result.error) throw result.error;

      toast({ title: editingPrize.id ? "Hədiyyə yeniləndi" : "Yeni hədiyyə əlavə edildi" });
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Xəta baş verdi", description: err.message, variant: "destructive" });
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Cəmi Verilən</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalGiven.toFixed(2)} ₼</div>
          <div className="flex items-center gap-1 text-[10px] text-green-500">
            <TrendingUp className="h-3 w-3" /> Son 50 fırlatma
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Cəmi Fırlatma</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalSpins}</div>
          <div className="text-xs text-muted-foreground">Mövcut tarixçə üzrə</div>
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

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Tabs defaultValue="prizes">
            <div className="border-b border-border bg-muted/30 px-4 pt-1">
                <TabsList className="bg-transparent h-12 gap-6">
                    <TabsTrigger value="prizes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 font-semibold gap-2">
                        <Gift className="h-4 w-4" /> Hədiyyələr
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 font-semibold gap-2">
                        <Users className="h-4 w-4" /> Şans Sıfırlama
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-0 font-semibold gap-2">
                        <History className="h-4 w-4" /> Son Qazananlar
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="prizes" className="p-0 animate-in fade-in-50 duration-500">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/5">
                    <h3 className="text-sm font-bold uppercase tracking-tight">Hədiyyə Siyahısı</h3>
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
                                <TableHead>Şans</TableHead>
                                <TableHead>Rəng</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Əməliyyat</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prizes.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.label}</TableCell>
                                    <TableCell>{p.amount} ₼</TableCell>
                                    <TableCell>{p.chance}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: p.color }} />
                                            <span className="text-[10px] font-mono opacity-60 uppercase">{p.color}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            p.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                        }`}>
                                            {p.is_active ? "Aktiv" : "Deaktiv"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPrize(p); setIsDialogOpen(true); }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePrize(p.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            <TabsContent value="users" className="p-4 space-y-6 animate-in fade-in-50 duration-500">
                <div className="max-w-md space-y-4">
                    <div className="space-y-1.5">
                        <Label>İstifadəçi Axtarışı</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Ad və ya User ID yazın..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                                    className="pl-9"
                                />
                            </div>
                            <Button onClick={handleSearchUsers} disabled={searching}>
                                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Axtar"}
                            </Button>
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-2 border-t pt-4">
                            {searchResults.map(user => (
                                <div key={user.user_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">{user.full_name || "Adsız İstifadəçi"}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{user.user_id}</span>
                                        {user.last_spin_at ? (
                                            <span className="text-[10px] text-orange-600 font-bold mt-0.5">
                                                Son fırlatma: {new Date(user.last_spin_at).toLocaleString('az-AZ')}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-green-600 font-bold mt-0.5">Şansı var</span>
                                        )}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-bold gap-1"
                                        onClick={() => handleResetCooldown(user.user_id)}
                                        disabled={!user.last_spin_at}
                                    >
                                        <RotateCw className="h-3.5 w-3.5" /> Sıfırla
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="history" className="p-0 animate-in fade-in-50 duration-500">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>İstifadəçi</TableHead>
                                <TableHead>Məbləğ</TableHead>
                                <TableHead>Tarix</TableHead>
                                <TableHead className="text-right">Əməliyyat</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((h) => (
                                <TableRow key={h.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                {h.profiles?.full_name || (Array.isArray(h.profiles) ? h.profiles[0]?.full_name : null) || "Adsız"}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{h.user_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-green-600">+{h.amount.toFixed(2)} ₼</TableCell>
                                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("az-AZ")}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => handleResetCooldown(h.user_id)}>
                                            <RotateCw className="h-3 w-3 mr-1" /> Sıfırla
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {history.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Son qazanan yoxdur</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPrize?.id ? "Hədiyyəni Redaktə Et" : "Yeni Hədiyyə Əlavə Et"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="label">Adı</Label>
              <Input id="label" value={editingPrize?.label || ""} onChange={(e) => setEditingPrize(prev => ({ ...prev, label: e.target.value }))} placeholder="0.50 AZN" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Məbləğ (₼)</Label>
                <Input id="amount" type="number" step="0.01" value={editingPrize?.amount || 0} onChange={(e) => setEditingPrize(prev => ({ ...prev, amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chance">Şans (Weight)</Label>
                <Input id="chance" type="number" value={editingPrize?.chance || 1} onChange={(e) => setEditingPrize(prev => ({ ...prev, chance: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Rəng</Label>
              <div className="flex gap-2">
                <Input id="color" type="color" className="h-10 w-12 p-1" value={editingPrize?.color || "#f97316"} onChange={(e) => setEditingPrize(prev => ({ ...prev, color: e.target.value }))} />
                <Input value={editingPrize?.color || "#f97316"} onChange={(e) => setEditingPrize(prev => ({ ...prev, color: e.target.value }))} className="h-10 font-mono" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktivdir</Label>
              <Switch id="active" checked={editingPrize?.is_active || false} onCheckedChange={(v) => setEditingPrize(prev => ({ ...prev, is_active: v }))} />
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
