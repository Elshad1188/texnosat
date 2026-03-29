import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye, Loader2, AlertTriangle } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  location: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  user_id: string;
  image_urls: string[] | null;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Gözləmədə", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  approved: { label: "Təsdiqlənib", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  rejected: { label: "Rədd edilib", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

const AdminModerationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    
    if (data) {
      setListings(data as any);
      const userIds = [...new Set(data.map((l: any) => l.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, [filter]);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    const updates: any = { status };
    if (reason) updates.rejection_reason = reason;
    if (status === "approved") updates.is_active = true;
    if (status === "rejected") updates.is_active = false;

    const { error } = await supabase.from("listings").update(updates).eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }

    // Send notification to listing owner
    const listing = listings.find(l => l.id === id);
    if (listing) {
      await supabase.from("notifications").insert({
        user_id: listing.user_id,
        type: status === "approved" ? "success" : "warning",
        title: status === "approved" ? "Elanınız təsdiqləndi" : "Elanınız rədd edildi",
        message: status === "approved" 
          ? `"${listing.title}" elanınız təsdiqləndi və yayımlandı.`
          : `"${listing.title}" elanınız rədd edildi. Səbəb: ${reason || "Qaydalar pozulub"}`,
        link: `/product/${id}`,
      });
    }

    toast({ title: status === "approved" ? "Elan təsdiqləndi" : "Elan rədd edildi" });
    setRejectId(null);
    setRejectReason("");
    fetchListings();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.entries(statusMap).map(([key, val]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
            className="gap-1.5"
          >
            <val.icon className="h-3.5 w-3.5" />
            {val.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Bu statusda elan yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const st = statusMap[l.status] || statusMap.pending;
            return (
              <div key={l.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {l.image_urls?.[0] ? (
                      <img src={l.image_urls[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{l.title}</h3>
                      <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.price} ₼ · {l.location} · {l.category} · {profiles[l.user_id] || "Adsız"}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("az")}</p>
                    {l.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Səbəb: {l.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex gap-1 items-center">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 px-2 border-primary/20 hover:bg-primary/5 text-primary"
                      onClick={() => window.open(`/product/${l.id}`, "_blank")}
                    >
                      <Eye className="h-3.5 w-3.5" /> Bax
                    </Button>
                    {l.status === "pending" && (
                      <>
                        <Button size="sm" className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(l.id, "approved")}>
                          <CheckCircle className="h-3.5 w-3.5" /> Təsdiq
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 gap-1" onClick={() => setRejectId(l.id)}>
                          <XCircle className="h-3.5 w-3.5" /> Rədd
                        </Button>
                      </>
                    )}
                    {l.status === "rejected" && (
                      <Button size="sm" className="h-8 gap-1" onClick={() => updateStatus(l.id, "approved")}>
                        <CheckCircle className="h-3.5 w-3.5" /> Təsdiq et
                      </Button>
                    )}
                    {l.status === "approved" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setRejectId(l.id)}>
                        <XCircle className="h-3.5 w-3.5" /> Rədd et
                      </Button>
                    )}
                  </div>
                </div>
                {rejectId === l.id && (
                  <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                    <Textarea
                      placeholder="Rədd səbəbini yazın..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(l.id, "rejected", rejectReason)}>
                        Rədd et
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                        Ləğv et
                      </Button>
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

export default AdminModerationManager;
