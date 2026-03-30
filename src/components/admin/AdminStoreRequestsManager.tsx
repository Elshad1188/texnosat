import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, Eye, Trash2, Edit2 } from "lucide-react";

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Gözləmədə", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  approved: { label: "Təsdiqlənib", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  rejected: { label: "Rədd edilib", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

const AdminStoreRequestsManager = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [stores, setStores] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("store_change_requests")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(data);
      const storeIds = [...new Set(data.map((r: any) => r.store_id))];
      const userIds = [...new Set(data.map((r: any) => r.user_id))];

      if (storeIds.length > 0) {
        const { data: storeData } = await supabase.from("stores").select("*").in("id", storeIds);
        const map: Record<string, any> = {};
        storeData?.forEach((s: any) => { map[s.id] = s; });
        setStores(map);
      }
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const processRequest = async (id: string, status: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    if (status === "approved") {
      if (req.request_type === "delete") {
        await supabase.from("stores").delete().eq("id", req.store_id);
      } else if (req.request_type === "edit" && req.changes) {
        await supabase.from("stores").update(req.changes).eq("id", req.store_id);
      }
    }

    const { error } = await supabase
      .from("store_change_requests")
      .update({
        status,
        admin_note: rejectNote || null,
        processed_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }

    // Notify user
    await supabase.from("notifications").insert({
      user_id: req.user_id,
      type: status === "approved" ? "success" : "warning",
      title: status === "approved"
        ? (req.request_type === "delete" ? "Mağaza silindi" : "Mağaza dəyişikliyi təsdiqləndi")
        : (req.request_type === "delete" ? "Silmə sorğusu rədd edildi" : "Redaktə sorğusu rədd edildi"),
      message: status === "approved"
        ? `"${stores[req.store_id]?.name || ""}" mağazanız üçün ${req.request_type === "delete" ? "silmə" : "redaktə"} sorğusu təsdiqləndi.`
        : `Sorğunuz rədd edildi.${rejectNote ? " Səbəb: " + rejectNote : ""}`,
    });

    toast({ title: status === "approved" ? "Sorğu təsdiqləndi" : "Sorğu rədd edildi" });
    setRejectId(null);
    setRejectNote("");
    fetchRequests();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground">Mağaza Dəyişiklik Sorğuları</h3>
      <div className="flex gap-2">
        {Object.entries(statusMap).map(([key, val]) => (
          <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)} className="gap-1.5">
            <val.icon className="h-3.5 w-3.5" />{val.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Bu statusda sorğu yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const store = stores[req.store_id];
            const st = statusMap[req.status] || statusMap.pending;
            return (
              <div key={req.id} className="rounded-xl border border-border bg-card p-3 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {req.request_type === "delete" ? (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    ) : (
                      <Edit2 className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-bold text-foreground">
                      {req.request_type === "delete" ? "Silmə sorğusu" : "Redaktə sorğusu"}
                    </span>
                    <Badge className={`${st.color} border-0 text-[10px] h-4 px-1.5`}>{st.label}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("az")}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Mağaza: <strong className="text-foreground">{store?.name || "—"}</strong></p>
                  <p>İstifadəçi: {profiles[req.user_id] || "Adsız"}</p>
                </div>

                {req.request_type === "edit" && req.changes && (
                  <div className="rounded-lg bg-muted/50 p-2 text-xs space-y-1">
                    <p className="font-semibold text-foreground mb-1">Dəyişikliklər:</p>
                    {Object.entries(req.changes).map(([key, val]) => (
                      <p key={key}><span className="text-muted-foreground">{key}:</span> <span className="text-foreground">{String(val)}</span></p>
                    ))}
                  </div>
                )}

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                      onClick={() => processRequest(req.id, "approved")}>
                      <CheckCircle className="h-3.5 w-3.5" /> Təsdiq
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5 text-xs font-semibold"
                      onClick={() => setRejectId(req.id)}>
                      <XCircle className="h-3.5 w-3.5" /> Rədd
                    </Button>
                  </div>
                )}

                {rejectId === req.id && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                    <Textarea placeholder="Rədd səbəbini yazın..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={2} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => processRequest(req.id, "rejected")}>Rədd et</Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectNote(""); }}>Ləğv et</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminStoreRequestsManager;
