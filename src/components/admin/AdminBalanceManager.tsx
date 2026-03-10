import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Wallet, Plus, Minus } from "lucide-react";

interface Profile {
  user_id: string;
  full_name: string | null;
  balance: number;
  city: string | null;
}

const AdminBalanceManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, balance, city")
      .ilike("full_name", `%${search}%`)
      .limit(20);
    setProfiles(data || []);
    setLoading(false);
  };

  const addBalance = async (isCredit: boolean) => {
    if (!selectedUser || !amount || Number(amount) <= 0) {
      toast({ title: "Məbləğ daxil edin", variant: "destructive" });
      return;
    }

    setProcessing(true);
    const amt = Number(amount);
    const desc = description || (isCredit ? "Admin tərəfindən əlavə edildi" : "Admin tərəfindən çıxarıldı");

    if (isCredit) {
      // Add balance
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ balance: selectedUser.balance + amt })
        .eq("user_id", selectedUser.user_id);

      if (updateErr) {
        toast({ title: "Xəta", description: updateErr.message, variant: "destructive" });
        setProcessing(false);
        return;
      }

      await supabase.from("balance_transactions").insert({
        user_id: selectedUser.user_id,
        amount: amt,
        type: "credit",
        description: desc,
      });

      setSelectedUser({ ...selectedUser, balance: selectedUser.balance + amt });
      setProfiles(prev => prev.map(p => p.user_id === selectedUser.user_id ? { ...p, balance: p.balance + amt } : p));
    } else {
      // Remove balance
      if (selectedUser.balance < amt) {
        toast({ title: "İstifadəçinin balansı kifayət deyil", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ balance: selectedUser.balance - amt })
        .eq("user_id", selectedUser.user_id);

      if (updateErr) {
        toast({ title: "Xəta", description: updateErr.message, variant: "destructive" });
        setProcessing(false);
        return;
      }

      await supabase.from("balance_transactions").insert({
        user_id: selectedUser.user_id,
        amount: -amt,
        type: "debit",
        description: desc,
      });

      setSelectedUser({ ...selectedUser, balance: selectedUser.balance - amt });
      setProfiles(prev => prev.map(p => p.user_id === selectedUser.user_id ? { ...p, balance: p.balance - amt } : p));
    }

    toast({ title: isCredit ? "Balans əlavə edildi" : "Balans çıxarıldı" });
    setAmount("");
    setDescription("");
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Wallet className="h-4 w-4" /> Balans idarəetməsi
      </h3>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İstifadəçi adı axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={searchUsers} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Axtar"}
        </Button>
      </div>

      {/* User list */}
      {profiles.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {profiles.map((p) => (
            <div
              key={p.user_id}
              onClick={() => setSelectedUser(p)}
              className={`flex items-center justify-between rounded-lg border p-2.5 cursor-pointer transition-colors ${
                selectedUser?.user_id === p.user_id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{p.full_name || "Adsız"}</p>
                <p className="text-[11px] text-muted-foreground">{p.city || "—"}</p>
              </div>
              <p className="text-sm font-bold text-primary">{Number(p.balance).toFixed(2)} ₼</p>
            </div>
          ))}
        </div>
      )}

      {/* Balance form */}
      {selectedUser && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{selectedUser.full_name || "Adsız"}</p>
              <p className="text-sm font-bold text-primary">{Number(selectedUser.balance).toFixed(2)} ₼</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Məbləğ (₼)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Açıqlama (ixtiyari)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9"
                  placeholder="Səbəb..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={processing || !amount}
                onClick={() => addBalance(true)}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Əlavə et</>}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 gap-1"
                disabled={processing || !amount}
                onClick={() => addBalance(false)}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Minus className="h-3.5 w-3.5" /> Çıxar</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBalanceManager;
