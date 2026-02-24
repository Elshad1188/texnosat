import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Loader2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "İndi";
  if (hours < 24) return `${hours}s əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}g əvvəl`;
  return new Date(dateStr).toLocaleDateString("az");
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeConvoId = searchParams.get("c");
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations with last message and other user profile
  const { data: conversations = [], isLoading: convosLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (!convos || convos.length === 0) return [];

      // Get other user profiles
      const otherUserIds = convos.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherUserIds);

      // Get listing titles
      const listingIds = convos.filter(c => c.listing_id).map(c => c.listing_id!);
      const { data: listings } = listingIds.length > 0
        ? await supabase.from("listings").select("id, title, image_urls").in("id", listingIds)
        : { data: [] };

      // Get last message for each conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", convos.map(c => c.id))
        .order("created_at", { ascending: false });

      // Get unread counts
      const { data: unreadCounts } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convos.map(c => c.id))
        .eq("is_read", false)
        .neq("sender_id", user.id);

      return convos.map(c => {
        const otherUserId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        const profile = (profiles || []).find((p: any) => p.user_id === otherUserId);
        const listing = (listings || []).find((l: any) => l.id === c.listing_id);
        const lastMsg = (lastMessages || []).find((m: any) => m.conversation_id === c.id);
        const unread = (unreadCounts || []).filter((u: any) => u.conversation_id === c.id).length;
        return { ...c, profile, listing, lastMsg, unread };
      });
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeConvoId],
    queryFn: async () => {
      if (!activeConvoId) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeConvoId,
    refetchInterval: 3000,
  });

  // Mark messages as read
  useEffect(() => {
    if (!activeConvoId || !user || messages.length === 0) return;
    const unreadIds = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id).map((m: any) => m.id);
    if (unreadIds.length > 0) {
      supabase.from("messages").update({ is_read: true }).in("id", unreadIds).then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      });
    }
  }, [messages, activeConvoId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConvoId) return;
    const channel = supabase
      .channel(`messages-${activeConvoId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConvoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvoId, user?.id]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !activeConvoId || !messageText.trim()) return;
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: messageText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Mesajları görmək üçün daxil olun</p>
          <Button onClick={() => navigate("/auth")}>Daxil ol</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-4">
        <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Sidebar - conversation list */}
          <div className={`w-full border-r border-border md:w-80 flex-shrink-0 flex flex-col ${activeConvoId ? "hidden md:flex" : "flex"}`}>
            <div className="border-b border-border p-4">
              <h2 className="font-display text-lg font-bold text-foreground">Mesajlar</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Hələ mesajınız yoxdur</p>
                </div>
              ) : (
                conversations.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages?c=${c.id}`)}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                      activeConvoId === c.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {c.profile?.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.profile?.full_name || "Adsız"}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {c.lastMsg ? formatTime(c.lastMsg.created_at) : ""}
                        </span>
                      </div>
                      {c.listing && (
                        <p className="text-[11px] text-primary truncate">{c.listing.title}</p>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {c.lastMsg?.content || "Mesaj yoxdur"}
                        </p>
                        {c.unread > 0 && (
                          <span className="flex-shrink-0 ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!activeConvoId ? "hidden md:flex" : "flex"}`}>
            {activeConvoId && activeConvo ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <button onClick={() => navigate("/messages")} className="md:hidden">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {activeConvo.profile?.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activeConvo.profile?.full_name || "Adsız"}
                    </p>
                    {activeConvo.listing && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activeConvo.listing.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">Söhbətə başlayın</p>
                    </div>
                  ) : (
                    messages.map((m: any) => {
                      const isMine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              <span className="text-[10px]">
                                {new Date(m.created_at).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMine && (
                                m.is_read
                                  ? <CheckCheck className="h-3 w-3" />
                                  : <Check className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Mesaj yazın..."
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!messageText.trim() || sendMessage.isPending}
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Söhbət seçin</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
