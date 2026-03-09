import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Flag, CheckCircle, Clock, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-600",
  resolved: "bg-green-500/20 text-green-600",
  dismissed: "bg-muted text-muted-foreground",
};

const AdminReportsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchReports = async () => {
    setLoading(true);
    const query = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query.eq("status", filter);
    const { data } = await query;
    if (data) {
      setReports(data as any);
      const ids = [...new Set(data.map((r: any) => r.reporter_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const resolveReport = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({
      status,
      admin_note: adminNote || null,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }
    toast({ title: status === "resolved" ? "Şikayət həll edildi" : "Şikayət rədd edildi" });
    setNoteId(null);
    setAdminNote("");
    fetchReports();
  };

  const targetTypeLabels: Record<string, string> = {
    listing: "Elan",
    user: "İstifadəçi",
    store: "Mağaza",
    review: "Rəy",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: "pending", label: "Gözləmədə", icon: Clock },
          { key: "resolved", label: "Həll edilib", icon: CheckCircle },
          { key: "dismissed", label: "Rədd edilib", icon: XCircle },
          { key: "all", label: "Hamısı", icon: Flag },
        ].map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)} className="gap-1.5">
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Şikayət tapılmadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-start gap-3">
                <Flag className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${statusColors[r.status] || statusColors.pending} border-0 text-[10px]`}>
                      {r.status === "pending" ? "Gözləmədə" : r.status === "resolved" ? "Həll edilib" : "Rədd edilib"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{targetTypeLabels[r.target_type] || r.target_type}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{r.reason}</p>
                  {r.description && <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Şikayətçi: {profiles[r.reporter_id] || "Adsız"} · {new Date(r.created_at).toLocaleDateString("az")}
                  </p>
                  {r.admin_note && (
                    <p className="mt-1 text-xs text-primary">Admin qeydi: {r.admin_note}</p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => { setNoteId(r.id); }}>
                      Həll et
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveReport(r.id, "dismissed")}>
                      Rədd
                    </Button>
                  </div>
                )}
              </div>
              {noteId === r.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                  <Textarea placeholder="Admin qeydi (istəyə bağlı)..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolveReport(r.id, "resolved")}>Həll et</Button>
                    <Button size="sm" variant="outline" onClick={() => { setNoteId(null); setAdminNote(""); }}>Ləğv</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReportsManager;
