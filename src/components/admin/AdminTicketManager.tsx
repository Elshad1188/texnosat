import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, CheckCircle, Loader2, AlertTriangle, Send, ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-600",
  in_progress: "bg-amber-500/20 text-amber-600",
  resolved: "bg-green-500/20 text-green-600",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "Açıq",
  in_progress: "Baxılır",
  resolved: "Həll edildi",
  closed: "Bağlı",
};

const AdminTicketManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (data) {
      setTickets(data);
      const userIds = [...new Set(data.map((t: any) => t.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const map: Record<string, string> = {};
        profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "Adsız"; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      content: reply.trim(),
      is_admin: true,
    });

    if (!error) {
      // Update status to in_progress if open
      if (selectedTicket.status === "open") {
        await supabase.from("tickets").update({ status: "in_progress" } as any).eq("id", selectedTicket.id);
        setSelectedTicket({ ...selectedTicket, status: "in_progress" });
      }

      // Notify user
      await supabase.from("notifications").insert({
        user_id: selectedTicket.user_id,
        type: "info",
        title: "Dəstək cavabı",
        message: `"${selectedTicket.subject}" sorğunuza cavab yazıldı.`,
        link: "/support",
      });

      setReply("");
      openTicket(selectedTicket);
    }
    setSending(false);
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    await supabase.from("tickets").update({
      status,
      ...(status === "resolved" ? { resolved_at: new Date().toISOString(), resolved_by: user?.id } : {}),
    } as any).eq("id", selectedTicket.id);

    await supabase.from("notifications").insert({
      user_id: selectedTicket.user_id,
      type: status === "resolved" ? "success" : "info",
      title: status === "resolved" ? "Sorğunuz həll edildi" : "Sorğu statusu dəyişdi",
      message: `"${selectedTicket.subject}" sorğunuzun statusu: ${statusLabels[status]}`,
      link: "/support",
    });

    toast({ title: "Status yeniləndi" });
    setSelectedTicket({ ...selectedTicket, status });
    fetchTickets();
  };

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedTicket(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Geri
        </Button>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{selectedTicket.subject}</h3>
            <Badge className={`${statusColors[selectedTicket.status]} border-0 text-[10px]`}>
              {statusLabels[selectedTicket.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {profiles[selectedTicket.user_id] || "Adsız"} · {new Date(selectedTicket.created_at).toLocaleDateString("az")}
          </p>

          <div className="flex gap-2">
            <Select value={selectedTicket.status} onValueChange={updateStatus}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`rounded-lg p-3 text-xs ${msg.is_admin ? "bg-primary/10 ml-8" : "bg-muted/50 mr-8"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">
                  {msg.is_admin ? "Admin" : profiles[selectedTicket.user_id] || "İstifadəçi"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.created_at).toLocaleString("az")}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>

        {selectedTicket.status !== "closed" && (
          <div className="flex gap-2">
            <Textarea placeholder="Cavab yazın..." value={reply} onChange={(e) => setReply(e.target.value)} rows={2} className="flex-1" />
            <Button size="sm" className="self-end gap-1" onClick={sendReply} disabled={sending || !reply.trim()}>
              <Send className="h-3.5 w-3.5" /> Göndər
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusLabels).map(([key, label]) => (
          <Button key={key} variant={filter === key ? "default" : "outline"} size="sm" onClick={() => setFilter(key)} className="text-xs">
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Bu statusda sorğu yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openTicket(t)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{t.subject}</span>
                </div>
                <Badge className={`${statusColors[t.status]} border-0 text-[10px]`}>{statusLabels[t.status]}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {profiles[t.user_id] || "Adsız"} · {new Date(t.created_at).toLocaleDateString("az")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketManager;
