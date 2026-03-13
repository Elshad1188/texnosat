import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Eye, ShoppingBag, ChevronUp, ChevronDown, X, Send, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatCount(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "İndicə";
  if (hours < 24) return `${hours}s`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}g`;
  return new Date(dateStr).toLocaleDateString("az");
}

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Fetch listings with videos
  const { data: reels = [] } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, currency, video_url, image_urls, user_id, store_id, created_at")
        .not("video_url", "is", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const currentReel = reels[currentIndex];

  // Fetch profile for current reel
  const { data: reelProfile } = useQuery({
    queryKey: ["reel-profile", currentReel?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", currentReel!.user_id).maybeSingle();
      return data;
    },
    enabled: !!currentReel,
  });

  // Fetch like count + user like
  const { data: likeData } = useQuery({
    queryKey: ["reel-likes", currentReel?.id, user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("reel_likes").select("*", { count: "exact", head: true }).eq("listing_id", currentReel!.id);
      let isLiked = false;
      if (user) {
        const { data } = await supabase.from("reel_likes").select("id").eq("listing_id", currentReel!.id).eq("user_id", user.id).maybeSingle();
        isLiked = !!data;
      }
      return { count: count || 0, isLiked };
    },
    enabled: !!currentReel,
  });

  // Fetch view count
  const { data: viewCount = 0 } = useQuery({
    queryKey: ["reel-views", currentReel?.id],
    queryFn: async () => {
      const { count } = await supabase.from("reel_views").select("*", { count: "exact", head: true }).eq("listing_id", currentReel!.id);
      return count || 0;
    },
    enabled: !!currentReel,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["reel-comments", currentReel?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("listing_id", currentReel!.id)
        .order("created_at", { ascending: true });
      if (!data) return [];
      // fetch profiles for commenters
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(c => ({ ...c, profile: profileMap.get(c.user_id) }));
    },
    enabled: !!currentReel,
  });

  // Record view
  useEffect(() => {
    if (!currentReel) return;
    supabase.from("reel_views").insert({ listing_id: currentReel.id, user_id: user?.id || null });
    queryClient.invalidateQueries({ queryKey: ["reel-views", currentReel.id] });
  }, [currentReel?.id]);

  // Play/pause video on index change
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (idx === currentIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
        setIsPlaying(true);
      } else {
        video.pause();
      }
    });
  }, [currentIndex, reels]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (likeData?.isLiked) {
        await supabase.from("reel_likes").delete().eq("listing_id", currentReel!.id).eq("user_id", user.id);
      } else {
        await supabase.from("reel_likes").insert({ listing_id: currentReel!.id, user_id: user.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reel-likes", currentReel?.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;
      await supabase.from("reel_comments").insert({ listing_id: currentReel!.id, user_id: user.id, content: commentText.trim() });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["reel-comments", currentReel?.id] });
    },
  });

  const goNext = useCallback(() => {
    if (currentIndex < reels.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, reels.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const togglePlay = () => {
    const video = videoRefs.current.get(currentIndex);
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); } 
    else { video.pause(); setIsPlaying(false); }
  };

  // Touch swipe
  const touchStart = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (diff > 60) goNext();
    else if (diff < -60) goPrev();
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowUp") goPrev();
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, currentIndex]);

  if (reels.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-semibold">Hələ heç bir video yoxdur</p>
        <p className="mt-1 text-sm text-muted-foreground">Elan yaradarkən video əlavə edin</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Ana səhifə</Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black" 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button onClick={() => navigate(-1)} className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
        <X className="h-5 w-5" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white/70 text-xs font-medium">
        {currentIndex + 1} / {reels.length}
      </div>

      {/* Video */}
      {reels.map((reel, idx) => (
        <div
          key={reel.id}
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <video
            ref={el => { if (el) videoRefs.current.set(idx, el); }}
            src={reel.video_url!}
            className="h-full w-full object-contain"
            loop
            playsInline
            muted={idx !== currentIndex}
            onClick={togglePlay}
          />
          {/* Play/Pause overlay */}
          {!isPlaying && idx === currentIndex && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {reelProfile?.avatar_url ? (
              <img src={reelProfile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (reelProfile?.full_name || "?")[0].toUpperCase()
            )}
          </div>
          <span className="text-white text-sm font-semibold">{reelProfile?.full_name || "İstifadəçi"}</span>
          <span className="text-white/50 text-xs">· {currentReel && formatTime(currentReel.created_at)}</span>
        </div>
        <h3 className="text-white font-semibold text-base line-clamp-2">{currentReel?.title}</h3>
        <p className="text-primary font-bold text-lg mt-0.5">{currentReel?.price} {currentReel?.currency}</p>
        <button 
          onClick={() => navigate(`/product/${currentReel?.id}`)}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm px-3 py-1.5 text-white text-xs font-medium"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Elana bax
        </button>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-5">
        {/* Like */}
        <button 
          onClick={() => {
            if (!user) { navigate("/auth"); return; }
            toggleLike.mutate();
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", likeData?.isLiked ? "bg-red-500/20" : "bg-white/10 backdrop-blur-sm")}>
            <Heart className={cn("h-6 w-6", likeData?.isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </div>
          <span className="text-white text-[11px] font-medium">{formatCount(likeData?.count || 0)}</span>
        </button>

        {/* Comments */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-0.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">{formatCount(comments.length)}</span>
        </button>

        {/* Share */}
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + `/product/${currentReel?.id}`);
            toast({ title: "Link kopyalandı!" });
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">Paylaş</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">{formatCount(viewCount)}</span>
        </div>
      </div>

      {/* Nav arrows (desktop) */}
      <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        <button onClick={goPrev} disabled={currentIndex === 0} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white disabled:opacity-30">
          <ChevronUp className="h-5 w-5" />
        </button>
        <button onClick={goNext} disabled={currentIndex === reels.length - 1} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white disabled:opacity-30">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="absolute inset-0 z-40 flex flex-col" onClick={() => setShowComments(false)}>
          <div className="flex-1" />
          <div 
            className="rounded-t-2xl bg-card max-h-[60vh] flex flex-col animate-slide-in-from-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Şərhlər ({comments.length})</h3>
              <button onClick={() => setShowComments(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Hələ şərh yoxdur</p>
              ) : comments.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(c.profile?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{c.profile?.full_name || "İstifadəçi"}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {user && (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
                <Input 
                  placeholder="Şərh yazın..." 
                  value={commentText} 
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addComment.mutate()}
                  className="h-9 text-sm"
                />
                <Button size="icon" className="h-9 w-9 shrink-0" disabled={!commentText.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reels;
