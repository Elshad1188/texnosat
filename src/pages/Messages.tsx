import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Loader2, Check, CheckCheck, Store, Trash2, MoreVertical, XCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  // Fetch conversations with last message, other user profile, and store info
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

      // Get other user IDs
      const otherUserIds = convos.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherUserIds);

      // Fetch stores for all other users (to check if they are store owners)
      const { data: stores } = await supabase.from("stores").select("*").in("user_id", otherUserIds);

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
        const store = (stores || []).find((s: any) => s.user_id === otherUserId);
        const listing = (listings || []).find((l: any) => l.id === c.listing_id);
        const lastMsg = (lastMessages || []).find((m: any) => m.conversation_id === c.id);
        const unread = (unreadCounts || []).filter((u: any) => u.conversation_id === c.id).length;

        // Display name: use store name if the other user has a store, otherwise profile name
        const displayName = store ? store.name : (profile?.full_name || "Adsız");
        const displayAvatar = store?.logo_url || null;
        const isStore = !!store;

        return { ...c, profile, store, listing, lastMsg, unread, displayName, displayAvatar, isStore };
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
      supabase.rpc("mark_messages_as_read", { msg_ids: unreadIds }).then(() => {
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
      const content = messageText.trim();
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content,
      });
      if (error) throw error;

      // Send email notification to recipient (fire-and-forget)
      try {
        const convo = conversations.find((c: any) => c.id === activeConvoId);
        if (convo) {
          const recipientId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;
          // Check if recipient has email notifications enabled
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("full_name, email_notifications, user_id")
            .eq("user_id", recipientId)
            .maybeSingle();

          if (recipientProfile && (recipientProfile as any).email_notifications !== false) {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", user.id)
              .maybeSingle();

            supabase.functions.invoke("send-email", {
              body: {
                to_user_id: recipientId,
                template: "new_message",
                template_vars: {
                  sender_name: senderProfile?.full_name || "İstifadəçi",
                  recipient_name: recipientProfile?.full_name || "İstifadəçi",
                  message_preview: content.substring(0, 150),
                  site_url: window.location.origin,
                },
              },
            }).catch(() => {}); // fire-and-forget
          }
        }
      } catch {}
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
  
  // Delete message
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_deleted: true })
        .eq("id", messageId)
        .eq("sender_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
      toast({ title: "Mesaj silindi" });
    },
  });

  // Delete conversation (for me)
  const deleteConversation = useMutation({
    mutationFn: async (convoId: string) => {
      if (!user) return;
      const convo = conversations.find((c: any) => c.id === convoId);
      if (!convo) return;
      
      const isBuyer = convo.buyer_id === user.id;
      const updateData = isBuyer ? { buyer_deleted_at: new Date().toISOString() } : { seller_deleted_at: new Date().toISOString() };
      
      const { error } = await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", convoId);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate("/messages");
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast({ title: "Söhbət silindi" });
    },
  });

  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);

  // Check if current user is a store owner (for showing "sent as store")
  const { data: myStore } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

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
              {myStore && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Store className="h-3 w-3" />
                  {myStore.name} adından yazırsınız
                </p>
              )}
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
                conversations
                  .filter((c: any) => {
                    const isBuyer = c.buyer_id === user.id;
                    const deletedAt = isBuyer ? c.buyer_deleted_at : c.seller_deleted_at;
                    if (!deletedAt) return true;
                    // Only hide if deleted_at is after last_message_at
                    return new Date(deletedAt) < new Date(c.last_message_at);
                  })
                  .map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages?c=${c.id}`)}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                      activeConvoId === c.id ? "bg-accent" : ""
                    }`}
                  >
                    {/* Avatar: store logo or person initial */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {c.displayAvatar ? (
                        <img src={c.displayAvatar} alt="" className="h-full w-full object-cover" />
                      ) : c.isStore ? (
                        <Store className="h-4 w-4" />
                      ) : (
                        c.displayName[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.displayName}
                          </p>
                          {c.isStore && (
                            <Store className="h-3 w-3 shrink-0 text-primary" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {c.lastMsg ? formatTime(c.lastMsg.created_at) : ""}
                        </span>
                      </div>
                      {c.listing && (
                        <p className="text-[11px] text-primary truncate">{c.listing.title}</p>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {c.lastMsg?.sender_id === user.id && (
                            <span className="mr-1">
                              {c.lastMsg.is_read ? (
                                <CheckCheck className="inline h-3 w-3 text-sky-500" />
                              ) : (
                                <Check className="inline h-3 w-3 text-muted-foreground" />
                              )}
                            </span>
                          )}
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
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {activeConvo.displayAvatar ? (
                      <img src={activeConvo.displayAvatar} alt="" className="h-full w-full object-cover" />
                    ) : activeConvo.isStore ? (
                      <Store className="h-4 w-4" />
                    ) : (
                      activeConvo.displayName[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activeConvo.displayName}
                      </p>
                      {activeConvo.isStore && (
                        <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </div>
                    {activeConvo.listing && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activeConvo.listing.title}
                      </p>
                    )}
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Söhbəti silmək istəyirsiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu söhbət sizin siyahınızdan silinəcək.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteConversation.mutate(activeConvo.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                        <div key={m.id} className={`flex group ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 ${
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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-0.5 ml-1">
                                        {m.is_read ? (
                                          <CheckCheck className="h-3.5 w-3.5 text-sky-300 fill-sky-300/20" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5 opacity-70" />
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-[10px]">
                                        {m.is_read 
                                          ? `Oxundu: ${m.read_at ? new Date(m.read_at).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" }) : "Bilinmir"}`
                                          : "Göndərildi"
                                        }
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {isMine && !m.is_deleted && (
                              <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-sm border border-border">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      className="text-destructive gap-2 font-medium"
                                      onClick={() => deleteMessage.mutate(m.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Mesajı sil
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  {myStore && (
                    <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Store className="h-3 w-3" />
                      {myStore.name} adından cavab verirsiniz
                    </p>
                  )}
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
