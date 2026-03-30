import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Send, ArrowLeft, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-600",
  in_progress: "bg-amber-500/20 text-amber-600",
  resolved: "bg-green-500/20 text-green-600",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "Açıq", in_progress: "Baxılır", resolved: "Həll edildi", closed: "Bağlı",
};

const Support = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reply, setReply] = useState("");

  if (!user) { navigate("/auth"); return null; }

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", selectedTicket!.id).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("tickets").insert({ user_id: user.id, subject }).select().single();
      if (error) throw error;
      await supabase.from("ticket_messages").insert({ ticket_id: data.id, sender_id: user.id, content: message, is_admin: false });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setCreating(false);
      setSubject("");
      setMessage("");
      toast({ title: "Sorğunuz göndərildi!" });
    },
  });

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      content: reply.trim(),
      is_admin: false,
    });
    setReply("");
    refetchMessages();
  };

  if (creating) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setCreating(false)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </Button>
          <h2 className="text-lg font-bold text-foreground">Yeni dəstək sorğusu</h2>
          <Input placeholder="Mövzu *" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Mesajınız *" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
          <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={!subject || !message || createTicket.isPending}
            onClick={() => createTicket.mutate()}>
            {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Göndər
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </Button>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{selectedTicket.subject}</h2>
            <Badge className={`${statusColors[selectedTicket.status]} border-0 text-xs`}>
              {statusLabels[selectedTicket.status]}
            </Badge>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {messages.map((msg: any) => (
              <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.is_admin ? "bg-primary/10 ml-6" : "bg-muted/50 mr-6"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{msg.is_admin ? "Dəstək" : "Siz"}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleString("az")}</span>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>

          {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
            <div className="flex gap-2">
              <Textarea placeholder="Mesaj yazın..." value={reply} onChange={(e) => setReply(e.target.value)} rows={2} className="flex-1" />
              <Button size="sm" className="self-end gap-1" onClick={sendReply} disabled={!reply.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Dəstək
          </h1>
          <Button size="sm" className="gap-1 bg-gradient-primary text-primary-foreground" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> Yeni sorğu
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Hələ dəstək sorğunuz yoxdur</p>
              <Button size="sm" className="mt-4 bg-gradient-primary text-primary-foreground" onClick={() => setCreating(true)}>
                Yeni sorğu yarat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => (
              <Card key={t.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedTicket(t)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{t.subject}</span>
                    <Badge className={`${statusColors[t.status]} border-0 text-[10px]`}>{statusLabels[t.status]}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("az")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Support;
