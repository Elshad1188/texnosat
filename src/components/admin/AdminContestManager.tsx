import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Users, Gift, Flag } from "lucide-react";
import { getLocale } from "@/lib/datetime";

interface Settings {
  is_enabled: boolean;
  entry_fee: number;
  bonus_balance_amount: number;
  winner_pct: number;
  second_pct: number;
  third_pct: number;
  rollover_pct: number;
  min_invites_to_win: number;
}

const AdminContestManager = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [current, setCurrent] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data: s } = await supabase.from("contest_settings").select("*").eq("id", 1).maybeSingle();
    if (s) setSettings(s as any);

    const { data: active } = await supabase.from("contests").select("*").eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
    setCurrent(active);

    if (active) {
      const { data: lb } = await (supabase as any)
        .rpc("admin_list_contest_participants", { _contest_id: active.id });
      setLeaderboard((lb || []).slice(0, 20));
    }


    const { data: h } = await supabase
      .from("contests")
      .select("*")
      .eq("status", "finalized")
      .order("finalized_at", { ascending: false })
      .limit(10);
    setHistory(h || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("contest_settings").update(settings).eq("id", 1);
    setLoading(false);
    if (error) toast({ title: "Xəta", description: error.message, variant: "destructive" });
    else toast({ title: "Yadda saxlandı" });
  };

  const finalizeNow = async () => {
    if (!confirm("Cari yarışmanı indi yekunlaşdırmaq istəyirsiniz?")) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("finalize_current_contest");
    setLoading(false);
    if (error) toast({ title: "Xəta", description: error.message, variant: "destructive" });
    else { toast({ title: "Yekunlaşdırıldı", description: JSON.stringify(data) }); load(); }
  };

  if (!settings) return <div className="text-sm text-muted-foreground">Yüklənir...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Cari yarışma</CardTitle></CardHeader>
        <CardContent>
          {current ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Fond</div><div className="text-lg font-bold">{Number(current.total_pool).toFixed(2)} ₼</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">İştirakçı</div><div className="text-lg font-bold">{current.participants_count}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Dəvətlər</div><div className="text-lg font-bold">{current.invites_count}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Bitir</div><div className="text-xs">{new Date(current.week_end).toLocaleString(getLocale())}</div></div>
            </div>
          ) : <div className="text-sm text-muted-foreground">Aktiv yarışma yoxdur</div>}
          <Button onClick={finalizeNow} disabled={loading || !current} variant="destructive" size="sm" className="mt-4">
            <Flag className="h-4 w-4 mr-1" /> İndi yekunlaşdır
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Liderlər (Top 20)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {leaderboard.length === 0 && <div className="text-muted-foreground">Heç kim yoxdur</div>}
            {leaderboard.map((p, i) => (
              <div key={p.user_id} className="flex items-center justify-between border-b py-1.5">
                <div className="flex items-center gap-2"><span className="w-6 text-muted-foreground">#{i+1}</span><span className="font-mono text-xs">{p.user_id.slice(0,8)}</span></div>
                <div className="flex gap-3 text-xs">
                  <span>👥 {p.invites_count}</span>
                  <span>🎟 {p.entries_count}</span>
                  <span>{Number(p.amount_paid).toFixed(2)} ₼</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Tənzimləmələr</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Yarışma aktivdir</Label>
            <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">İştirak haqqı (₼)</Label><Input type="number" step="0.01" value={settings.entry_fee} onChange={(e) => setSettings({ ...settings, entry_fee: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Bonus balans (₼)</Label><Input type="number" step="0.01" value={settings.bonus_balance_amount} onChange={(e) => setSettings({ ...settings, bonus_balance_amount: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">1-ci yer %</Label><Input type="number" value={settings.winner_pct} onChange={(e) => setSettings({ ...settings, winner_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">2-ci yer %</Label><Input type="number" value={settings.second_pct} onChange={(e) => setSettings({ ...settings, second_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">3-cü yer %</Label><Input type="number" value={settings.third_pct} onChange={(e) => setSettings({ ...settings, third_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Növbəti həftəyə %</Label><Input type="number" value={settings.rollover_pct} onChange={(e) => setSettings({ ...settings, rollover_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Min. dəvət sayı</Label><Input type="number" value={settings.min_invites_to_win} onChange={(e) => setSettings({ ...settings, min_invites_to_win: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={save} disabled={loading}>Yadda saxla</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Keçmiş qaliblər</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {history.length === 0 && <div className="text-muted-foreground">Hələ heç bir yarışma yekunlaşmayıb</div>}
            {history.map((h) => (
              <div key={h.id} className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{new Date(h.week_start).toLocaleDateString(getLocale())} — {new Date(h.week_end).toLocaleDateString(getLocale())}</div>
                <div className="text-sm mt-1">Fond: <b>{Number(h.total_pool).toFixed(2)} ₼</b> · İştirakçı: {h.participants_count}</div>
                {h.winner_id && <div className="text-xs mt-1">🏆 {h.winner_id.slice(0,8)} ({Number(h.winner_amount).toFixed(2)} ₼)</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContestManager;
