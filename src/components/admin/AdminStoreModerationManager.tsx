import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, Store, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Gözləmədə", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  approved: { label: "Təsdiqlənib", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  rejected: { label: "Rədd edilib", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

const AdminStoreModerationManager = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchStores = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (data) {
      setStores(data);
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("stores").update({ status } as any).eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }

    const store = stores.find(s => s.id === id);
    if (store) {
      await supabase.from("notifications").insert({
        user_id: store.user_id,
        type: status === "approved" ? "success" : "warning",
        title: status === "approved" ? "Mağazanız təsdiqləndi" : "Mağazanız rədd edildi",
        message: status === "approved"
          ? `"${store.name}" mağazanız təsdiqləndi və yayımlandı.`
          : `"${store.name}" mağazanız rədd edildi.${rejectReason ? " Səbəb: " + rejectReason : ""}`,
        link: `/store/${id}`,
      });
    }

    toast({ title: status === "approved" ? "Mağaza təsdiqləndi" : "Mağaza rədd edildi" });
    setRejectId(null);
    setRejectReason("");
    fetchStores();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.entries(statusMap).map(([key, val]) => (
          <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)} className="gap-1.5">
            <val.icon className="h-3.5 w-3.5" />{val.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Bu statusda mağaza yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stores.map((s) => {
            const st = statusMap[s.status] || statusMap.pending;
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-14 w-14 border border-border/50">
                      <AvatarImage src={s.logo_url || ""} />
                      <AvatarFallback className="bg-secondary font-bold text-lg">{s.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="truncate text-sm font-bold text-foreground leading-tight">{s.name}</h3>
                        <Badge className={`${st.color} border-0 text-[10px] h-4 px-1.5 font-medium`}>{st.label}</Badge>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.city || "—"} · {profiles[s.user_id] || "Adsız"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">{new Date(s.created_at).toLocaleDateString("az")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/40 sm:pt-0 sm:border-0 sm:flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 sm:flex-none h-9 gap-1.5 px-3 border-primary/20 hover:bg-primary/5 text-primary text-xs font-semibold shadow-sm"
                      onClick={() => window.open(`/store/${s.id}?mode=moderation`, "_blank")}
                    >
                      <Eye className="h-3.5 w-3.5" /> Bax
                    </Button>
                    
                    {s.status === "pending" && (
                      <div className="flex gap-2 flex-1 sm:flex-none">
                        <Button 
                          size="sm" 
                          className="flex-1 sm:flex-none h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm" 
                          onClick={() => updateStatus(s.id, "approved")}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Təsdiq
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1 sm:flex-none h-9 gap-1.5 text-xs font-semibold shadow-sm" 
                          onClick={() => setRejectId(s.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Rədd
                        </Button>
                      </div>
                    )}
                    
                    {s.status === "rejected" && (
                      <Button 
                        size="sm" 
                        className="flex-1 sm:flex-none h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm" 
                        onClick={() => updateStatus(s.id, "approved")}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Təsdiq et
                      </Button>
                    )}
                    
                    {s.status === "approved" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 sm:flex-none h-9 gap-1.5 text-xs font-semibold shadow-sm" 
                        onClick={() => setRejectId(s.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rədd et
                      </Button>
                    )}
                  </div>
                </div>
                {rejectId === s.id && (
                  <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                    <Textarea placeholder="Rədd səbəbini yazın..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(s.id, "rejected")}>Rədd et</Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Ləğv et</Button>
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

export default AdminStoreModerationManager;
