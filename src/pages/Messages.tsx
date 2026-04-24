import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Loader2, Check, CheckCheck, Store, Trash2, MoreVertical, ImagePlus, Mic, X, Phone, Lock, Pause, Play } from "lucide-react";
import CallDialog from "@/components/CallDialog";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import IdentitySwitcher from "@/components/IdentitySwitcher";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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
  sender_store_id: string | null;
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imagePreviewFile, setImagePreviewFile] = useState<File | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice recording state (WhatsApp-like)
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordLocked, setRecordLocked] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const audioPreviewBlobRef = useRef<Blob | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const cancelRecordRef = useRef(false);
  const slideXRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const [slideX, setSlideX] = useState(0);
  const [slideY, setSlideY] = useState(0);

  // Call state
  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState<"outgoing" | "incoming">("outgoing");
  const [callPeer, setCallPeer] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] = useState<any>(null);
  const { incoming, dismiss } = useIncomingCall();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreviewFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const cancelImagePreview = () => {
    setPreviewImage(null);
    setImagePreviewFile(null);
  };

  const sendImageMessage = async () => {
    if (!imagePreviewFile || !user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const ext = imagePreviewFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, imagePreviewFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      
      const msgData: any = {
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "📷 Şəkil",
        image_url: publicUrl,
      };
      if (selectedStoreId) msgData.sender_store_id = selectedStoreId;
      
      const { error: msgErr } = await supabase.from("messages").insert(msgData);
      if (msgErr) throw msgErr;
      cancelImagePreview();
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    } catch (err: any) {
      toast({ title: "Şəkil göndərilmədi", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordRef.current = false;
      audioPreviewBlobRef.current = null;
      setAudioPreviewUrl(null);
      setRecordingTime(0);
      setRecordLocked(false);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        if (cancelRecordRef.current) {
          audioChunksRef.current = [];
          setIsRecording(false);
          setRecordLocked(false);
          setRecordingTime(0);
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioPreviewBlobRef.current = blob;
        if (recordLocked) {
          // Show preview
          setAudioPreviewUrl(URL.createObjectURL(blob));
          setIsRecording(false);
        } else {
          // Quick send
          uploadAudioBlob(blob);
          setIsRecording(false);
        }
      };
      recorder.start();
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast({ title: "Mikrofona icazə lazımdır", variant: "destructive" });
    }
  };

  const stopRecording = (cancel = false) => {
    cancelRecordRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudioBlob = async (blob: Blob) => {
    if (!user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, blob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);

      const msgData: any = {
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "🎤 Səsli mesaj",
        audio_url: publicUrl,
      };
      if (selectedStoreId) msgData.sender_store_id = selectedStoreId;

      const { error: msgErr } = await supabase.from("messages").insert(msgData);
      if (msgErr) throw msgErr;
      audioPreviewBlobRef.current = null;
      setAudioPreviewUrl(null);
      setRecordingTime(0);
      setRecordLocked(false);
      queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
    } catch {
      toast({ title: "Səs göndərilmədi", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const sendVoicePreview = () => {
    if (audioPreviewBlobRef.current) uploadAudioBlob(audioPreviewBlobRef.current);
  };

  const cancelVoicePreview = () => {
    audioPreviewBlobRef.current = null;
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
    setRecordLocked(false);
  };

  // Pointer handlers for hold-to-record
  const handleMicPointerDown = (e: React.PointerEvent) => {
    if (audioPreviewUrl) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    slideXRef.current = 0;
    setSlideX(0);
    setSlideY(0);
    startRecording();
  };

  const handleMicPointerMove = (e: React.PointerEvent) => {
    if (!isRecording || recordLocked) return;
    const dx = Math.min(0, e.clientX - startXRef.current); // only left
    const dy = Math.min(0, e.clientY - startYRef.current); // only up
    setSlideX(dx);
    setSlideY(dy);
    if (dx < -100) {
      // Cancel
      stopRecording(true);
    } else if (dy < -80) {
      // Lock
      setRecordLocked(true);
      setSlideX(0);
      setSlideY(0);
    }
  };

  const handleMicPointerUp = () => {
    if (!isRecording) return;
    if (recordLocked) return; // stay recording until user taps stop
    setSlideX(0);
    setSlideY(0);
    if (recordingTime < 1) {
      // too short
      stopRecording(true);
      toast({ title: "Səsli mesaj çox qısadır", description: "Mikrofonu basıb saxlayın" });
      return;
    }
    stopRecording(false);
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

  // Fetch conversations
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

      const otherUserIds = conversationRows.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", otherUserIds);
      const { data: stores } = await supabase.from("stores").select("*").in("user_id", otherUserIds);

      const listingIds = conversationRows.filter(c => c.listing_id).map(c => c.listing_id!);
      const { data: listings } = listingIds.length > 0
        ? await supabase.from("listings").select("id, title, image_urls, store_id").in("id", listingIds)
        : { data: [] };

      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationRows.map(c => c.id))
        .order("created_at", { ascending: false });

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

        let store = undefined;
        if (listing && listing.store_id) {
          const storeMatch = (stores || []).find((s: any) => s.id === listing.store_id);
          if (storeMatch && storeMatch.user_id === otherUserId) store = storeMatch;
        } else if (!listing) {
          store = (stores || []).find((s: any) => s.user_id === otherUserId);
        }

        const displayName = store ? store.name : (profile?.full_name || "Adsız");
        const displayAvatar = store?.logo_url || null;
        const isStore = !!store;

        return { ...c, profile, store, listing, lastMsg, unread, displayName, displayAvatar, isStore };
      });
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Fetch messages
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

  // Mark as read
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
          if (error) queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        });
    }
  }, [messages, activeConvoId, user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
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
      const msgData: any = {
        conversation_id: activeConvoId,
        sender_id: user.id,
        content,
      };
      if (selectedStoreId) msgData.sender_store_id = selectedStoreId;
      const { error } = await supabase.from("messages").insert(msgData);
      if (error) throw error;

      const convo = conversations.find((c: any) => c.id === activeConvoId);
      if (convo) {
        const recipientId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;
        const senderName = user.user_metadata?.full_name || "İstifadəçi";
        const recipientProfile = convo.profile;
        const isOffline = !recipientProfile?.last_seen || 
          (Date.now() - new Date(recipientProfile.last_seen).getTime() > 120000);

        if (isOffline && recipientProfile?.email_notifications !== false) {
          supabase.functions.invoke("send-email", {
            body: {
              to_user_id: recipientId,
              subject: `${senderName} sizə mesaj göndərdi`,
              body: `Salam,\n\n${senderName} sizə yeni mesaj göndərdi:\n\n"${content.length > 200 ? content.substring(0, 200) + '...' : content}"\n\nMesajı oxumaq üçün daxil olun.`,
            },
          }).catch(() => {});
        }

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
      toast({ title: "Xəta baş verdi", description: error.message, variant: "destructive" });
    },
  });

  // Delete conversation
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
      toast({ title: "Xəta baş verdi", description: error.message, variant: "destructive" });
    },
  });

  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);
  const isOnline = activeConvo?.profile?.last_seen && (Date.now() - new Date(activeConvo.profile.last_seen).getTime() < 120000);

  // Fetch stores for message display (sender_store_id lookups)
  const { data: allStoresForMessages = [] } = useQuery({
    queryKey: ["stores-for-messages", activeConvoId],
    queryFn: async () => {
      if (!activeConvoId || messages.length === 0) return [];
      const storeIds = [...new Set(messages.filter(m => m.sender_store_id).map(m => m.sender_store_id!))];
      if (storeIds.length === 0) return [];
      const { data } = await supabase.from("stores").select("id, name, logo_url").in("id", storeIds);
      return data || [];
    },
    enabled: !!activeConvoId && messages.length > 0,
  });

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviewFile) {
      sendImageMessage();
    } else {
      sendMessage.mutate();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Mesajlarınızı görün</h2>
          <p className="text-sm text-muted-foreground mb-6">Daxil olun və söhbətlərinizə qoşulun</p>
          <Button onClick={() => navigate("/auth")} className="bg-gradient-primary text-primary-foreground px-8">Daxil ol</Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: MessageRecord[] }[] = [];
  messages.forEach((m) => {
    const dateStr = new Date(m.created_at!).toLocaleDateString("az", { day: "numeric", month: "long", year: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(m);
    } else {
      groupedMessages.push({ date: dateStr, msgs: [m] });
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <TooltipProvider>
        <main className="container mx-auto flex-1 px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg">
            {/* Sidebar */}
            <div className={`w-full md:w-[340px] flex-shrink-0 flex flex-col bg-card ${activeConvoId ? "hidden md:flex" : "flex"}`}>
              <div className="p-4 pb-3">
                <h2 className="font-display text-xl font-bold text-foreground">Mesajlar</h2>
                <div className="mt-2">
                  <IdentitySwitcher
                    selectedStoreId={selectedStoreId}
                    onSelect={setSelectedStoreId}
                    compact
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convosLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Hələ mesajınız yoxdur</p>
                    <p className="text-xs text-muted-foreground">Elan sahibinə yazaraq söhbətə başlayın</p>
                  </div>
                ) : (
                  conversations.map((c: any) => {
                    const ls = c.profile?.last_seen;
                    const online = ls && (Date.now() - new Date(ls).getTime() < 120000);
                    return (
                      <div
                        key={c.id}
                        className={`group/convo relative flex items-center gap-3 px-4 py-3 transition-all duration-200 border-b border-border/30 ${
                          activeConvoId === c.id
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <button
                          onClick={() => navigate(`/messages?c=${c.id}`)}
                          className="flex flex-1 items-center gap-3 text-left min-w-0"
                        >
                        <div className="relative flex-shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-sm ring-2 ring-background">
                            {c.displayAvatar ? (
                              <img src={c.displayAvatar} alt="" className="h-full w-full object-cover" />
                            ) : c.isStore ? (
                              <Store className="h-5 w-5" />
                            ) : (
                              <span className="text-base">{c.displayName[0]?.toUpperCase() || "?"}</span>
                            )}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-card ${online ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={`text-sm truncate ${c.unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                                {c.displayName}
                              </p>
                              {c.isStore && <Store className="h-3 w-3 shrink-0 text-primary" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                              {c.lastMsg ? formatTime(c.lastMsg.created_at) : ""}
                            </span>
                          </div>
                          {c.listing && (
                            <p className="text-[11px] text-primary/80 truncate mb-0.5">{c.listing.title}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${c.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {c.lastMsg?.sender_id === user.id && (
                                <span className="mr-1 inline-flex align-middle">
                                  {c.lastMsg.is_read ? (
                                    <CheckCheck className="inline h-3.5 w-3.5 text-sky-500" />
                                  ) : (
                                    <Check className="inline h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </span>
                              )}
                              {c.lastMsg?.image_url ? "📷 Şəkil" : c.lastMsg?.audio_url ? "🎤 Səsli mesaj" : c.lastMsg?.content || "Mesaj yoxdur"}
                            </p>
                            {c.unread > 0 && (
                              <span className="flex-shrink-0 ml-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                        </button>
                        {/* Hover/long-press delete menu */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/convo:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-card/90 shadow-sm border border-border/40">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive gap-2 font-medium"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Söhbəti sil
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Söhbəti silmək istəyirsiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>Bu söhbət bütün mesajlarla birlikdə silinəcək.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteConversation.mutate(c.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className={`flex-1 flex flex-col border-l border-border/30 ${!activeConvoId ? "hidden md:flex" : "flex"}`}>
              {activeConvoId && activeConvo ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 bg-card/80 backdrop-blur-sm">
                    <button onClick={() => navigate("/messages")} className="md:hidden p-1 -ml-1 rounded-lg hover:bg-muted transition-colors">
                      <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-sm ring-2 ring-border/50">
                        {activeConvo.displayAvatar ? (
                          <img src={activeConvo.displayAvatar} alt="" className="h-full w-full object-cover" />
                        ) : activeConvo.isStore ? (
                          <Store className="h-4 w-4" />
                        ) : (
                          activeConvo.displayName[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${isOnline ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {activeConvo.displayName}
                        </p>
                        {activeConvo.isStore && <Store className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        {isOnline ? (
                          <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Onlayn</>
                        ) : activeConvo.listing ? (
                          activeConvo.listing.title
                        ) : activeConvo.profile?.last_seen ? (
                          `Son görülmə: ${formatTime(activeConvo.profile.last_seen)}`
                        ) : ""}
                      </p>
                    </div>
                    
                    {isTyping && (
                      <div className="flex items-center gap-1 mr-2">
                        <span className="text-xs text-primary animate-pulse">yazır</span>
                        <span className="flex gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full"
                      onClick={() => {
                        const peerId = activeConvo.buyer_id === user.id ? activeConvo.seller_id : activeConvo.buyer_id;
                        setCallPeer({
                          id: peerId,
                          name: activeConvo.displayName,
                          avatar: activeConvo.displayAvatar,
                        });
                        setCallMode("outgoing");
                        setActiveIncomingCall(null);
                        setCallOpen(true);
                      }}
                      title="Səsli zəng"
                    >
                      <Phone className="h-4.5 w-4.5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Söhbəti silmək istəyirsiniz?</AlertDialogTitle>
                          <AlertDialogDescription>Bu söhbət bütün mesajlarla birlikdə silinəcək.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteConversation.mutate(activeConvo.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Messages area */}
                  <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 bg-muted/20">
                    {msgsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="rounded-2xl bg-primary/5 p-6 mb-4">
                          <Send className="h-8 w-8 text-primary/40" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">Söhbətə başlayın</p>
                        <p className="text-xs text-muted-foreground">İlk mesajınızı göndərin</p>
                      </div>
                    ) : (
                      groupedMessages.map((group) => (
                        <div key={group.date}>
                          {/* Date separator */}
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[10px] text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full">
                              {group.date}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {group.msgs.map((m, idx) => {
                              const isMine = m.sender_id === user.id;
                              const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                              const isConsecutive = prevMsg && prevMsg.sender_id === m.sender_id && prevMsg.sender_store_id === m.sender_store_id;
                              const senderStore = m.sender_store_id ? allStoresForMessages.find((s: any) => s.id === m.sender_store_id) : null;
                              
                              return (
                                <div key={m.id} className={`flex group ${isMine ? "justify-end" : "justify-start"} ${isConsecutive ? "" : "mt-3"}`}>
                                  {/* Store badge for incoming messages */}
                                  {!isMine && senderStore && !isConsecutive && (
                                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                                      <div className="h-4 w-4 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        {senderStore.logo_url ? (
                                          <img src={senderStore.logo_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <Store className="h-2.5 w-2.5 text-primary" />
                                        )}
                                      </div>
                                      <span className="text-[10px] font-medium text-primary">{senderStore.name}</span>
                                    </div>
                                  )}
                                  <div className={`relative max-w-[80%] sm:max-w-[70%] ${
                                    m.image_url ? "rounded-2xl overflow-hidden" : `rounded-2xl px-3.5 py-2 ${
                                      isMine
                                        ? "bg-primary text-primary-foreground rounded-br-sm"
                                        : "bg-card text-foreground rounded-bl-sm shadow-sm border border-border/50"
                                    }`
                                  }`}>
                                    {/* Image message */}
                                    {m.image_url && (
                                      <div className={`${isMine ? "bg-primary" : "bg-card border border-border/50 shadow-sm"} rounded-2xl overflow-hidden ${isMine ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                                        <button
                                          onClick={() => setLightboxImage(m.image_url)}
                                          className="block w-full"
                                        >
                                          <img
                                            src={m.image_url}
                                            alt="Şəkil"
                                            className="max-w-[260px] sm:max-w-[320px] max-h-[300px] object-cover w-full"
                                            loading="lazy"
                                          />
                                        </button>
                                        {m.content && m.content !== "📷 Şəkil" && m.content !== "Fotoşəkil" && (
                                          <p className={`text-sm px-3 pt-1.5 pb-0.5 ${isMine ? "text-primary-foreground" : "text-foreground"}`}>
                                            {m.content}
                                          </p>
                                        )}
                                        <div className={`flex items-center justify-end gap-1 px-3 pb-2 pt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                          <span className="text-[10px]">
                                            {new Date(m.created_at!).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                          {isMine && (
                                            m.is_read ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : <Check className="h-3.5 w-3.5 opacity-70" />
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Audio message */}
                                    {!m.image_url && m.audio_url && (
                                      <>
                                        <audio controls src={m.audio_url} className="max-w-[240px] h-10" />
                                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                          <span className="text-[10px]">
                                            {new Date(m.created_at!).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                          {isMine && (
                                            m.is_read ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : <Check className="h-3.5 w-3.5 opacity-70" />
                                          )}
                                        </div>
                                      </>
                                    )}

                                    {/* Text message */}
                                    {!m.image_url && !m.audio_url && (
                                      <>
                                        <p className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                                        <div className={`flex items-center justify-end gap-1 mt-0.5 -mb-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                                          <span className="text-[10px]">
                                            {new Date(m.created_at!).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                          {isMine && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="cursor-help">
                                                  {m.is_read ? (
                                                    <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                                                  ) : (
                                                    <Check className="h-3.5 w-3.5 opacity-60" />
                                                  )}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                <p className="text-[10px]">{m.is_read ? "Oxundu" : "Göndərildi"}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </>
                                    )}
                                    
                                    {/* Delete action */}
                                    {isMine && (
                                      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md border border-border">
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
                            })}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Image preview */}
                  {previewImage && (
                    <div className="border-t border-border/50 px-4 py-3 bg-card flex items-center gap-3">
                      <div className="relative">
                        <img src={previewImage} alt="Önizləmə" className="h-16 w-16 rounded-xl object-cover border border-border" />
                        <button
                          onClick={cancelImagePreview}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground flex-1">Şəkil göndərilməyə hazırdır</p>
                      <Button 
                        size="sm" 
                        onClick={sendImageMessage} 
                        disabled={uploadingMedia}
                        className="bg-gradient-primary text-primary-foreground gap-1.5"
                      >
                        {uploadingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Göndər
                      </Button>
                    </div>
                  )}

                  {/* Voice preview (locked recording finished) */}
                  {audioPreviewUrl && (
                    <div className="border-t border-border/50 px-4 py-3 bg-card flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelVoicePreview}
                        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <audio src={audioPreviewUrl} controls className="flex-1 h-10" />
                      <Button
                        size="icon"
                        onClick={sendVoicePreview}
                        disabled={uploadingMedia}
                        className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                      >
                        {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}

                  {/* Input area */}
                  <div className="border-t border-border/50 p-3 sm:p-4 bg-card">
                    <div className="mb-2">
                      <IdentitySwitcher
                        selectedStoreId={selectedStoreId}
                        onSelect={setSelectedStoreId}
                        compact
                      />
                    </div>

                    {/* Recording overlay (WhatsApp-like) */}
                    {isRecording && !audioPreviewUrl ? (
                      <div className="relative flex items-center gap-3 h-12 px-3 rounded-xl bg-muted/40 border border-border/50">
                        <span className="flex h-3 w-3">
                          <span className="absolute inline-flex h-3 w-3 rounded-full bg-destructive opacity-75 animate-ping" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                        </span>
                        <span className="text-sm font-mono text-foreground tabular-nums w-14">
                          {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:
                          {(recordingTime % 60).toString().padStart(2, "0")}
                        </span>

                        {recordLocked ? (
                          <>
                            <div className="flex-1 text-xs text-muted-foreground">Səs yazılır... bitirmək üçün basın</div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => { cancelRecordRef.current = true; stopRecording(true); }}
                              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => { cancelRecordRef.current = false; stopRecording(false); }}
                              className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div
                            className="flex-1 flex items-center justify-end gap-2 text-xs text-muted-foreground select-none"
                            style={{ transform: `translateX(${slideX}px)` }}
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Ləğv etmək üçün sürüşdürün · yuxarı çəkib kilidləyin</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="flex items-end gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingMedia}
                          >
                            {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                          </Button>
                        </div>
                        <div className="flex-1 relative">
                          <textarea
                            ref={inputRef}
                            value={messageText}
                            onChange={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Mesaj yazın..."
                            rows={1}
                            className="w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                            style={{ maxHeight: 120 }}
                          />
                          {slideY < -20 && !recordLocked && (
                            <div
                              className="absolute -top-12 right-2 flex flex-col items-center gap-1 text-primary"
                              style={{ transform: `translateY(${Math.max(slideY, -60)}px)` }}
                            >
                              <Lock className="h-5 w-5" />
                              <span className="text-[10px]">Kilidlə</span>
                            </div>
                          )}
                        </div>
                        {messageText.trim() || imagePreviewFile ? (
                          <Button
                            type="submit"
                            size="icon"
                            disabled={sendMessage.isPending}
                            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all disabled:opacity-40"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="icon"
                            onPointerDown={handleMicPointerDown}
                            onPointerMove={handleMicPointerMove}
                            onPointerUp={handleMicPointerUp}
                            onPointerCancel={handleMicPointerUp}
                            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all touch-none select-none"
                            title="Basıb saxlayın və danışın"
                          >
                            <Mic className="h-5 w-5" />
                          </Button>
                        )}
                      </form>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
                  <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 mb-6">
                    <MessageCircle className="h-16 w-16 text-primary/30" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">Söhbət seçin</p>
                  <p className="text-sm text-muted-foreground max-w-xs">Soldakı siyahıdan söhbət seçərək mesajlaşmaya başlayın</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </TooltipProvider>
      <Footer />

      {/* Image lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-0 overflow-hidden">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Şəkil"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Outgoing call dialog */}
      {callOpen && callPeer && user && activeConvoId && (
        <CallDialog
          open={callOpen}
          onClose={() => { setCallOpen(false); setCallPeer(null); setActiveIncomingCall(null); }}
          mode={callMode}
          callId={activeIncomingCall?.id ?? null}
          conversationId={activeIncomingCall?.conversation_id ?? activeConvoId}
          selfId={user.id}
          peerId={callPeer.id}
          peerName={callPeer.name}
          peerAvatar={callPeer.avatar}
          initialOffer={activeIncomingCall?.offer}
        />
      )}

      {/* Incoming call popup (works regardless of active conversation) */}
      {incoming && !callOpen && user && (
        <CallDialog
          open
          onClose={() => dismiss()}
          mode="incoming"
          callId={incoming.id}
          conversationId={incoming.conversation_id}
          selfId={user.id}
          peerId={incoming.caller_id}
          peerName={
            conversations.find((c: any) =>
              c.buyer_id === incoming.caller_id || c.seller_id === incoming.caller_id
            )?.displayName ?? "Naməlum"
          }
          peerAvatar={
            conversations.find((c: any) =>
              c.buyer_id === incoming.caller_id || c.seller_id === incoming.caller_id
            )?.displayAvatar ?? null
          }
          initialOffer={incoming.offer}
        />
      )}
    </div>
  );
};

export default Messages;
