import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, MessageCircle, Share2, Eye, ShoppingBag, X, Send, Play, Image as ImageIcon, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/* ---- Image slideshow sub-component ---- */
const ImageSlideshow = ({ images, title }: { images: string[]; title: string }) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setSlideIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  useEffect(() => { setSlideIdx(0); }, [images]);

  return (
    <div className="relative h-full w-full">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={title}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-700",
            i === slideIdx ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setSlideIdx(i); }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === slideIdx ? "w-4 bg-white" : "w-1.5 bg-white/40"
              )}
            />
          ))}
        </div>
      )}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-white text-[10px]">
        <ImageIcon className="h-3 w-3" /> {slideIdx + 1}/{images.length}
      </div>
    </div>
  );
};

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const startId = searchParams.get("id");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const lastTapRef = useRef(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["reels-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch all active listings
  const { data: allReels = [] } = useQuery({
    queryKey: ["reels", startId],
    queryFn: async () => {
      const { data: allListings } = await supabase
        .from("listings")
        .select("id, title, price, currency, video_url, image_urls, user_id, store_id, created_at, category, views_count")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!allListings || allListings.length === 0) return [];

      if (startId) {
        const target = allListings.find(l => l.id === startId);
        if (target) {
          const sameCategory = allListings.filter(l => l.id !== startId && l.category === target.category);
          const rest = allListings.filter(l => l.id !== startId && l.category !== target.category);
          return [target, ...sameCategory, ...rest];
        }
      }

      const withVideo = allListings.filter(l => l.video_url);
      const withoutVideo = allListings.filter(l => !l.video_url);
      return [...withVideo, ...withoutVideo];
    },
  });

  // Filter by category
  const reels = selectedCategory
    ? allReels.filter(r => r.category === selectedCategory)
    : allReels;

  // Pause ALL videos and reset index when category changes
  useEffect(() => {
    videoRefs.current.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [selectedCategory]);

  const currentReel = reels[currentIndex];

  // Play only current reel's video, pause all others
  useEffect(() => {
    if (!currentReel) return;
    videoRefs.current.forEach((video, key) => {
      if (key === currentReel.id && currentReel.video_url) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    setIsPlaying(true);
  }, [currentIndex, currentReel?.id]);

  // Fetch profile for current reel
  const { data: reelProfile } = useQuery({
    queryKey: ["reel-profile", currentReel?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, user_id").eq("user_id", currentReel!.user_id).maybeSingle();
      return data;
    },
    enabled: !!currentReel,
  });

  // Check if current user follows the reel owner
  const { data: isFollowing } = useQuery({
    queryKey: ["reel-follow", currentReel?.user_id, user?.id],
    queryFn: async () => {
      if (!user || !currentReel || currentReel.user_id === user.id) return false;
      const { data: store } = await supabase.from("stores").select("id").eq("user_id", currentReel.user_id).maybeSingle();
      if (!store) return false;
      const { data: follow } = await supabase.from("store_followers").select("id").eq("store_id", store.id).eq("user_id", user.id).maybeSingle();
      return !!follow;
    },
    enabled: !!currentReel && !!user,
  });

  // Store of reel owner
  const { data: ownerStore } = useQuery({
    queryKey: ["reel-owner-store", currentReel?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id").eq("user_id", currentReel!.user_id).maybeSingle();
      return data;
    },
    enabled: !!currentReel,
  });

  // Like data
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

  // View count from reel_views
  const { data: viewCount = 0 } = useQuery({
    queryKey: ["reel-views", currentReel?.id],
    queryFn: async () => {
      const { count } = await supabase.from("reel_views").select("*", { count: "exact", head: true }).eq("listing_id", currentReel!.id);
      return count || 0;
    },
    enabled: !!currentReel,
  });

  // Comments
  const { data: comments = [] } = useQuery({
    queryKey: ["reel-comments", currentReel?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("listing_id", currentReel!.id)
        .order("created_at", { ascending: true });
      if (!data) return [];
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(c => ({ ...c, profile: profileMap.get(c.user_id) }));
    },
    enabled: !!currentReel,
  });

  // Record view - both reel_views and increment listings.views_count
  useEffect(() => {
    if (!currentReel) return;
    supabase.from("reel_views").insert({ listing_id: currentReel.id, user_id: user?.id || null });
    // Also increment the listing's views_count
    supabase.from("listings").update({ views_count: (currentReel.views_count || 0) + 1 }).eq("id", currentReel.id);
    queryClient.invalidateQueries({ queryKey: ["reel-views", currentReel.id] });
  }, [currentReel?.id]);

  // Scroll to bottom of comments when opened or new comment added
  useEffect(() => {
    if (showComments && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showComments, comments.length]);

  // Prevent pull-to-refresh
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventDefault = (e: TouchEvent) => { e.preventDefault(); };
    el.addEventListener("touchmove", preventDefault, { passive: false });
    return () => el.removeEventListener("touchmove", preventDefault);
  }, []);

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

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (!ownerStore) throw new Error("no-store");
      if (isFollowing) {
        await supabase.from("store_followers").delete().eq("store_id", ownerStore.id).eq("user_id", user.id);
      } else {
        await supabase.from("store_followers").insert({ store_id: ownerStore.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reel-follow", currentReel?.user_id] });
      toast({ title: isFollowing ? "İzləmə dayandırıldı" : "İzlənilir" });
    },
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
    if (isTransitioning || currentIndex >= reels.length - 1) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsTransitioning(false), 350);
  }, [currentIndex, reels.length, isTransitioning]);

  const goPrev = useCallback(() => {
    if (isTransitioning || currentIndex <= 0) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsTransitioning(false), 350);
  }, [currentIndex, isTransitioning]);

  const togglePlay = () => {
    if (!currentReel) return;
    const video = videoRefs.current.get(currentReel.id);
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); }
    else { video.pause(); setIsPlaying(false); }
  };

  // Double-tap to like
  const handleDoubleTap = () => {
    if (!user) { navigate("/auth"); return; }
    if (!likeData?.isLiked) toggleLike.mutate();
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 800);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      handleDoubleTap();
    } else {
      if (currentReel?.video_url) togglePlay();
    }
    lastTapRef.current = now;
  };

  // Touch swipe
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showComments) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    swiping.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swiping.current || showComments) return;
    swiping.current = false;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    if (Math.abs(diffY) > 60 && Math.abs(diffY) > diffX) {
      if (diffY > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showComments) return;
      if (e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowUp") goPrev();
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, currentIndex, showComments]);

  if (allReels.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-semibold">Hələ heç bir elan yoxdur</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Ana səhifə</Button>
      </div>
    );
  }

  const showFollowBtn = currentReel && user && currentReel.user_id !== user.id && ownerStore;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button onClick={() => navigate(-1)} className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white">
        <X className="h-5 w-5" />
      </button>

      {/* Category tabs */}
      <div className="absolute top-3 left-14 right-4 z-50 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              !selectedCategory
                ? "bg-white text-black"
                : "bg-white/15 text-white/80 backdrop-blur-sm"
            )}
          >
            Hamısı
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug === selectedCategory ? null : cat.slug)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
                selectedCategory === cat.slug
                  ? "bg-white text-black"
                  : "bg-white/15 text-white/80 backdrop-blur-sm"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Counter */}
      {reels.length > 0 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-white/50 text-[10px]">
          {currentIndex + 1} / {reels.length}
        </div>
      )}

      {/* No results for this category */}
      {reels.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-white">
          <p className="text-sm text-white/60">Bu kateqoriyada elan yoxdur</p>
          <button onClick={() => setSelectedCategory(null)} className="mt-2 text-xs text-primary font-medium">Hamısını göstər</button>
        </div>
      )}

      {/* Content */}
      {reels.map((reel, idx) => {
        if (Math.abs(idx - currentIndex) > 1) return null;

        const isVideo = !!reel.video_url;
        const images = (reel.image_urls || []).filter(Boolean);
        const hasMultipleImages = !isVideo && images.length > 1;

        return (
          <div
            key={reel.id + "-" + selectedCategory}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out",
              idx === currentIndex
                ? "translate-y-0 z-10"
                : idx < currentIndex
                  ? "-translate-y-full z-0 pointer-events-none"
                  : "translate-y-full z-0 pointer-events-none"
            )}
            onClick={idx === currentIndex ? handleContentClick : undefined}
          >
            {isVideo ? (
              <video
                ref={el => { if (el) videoRefs.current.set(reel.id, el); }}
                src={reel.video_url!}
                className="h-full w-full object-contain"
                loop
                playsInline
                muted={idx !== currentIndex}
              />
            ) : hasMultipleImages ? (
              <ImageSlideshow images={images} title={reel.title} />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <img src={images[0] || "/placeholder.svg"} alt={reel.title} className="h-full w-full object-contain" />
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-white text-[10px]">
                  <ImageIcon className="h-3 w-3" /> Şəkil
                </div>
              </div>
            )}

            {/* Play/Pause overlay */}
            {isVideo && !isPlaying && idx === currentIndex && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              </div>
            )}

            {/* Double-tap like animation */}
            {showLikeAnim && idx === currentIndex && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-like-pop" />
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom info */}
      {currentReel && (
        <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          {/* Owner row with follow button */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/seller/${currentReel.user_id}`); }}
              className="flex items-center gap-2"
            >
              <div className="h-9 w-9 rounded-full bg-primary/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2 ring-white/30">
                {reelProfile?.avatar_url ? (
                  <img src={reelProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (reelProfile?.full_name || "?")[0].toUpperCase()
                )}
              </div>
              <span className="text-white text-sm font-semibold">{reelProfile?.full_name || "İstifadəçi"}</span>
            </button>

            {showFollowBtn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) { navigate("/auth"); return; }
                  toggleFollow.mutate();
                }}
                className={cn(
                  "ml-1 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  isFollowing ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
                )}
              >
                {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                {isFollowing ? "İzləmədən çıx" : "İzlə"}
              </button>
            )}

            <span className="text-white/50 text-xs ml-auto">· {formatTime(currentReel.created_at)}</span>
          </div>

          {/* Price - prominent */}
          <div className="mb-1">
            <span className="inline-block rounded-lg bg-primary px-3 py-1 text-primary-foreground font-bold text-lg">
              {currentReel.price} {currentReel.currency}
            </span>
          </div>

          {/* Listing title - clickable to listing page */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${currentReel.id}`); }}
            className="text-left"
          >
            <h3 className="text-white font-semibold text-base line-clamp-2 hover:underline">{currentReel.title}</h3>
          </button>
        </div>
      )}

      {/* Right side actions */}
      {currentReel && (
        <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
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

          <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-0.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-[11px] font-medium">{formatCount(comments.length)}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(window.location.origin + `/reels?id=${currentReel.id}`);
              toast({ title: "Link kopyalandı!" });
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Share2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-[11px] font-medium">Paylaş</span>
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-[11px] font-medium">{formatCount(viewCount + (currentReel.views_count || 0))}</span>
          </div>
        </div>
      )}

      {/* Comments overlay - half-screen panel over video */}
      {showComments && (
        <div
          className="absolute inset-0 z-40 touch-auto"
          onClick={() => setShowComments(false)}
          onTouchMove={e => e.stopPropagation()}
        >
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Comment panel - exactly 50% of screen from bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-card"
            style={{ height: "50vh" }}
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground text-sm">Şərhlər ({comments.length})</h3>
              <button onClick={() => setShowComments(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            {/* Scrollable comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
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
              <div ref={commentsEndRef} />
            </div>

            {/* Fixed comment input at bottom */}
            {user ? (
              <form
                onSubmit={e => { e.preventDefault(); if (commentText.trim()) addComment.mutate(); }}
                className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0 bg-card"
              >
                <input
                  autoFocus
                  placeholder="Şərh yazın..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 h-9 rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onTouchStart={e => e.stopPropagation()}
                />
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={!commentText.trim() || addComment.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="px-4 py-3 border-t border-border text-center shrink-0 bg-card">
                <button onClick={() => navigate("/auth")} className="text-sm text-primary font-medium">
                  Şərh yazmaq üçün daxil olun
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reels;
