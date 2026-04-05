import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdminOrMod } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CheckSquare, Store, Flag, MessageSquare, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Eye, Trash2, BarChart3
} from "lucide-react";

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Gözləmədə", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  approved: { label: "Təsdiqlənib", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  rejected: { label: "Rədd edilib", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

const ModeratorPanel = () => {
  const { user } = useAuth();
  const { isPrivileged, loading: privLoading } = useIsAdminOrMod();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listings, setListings] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState("pending");
  const [storeFilter, setStoreFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<"listing" | "store">("listing");

  // Stats
  const [stats, setStats] = useState({ pendingListings: 0, pendingStores: 0, pendingReports: 0, totalComments: 0 });

  useEffect(() => {
    if (!privLoading && !isPrivileged) navigate("/");
  }, [isPrivileged, privLoading, navigate]);

  useEffect(() => {
    if (isPrivileged) fetchAll();
  }, [isPrivileged]);

  const fetchAll = async () => {
    setLoading(true);
    const [lRes, sRes, rRes, cRes] = await Promise.all([
      supabase.from("listings").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("stores").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("reel_comments").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const allUserIds = new Set<string>();
    lRes.data?.forEach((l: any) => allUserIds.add(l.user_id));
    sRes.data?.forEach((s: any) => allUserIds.add(s.user_id));
    rRes.data?.forEach((r: any) => allUserIds.add(r.reporter_id));
    cRes.data?.forEach((c: any) => allUserIds.add(c.user_id));

    if (allUserIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", [...allUserIds]);
      const map: Record<string, string> = {};
      profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
      setProfiles(map);
    }

    setStats({
      pendingListings: lRes.data?.length || 0,
      pendingStores: sRes.data?.length || 0,
      pendingReports: rRes.data?.length || 0,
      totalComments: cRes.data?.length || 0,
    });
    setLoading(false);
  };

  // Listing moderation
  const fetchListings = async () => {
    const { data } = await supabase.from("listings").select("*").eq("status", listingFilter).order("created_at", { ascending: false });
    if (data) {
      setListings(data);
      const ids = [...new Set(data.map((l: any) => l.user_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = { ...profiles };
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
  };

  const fetchStores = async () => {
    const { data } = await supabase.from("stores").select("*").eq("status", storeFilter).order("created_at", { ascending: false });
    if (data) {
      setStores(data);
      const ids = [...new Set(data.map((s: any) => s.user_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = { ...profiles };
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("reports").select("*").eq("status", "pending").order("created_at", { ascending: false });
    if (data) setReports(data);
  };

  const fetchComments = async () => {
    const { data } = await supabase.from("reel_comments").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) {
      setComments(data);
      const ids = [...new Set(data.map((c: any) => c.user_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = { ...profiles };
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
  };

  useEffect(() => { if (isPrivileged) fetchListings(); }, [listingFilter, isPrivileged]);
  useEffect(() => { if (isPrivileged) fetchStores(); }, [storeFilter, isPrivileged]);

  const updateListingStatus = async (id: string, status: string, reason?: string) => {
    const updates: any = { status };
    if (reason) updates.rejection_reason = reason;
    if (status === "approved") updates.is_active = true;
    if (status === "rejected") updates.is_active = false;
    const { error } = await supabase.from("listings").update(updates).eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }

    const listing = listings.find(l => l.id === id);
    if (listing) {
      await supabase.from("notifications").insert({
        user_id: listing.user_id,
        type: status === "approved" ? "success" : "warning",
        title: status === "approved" ? "Elanınız təsdiqləndi" : "Elanınız rədd edildi",
        message: status === "approved"
          ? `"${listing.title}" elanınız təsdiqləndi.`
          : `"${listing.title}" rədd edildi. Səbəb: ${reason || "Qaydalar pozulub"}`,
        link: `/product/${id}`,
      });
    }
    toast({ title: status === "approved" ? "Təsdiqləndi" : "Rədd edildi" });
    setRejectId(null); setRejectReason("");
    fetchListings();
  };

  const updateStoreStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("stores").update({ status } as any).eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }
    const store = stores.find(s => s.id === id);
    if (store) {
      await supabase.from("notifications").insert({
        user_id: store.user_id,
        type: status === "approved" ? "success" : "warning",
        title: status === "approved" ? "Mağazanız təsdiqləndi" : "Mağazanız rədd edildi",
        message: status === "approved"
          ? `"${store.name}" təsdiqləndi.`
          : `"${store.name}" rədd edildi.${rejectReason ? " Səbəb: " + rejectReason : ""}`,
        link: `/store/${id}`,
      });
    }
    toast({ title: status === "approved" ? "Təsdiqləndi" : "Rədd edildi" });
    setRejectId(null); setRejectReason("");
    fetchStores();
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("reel_comments").delete().eq("id", id);
    if (error) { toast({ title: "Xəta", variant: "destructive" }); return; }
    setComments(prev => prev.filter(c => c.id !== id));
    toast({ title: "Şərh silindi" });
  };

  if (privLoading || !isPrivileged) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Moderator Paneli</h1>
            <p className="text-xs text-muted-foreground">Elanlar, mağazalar və şərhlər üzrə moderasiya</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Gözləyən elanlar", value: stats.pendingListings, icon: CheckSquare, color: "from-amber-500/20 to-amber-600/10 text-amber-600" },
            { label: "Gözləyən mağazalar", value: stats.pendingStores, icon: Store, color: "from-blue-500/20 to-blue-600/10 text-blue-600" },
            { label: "Açıq şikayətlər", value: stats.pendingReports, icon: Flag, color: "from-red-500/20 to-red-600/10 text-red-600" },
            { label: "Son şərhlər", value: stats.totalComments, icon: MessageSquare, color: "from-green-500/20 to-green-600/10 text-green-600" },
          ].map((s, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-md">
              <CardContent className="p-3">
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="listings" onValueChange={(v) => {
          if (v === "reports") fetchReports();
          if (v === "comments") fetchComments();
        }}>
          <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-muted/60 p-1 mb-4">
            <TabsTrigger value="listings" className="gap-1.5 rounded-lg text-xs">
              <CheckSquare className="h-3.5 w-3.5" /> Elanlar
              {stats.pendingListings > 0 && <Badge className="ml-1 h-4 px-1 text-[9px] bg-amber-500 text-white border-0">{stats.pendingListings}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5 rounded-lg text-xs">
              <Store className="h-3.5 w-3.5" /> Mağazalar
              {stats.pendingStores > 0 && <Badge className="ml-1 h-4 px-1 text-[9px] bg-blue-500 text-white border-0">{stats.pendingStores}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 rounded-lg text-xs">
              <Flag className="h-3.5 w-3.5" /> Şikayətlər
              {stats.pendingReports > 0 && <Badge className="ml-1 h-4 px-1 text-[9px] bg-red-500 text-white border-0">{stats.pendingReports}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 rounded-lg text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Şərhlər
            </TabsTrigger>
          </TabsList>

          {/* LISTINGS TAB */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex gap-2">
              {Object.entries(statusMap).map(([key, val]) => (
                <Button key={key} variant={listingFilter === key ? "default" : "outline"} size="sm" onClick={() => setListingFilter(key)} className="gap-1.5 text-xs">
                  <val.icon className="h-3.5 w-3.5" />{val.label}
                </Button>
              ))}
            </div>
            {listings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Bu statusda elan yoxdur</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.map((l) => {
                  const st = statusMap[l.status] || statusMap.pending;
                  return (
                    <div key={l.id} className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border/50">
                            {l.image_urls?.[0] ? (
                              <img src={l.image_urls[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">📦</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="truncate text-sm font-semibold text-foreground">{l.title}</h3>
                              <Badge className={`${st.color} border-0 text-[10px] h-4 px-1.5`}>{st.label}</Badge>
                            </div>
                            <p className="text-xs font-medium text-primary">{l.price} ₼</p>
                            <p className="text-[11px] text-muted-foreground truncate">{l.location} · {profiles[l.user_id] || "Adsız"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => window.open(`/product/${l.id}`, "_blank")}>
                            <Eye className="h-3.5 w-3.5" /> Bax
                          </Button>
                          {l.status === "pending" && (
                            <>
                              <Button size="sm" className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => updateListingStatus(l.id, "approved")}>
                                <CheckCircle className="h-3.5 w-3.5" /> Təsdiq
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 gap-1 text-xs" onClick={() => { setRejectId(l.id); setRejectType("listing"); }}>
                                <XCircle className="h-3.5 w-3.5" /> Rədd
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {rejectId === l.id && rejectType === "listing" && (
                        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                          <Textarea placeholder="Rədd səbəbi..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => updateListingStatus(l.id, "rejected", rejectReason)}>Rədd et</Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Ləğv</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* STORES TAB */}
          <TabsContent value="stores" className="space-y-4">
            <div className="flex gap-2">
              {Object.entries(statusMap).map(([key, val]) => (
                <Button key={key} variant={storeFilter === key ? "default" : "outline"} size="sm" onClick={() => setStoreFilter(key)} className="gap-1.5 text-xs">
                  <val.icon className="h-3.5 w-3.5" />{val.label}
                </Button>
              ))}
            </div>
            {stores.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Bu statusda mağaza yoxdur</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stores.map((s) => {
                  const st = statusMap[s.status] || statusMap.pending;
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted border border-border/50">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">{s.name?.[0]}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                              <Badge className={`${st.color} border-0 text-[10px] h-4 px-1.5`}>{st.label}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{s.city || "—"} · {profiles[s.user_id] || "Adsız"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => window.open(`/store/${s.id}`, "_blank")}>
                            <Eye className="h-3.5 w-3.5" /> Bax
                          </Button>
                          {s.status === "pending" && (
                            <>
                              <Button size="sm" className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => updateStoreStatus(s.id, "approved")}>
                                <CheckCircle className="h-3.5 w-3.5" /> Təsdiq
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 gap-1 text-xs" onClick={() => { setRejectId(s.id); setRejectType("store"); }}>
                                <XCircle className="h-3.5 w-3.5" /> Rədd
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {rejectId === s.id && rejectType === "store" && (
                        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                          <Textarea placeholder="Rədd səbəbi..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => updateStoreStatus(s.id, "rejected")}>Rədd et</Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Ləğv</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-3">
            {reports.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Flag className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Gözləyən şikayət yoxdur</p>
              </div>
            ) : (
              reports.map((r) => (
                <Card key={r.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">{r.target_type}</Badge>
                          <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("az")}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{r.reason}</p>
                        {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">Şikayətçi: {profiles[r.reporter_id] || "Adsız"}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                        const url = r.target_type === "listing" ? `/product/${r.target_id}` : r.target_type === "store" ? `/store/${r.target_id}` : `/seller/${r.target_id}`;
                        window.open(url, "_blank");
                      }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* COMMENTS TAB */}
          <TabsContent value="comments" className="space-y-2">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Şərh yoxdur</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3 shadow-sm flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{profiles[c.user_id] || "Adsız"}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("az")}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{c.content}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteComment(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ModeratorPanel;
