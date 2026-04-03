import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Loader2, Check, CheckCheck, Store, Trash2, MoreVertical, Paperclip, Mic } from "lucide-react";
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

type ConversationRecord = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  last_message_at: string | null;
  created_at: string | null;
};

type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean | null;
  is_delivered: boolean | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string | null;
};

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
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const ext = file.name.split('.').pop();
      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "Fotoşəkil",
        image_url: publicUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err: any) {
      toast({ title: "Şəkil göndərilmədi", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = uploadAudio;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Mikrofona icazə lazımdır", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const uploadAudio = async () => {
    if (!user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = `${Math.random()}.webm`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, audioBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "Səsli mesaj",
        audio_url: publicUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err: any) {
      toast({ title: "Səs göndərilmədi", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMessageFromCache = (messageId: string) => {
    queryClient.setQueryData(["messages", activeConvoId], (current: MessageRecord[] | undefined) =>
      (current ?? []).filter((message) => message.id !== messageId)
    );
  };

  const removeConversationFromCache = (conversationId: string) => {
    queryClient.setQueryData(["conversations", user?.id], (current: any[] | undefined) =>
      (current ?? []).filter((conversation) => conversation.id !== conversationId)
    );
    queryClient.removeQueries({ queryKey: ["messages", conversationId] });
  };

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
      const conversationRows = (convos ?? []) as ConversationRecord[];
      if (conversationRows.length === 0) return [];

      // Get other user IDs
      const otherUserIds = conversationRows.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherUserIds);

      // Fetch stores for all other users (to check if they are store owners)
      const { data: stores } = await supabase.from("stores").select("*").in("user_id", otherUserIds);

      // Get listing titles
      const listingIds = conversationRows.filter(c => c.listing_id).map(c => c.listing_id!);
      const { data: listings } = listingIds.length > 0
        ? await supabase.from("listings").select("id, title, image_urls, store_id").in("id", listingIds)
        : { data: [] };

      // Get last message for each conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationRows.map(c => c.id))
        .order("created_at", { ascending: false });

      // Get unread counts
      const { data: unreadCounts } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationRows.map(c => c.id))
        .eq("is_read", false)
        .neq("sender_id", user.id);

      return conversationRows.map(c => {
        const otherUserId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        const profile = (profiles || []).find((p: any) => p.user_id === otherUserId);
        const listing = (listings || []).find((l: any) => l.id === c.listing_id);
        const lastMsg = (lastMessages || []).find((m: any) => m.conversation_id === c.id);
        const unread = (unreadCounts || []).filter((u: any) => u.conversation_id === c.id).length;

        // Only show store identity if the OTHER user owns the store
        let store = undefined;
        if (listing && listing.store_id) {
          const storeMatch = (stores || []).find((s: any) => s.id === listing.store_id);
          if (storeMatch && storeMatch.user_id === otherUserId) {
            store = storeMatch;
          }
        } else if (!listing) {
          store = (stores || []).find((s: any) => s.user_id === otherUserId);
        }

        // Display name: use store name only if the OTHER user has a store
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
      const { data } = await ((supabase.from("messages") as any)
        .select("*")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true }));
      return (data || []) as MessageRecord[];
    },
    enabled: !!activeConvoId,
    refetchInterval: 3000,
  });

  // Mark messages as read
  useEffect(() => {
    if (!activeConvoId || !user || messages.length === 0) return;
    const unreadIds = messages.filter((m) => !m.is_read && m.sender_id !== user.id).map((m) => m.id);
    if (unreadIds.length > 0) {
      queryClient.setQueryData(["messages", activeConvoId], (current: MessageRecord[] | undefined) =>
        (current ?? []).map((message) =>
          unreadIds.includes(message.id) ? { ...message, is_read: true } : message
        )
      );
      queryClient.setQueryData(["conversations", user.id], (current: any[] | undefined) =>
        (current ?? []).map((conversation) =>
          conversation.id === activeConvoId ? { ...conversation, unread: 0 } : conversation
        )
      );

      supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unreadIds)
        .then(({ error }) => {
          if (error) {
            queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
          }
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        });
    }
  }, [messages, activeConvoId, user, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeConvoId) return;
    const channel = supabase
      .channel(`messages-${activeConvoId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== user?.id) {
          setIsTyping(true);
          clearTimeout((window as any).typingTimer);
          (window as any).typingTimer = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .on("postgres_changes", {
        event: "*",
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

      // The on_new_message_notify_recipient trigger already creates a notification.
      // Send email directly from client since DB trigger's net.http_post times out.
      const convo = conversations.find((c: any) => c.id === activeConvoId);
      if (convo) {
        const recipientId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;
        const senderName = user.user_metadata?.full_name || "İstifadəçi";

        // Check if recipient is offline (last_seen > 2 min ago)
        const recipientProfile = convo.profile;
        const isOffline = !recipientProfile?.last_seen || 
          (Date.now() - new Date(recipientProfile.last_seen).getTime() > 120000);

        // Send email if recipient is offline and has email_notifications enabled
        if (isOffline && recipientProfile?.email_notifications !== false) {
          supabase.functions.invoke("send-email", {
            body: {
              to_user_id: recipientId,
              subject: `${senderName} sizə mesaj göndərdi`,
              body: `Salam,\n\n${senderName} sizə yeni mesaj göndərdi:\n\n"${content.length > 200 ? content.substring(0, 200) + '...' : content}"\n\nMesajı oxumaq üçün daxil olun.`,
            },
          }).catch(() => {});
        }

        // Send push notification directly
        supabase.functions.invoke("send-user-push", {
          body: {
            user_id: recipientId,
            title: `${senderName} mesaj göndərdi`,
            body: content.length > 100 ? content.substring(0, 100) + "..." : content,
            link: "/messages",
          },
        }).catch(() => {});
      }
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
      if (!user) throw new Error("İstifadəçi tapılmadı");
      const { data, error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Mesaj silinə bilmədi");
      return data.id;
    },
    onSuccess: (deletedMessageId) => {
      removeMessageFromCache(deletedMessageId);
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast({ title: "Mesaj silindi" });
    },
    onError: (error: any) => {
      console.error("Delete message error:", error);
      toast({ title: "Xəta baş verdi", description: error.message, variant: "destructive" });
    },
  });

  // Delete conversation (for me)
  const deleteConversation = useMutation({
    mutationFn: async (convoId: string) => {
      if (!user) throw new Error("İstifadəçi tapılmadı");
      const { data, error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", convoId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Söhbət silinə bilmədi");
      return data.id;
    },
    onSuccess: (deletedConversationId) => {
      removeConversationFromCache(deletedConversationId);
      navigate("/messages");
      queryClient.invalidateQueries({ queryKey: ["messages", deletedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast({ title: "Söhbət silindi" });
    },
    onError: (error: any) => {
      console.error("Delete conversation error:", error);
      toast({ title: "Xəta baş verdi", description: error.message, variant: "destructive" });
    },
  });

  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);
  const isOnline = activeConvo?.profile?.last_seen && (Date.now() - new Date(activeConvo.profile.last_seen).getTime() < 120000);

  // Check if current user is a store owner (for showing "sent as store")
  const { data: myStores = [] } = useQuery({
    queryKey: ["my-stores", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  let myStore = null;
  if (activeConvoId && activeConvo) {
    if (activeConvo.listing && activeConvo.listing.store_id) {
      myStore = myStores.find((s: any) => s.id === activeConvo.listing.store_id);
    } else if (!activeConvo.listing) {
      myStore = myStores.length > 0 ? myStores[0] : null;
    }
  } else {
    myStore = myStores.length === 1 ? myStores[0] : null;
  }

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
      <TooltipProvider>
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
                conversations.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages?c=${c.id}`)}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                      activeConvoId === c.id ? "bg-accent" : ""
                    }`}
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {c.displayAvatar ? (
                          <img src={c.displayAvatar} alt="" className="h-full w-full object-cover" />
                        ) : c.isStore ? (
                          <Store className="h-4 w-4" />
                        ) : (
                          c.displayName[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      {(() => {
                        const ls = c.profile?.last_seen;
                        const online = ls && (Date.now() - new Date(ls).getTime() < 120000);
                        return (
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        );
                      })()}
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0.5 ml-1 cursor-help">
                                      {m.is_read ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-sky-300 fill-sky-300/20" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 opacity-70" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-[10px]">
                                      {m.is_read ? "Oxundu" : "Göndərildi"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            
                            {isMine && (
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
      </TooltipProvider>
      <Footer />
    </div>
  );
};

export default Messages;
