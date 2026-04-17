import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, MapPin, Grid, Phone, MessageSquare, MessageCircle, ChevronLeft, Flag, Send, Heart, X, Trash2, Clock, Star, Shield, Eye, Loader2, Store, ExternalLink, Edit2, Crown, Zap, Gem, Play, UserPlus, UserCheck, ShoppingCart, Facebook, Twitter, Link as LinkIcon, Copy, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import ImageViewer from "@/components/ImageViewer";
import { useState, useEffect } from "react";
import CheckoutDialog from "@/components/CheckoutDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdminOrMod, useIsAdmin } from "@/hooks/useIsAdmin";
import { usePlatformMode } from "@/hooks/usePlatformMode";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import WatermarkOverlay from "@/components/WatermarkOverlay";
import ReportButton from "@/components/ReportButton";
import ModerationToolbar from "@/components/admin/ModerationToolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Az əvvəl";
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(dateStr).toLocaleDateString("az");
}

function getUserLevel(reviewCount: number, avg: number) {
  if (reviewCount >= 25 && avg >= 4) return { label: "VIP Satıcı", color: "bg-amber-500/20 text-amber-600" };
  if (reviewCount >= 10 && avg >= 3.5) return { label: "Etibarlı", color: "bg-green-500/20 text-green-600" };
  if (reviewCount >= 3) return { label: "Aktiv", color: "bg-blue-500/20 text-blue-600" };
  return { label: "Yeni", color: "bg-muted text-muted-foreground" };
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPrivileged } = useIsAdminOrMod();
  const { toast } = useToast();
  const platform = usePlatformMode();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isModerationMode = searchParams.get("mode") === "moderation";
  const { isAdmin } = useIsAdmin();
  const showModerationBar = isModerationMode && isAdmin;

  const [showPhone, setShowPhone] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Check if e-commerce is enabled
  const { data: ecomSettings } = useQuery({
    queryKey: ["ecommerce-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ecommerce").maybeSingle();
      return (data?.value as any) || { enabled: false };
    },
  });

  // Check if listing is favorited
  const { data: favoriteData } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("listing_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const isFavorited = !!favoriteData;

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Daxil olun");
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("listing_id", id!).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ listing_id: id!, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast({ title: isFavorited ? "Seçilmişlərdən silindi" : "Seçilmişlərə əlavə edildi" });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  // Fetch listing
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch seller profile
  const { data: seller } = useQuery({
    queryKey: ["profile", listing?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", listing!.user_id).single();
      return data;
    },
    enabled: !!listing?.user_id,
  });

  // Fetch reviews for this seller
  const { data: sellerReviews = [] } = useQuery({
    queryKey: ["reviews", listing?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("reviewed_user_id", listing!.user_id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!listing?.user_id,
  });

  // Fetch comments for this listing
  const { data: comments = [] } = useQuery({
    queryKey: ["reel-comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("listing_id", id!)
        .order("created_at", { ascending: true });
      if (!data) return [];
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(c => ({ ...c, profile: profileMap.get(c.user_id) }));
    },
    enabled: !!id,
  });

  // Fetch store if listing belongs to one
  const { data: store } = useQuery({
    queryKey: ["store", listing?.store_id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", listing!.store_id!).single();
      return data;
    },
    enabled: !!listing?.store_id,
  });

  // Fetch store reviews (avg rating)
  const { data: storeOwnerReviews = [] } = useQuery({
    queryKey: ["store-owner-reviews", store?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("rating").eq("reviewed_user_id", store!.user_id);
      return data || [];
    },
    enabled: !!store?.user_id,
  });

  const storeAvgRating = storeOwnerReviews.length > 0
    ? storeOwnerReviews.reduce((s: number, r: any) => s + r.rating, 0) / storeOwnerReviews.length
    : 0;

  // Fetch similar listings
  const { data: similarListings = [] } = useQuery({
    queryKey: ["similar", listing?.category, id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*")
        .eq("category", listing!.category).eq("is_active", true)
        .neq("id", id!).order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!listing?.category,
  });

  // Check if current user follows the seller
  const { data: isFollowingSeller } = useQuery({
    queryKey: ["user-follow", listing?.user_id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_followers")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("followed_id", listing!.user_id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!listing?.user_id && !!user && user.id !== listing?.user_id,
  });

  const toggleFollowSeller = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Auth required");
      if (isFollowingSeller) {
        await supabase.from("user_followers").delete().eq("follower_id", user.id).eq("followed_id", listing.user_id);
      } else {
        await supabase.from("user_followers").insert({ follower_id: user.id, followed_id: listing.user_id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-follow", listing?.user_id, user?.id] });
      toast({ title: isFollowingSeller ? "İzləmə dayandırıldı" : "İzləyirsən" });
    },
  });

  // Fetch category fields for label mapping
  const { data: categoryFieldDefs = [] } = useQuery({
    queryKey: ["category-fields-detail", listing?.category],
    queryFn: async () => {
      const { data } = await supabase.from("category_fields").select("field_name, field_label").eq("category_slug", listing!.category).eq("is_active", true);
      return data || [];
    },
    enabled: !!listing?.category,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !commentText.trim()) return;

      // Antispam check
      const { data: antispamData } = await supabase.from("site_settings").select("value").eq("key", "antispam").maybeSingle();
      if (antispamData?.value && Array.isArray((antispamData.value as any)?.words)) {
        const words = (antispamData.value as any).words as string[];
        const lowerText = commentText.toLowerCase();
        for (const word of words) {
          if (word.trim() && lowerText.includes(word.toLowerCase().trim())) {
            await supabase.rpc('notify_admins', {
              _event_type: 'antispam',
              _message: `İstifadəçi (${user?.email || user?.id}) şərhdə uyğunsuz sözə cəhd etdi: "${commentText}"`,
              _title: 'Söyüş / Təhqir cəhdi'
            });
            throw new Error("Şərhinizdə icazə verilməyən (uyğunsuz) sözlər var.");
          }
        }
      }

      await supabase.from("reel_comments").insert({ 
        listing_id: id!, 
        user_id: user.id, 
        content: commentText.trim(),
        parent_id: replyingTo?.id || null 
      });
    },
    onSuccess: () => {
      setCommentText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["reel-comments", id] });
      toast({ title: replyingTo ? "Cavab əlavə edildi" : "Şərh əlavə edildi" });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("reel_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reel-comments", id] });
      toast({ title: "Şərh silindi" });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  // Increment view count
  useQuery({
    queryKey: ["listing-view", id],
    queryFn: async () => {
      await supabase.from("listings").update({ views_count: (listing?.views_count || 0) + 1 }).eq("id", id!);
      return true;
    },
    enabled: !!listing,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">Elan tapılmadı</h2>
          <Button variant="outline" onClick={() => navigate("/products")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Elanlara qayıt
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = listing.image_urls?.length ? listing.image_urls : ["/placeholder.svg"];
  const avgRating = sellerReviews.length > 0 ? sellerReviews.reduce((s: number, r: any) => s + r.rating, 0) / sellerReviews.length : 0;
  const level = getUserLevel(sellerReviews.length, avgRating);

  // Share handler
  const handleShare = async () => {
    if (!listing) return;
    const shareData = {
      title: listing.title,
      text: listing.description || `Azərbaycanın pulsuz elan saytı Elan24-də buna bax: ${listing.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share error:", err);
          setShareOpen(true);
        }
      }
    } else {
      setShareOpen(true);
    }
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${listing.title} - ${window.location.href}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(listing.title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(listing.title)}`,
    copy: async () => {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link kopyalandı!" });
      setShareOpen(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${showModerationBar ? "pt-14" : ""}`}>
      {showModerationBar && (
        <ModerationToolbar 
          id={listing.id} 
          type="listing" 
          currentStatus={listing.status}
          userId={listing.user_id}
          title={listing.title}
        />
      )}
      <Header />
      <main className="container mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Geri qayıt
        </button>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Images */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-2xl bg-muted">
              <Carousel
                opts={{ startIndex: selectedImage, loop: images.length > 1 }}
                setApi={(api: CarouselApi) => {
                  api?.on("select", () => {
                    setSelectedImage(api.selectedScrollSnap());
                  });
                }}
              >
                <CarouselContent>
                  {images.map((img: string, i: number) => (
                    <CarouselItem key={i}>
                      <div className="relative aspect-[4/3] w-full">
                        <img
                          src={img}
                          alt={listing.title}
                          className="h-full w-full object-cover cursor-pointer"
                          onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
                        />
                        <WatermarkOverlay />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-3 bg-card/80 border-0 backdrop-blur-sm" />
                    <CarouselNext className="right-3 bg-card/80 border-0 backdrop-blur-sm" />
                  </>
                )}
              </Carousel>
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                {listing.is_premium && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/90 shadow-lg shadow-amber-500/30 backdrop-blur-sm">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                )}
                {listing.is_urgent && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 shadow-lg shadow-red-500/30 backdrop-blur-sm">
                    <Zap className="h-4 w-4 text-white fill-white" />
                  </div>
                )}
                {(listing.custom_fields as any)?._shipping_methods?.length > 0 ? (
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 shadow-lg backdrop-blur-sm">
                    <Truck className="h-3.5 w-3.5 text-white" />
                    <span className="text-[11px] font-bold text-white">Çatdırılma var</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 backdrop-blur-sm">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">Çatdırılma yoxdur</span>
                  </div>
                )}
                <Badge variant="secondary">{listing.condition}</Badge>
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-card/80 px-2 py-1 text-xs backdrop-blur-sm z-10 pointer-events-none">
                <Eye className="h-3 w-3" /> {listing.views_count} baxış
              </div>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === selectedImage ? "border-primary" : "border-border"}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Video preview */}
            {listing.video_url && (
              <button
                onClick={() => navigate(`/reels?id=${listing.id}`)}
                className="mt-3 relative w-full overflow-hidden rounded-xl bg-muted aspect-video group"
              >
                <video
                  src={listing.video_url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg">
                    <Play className="h-7 w-7 text-primary-foreground fill-primary-foreground" />
                  </div>
                </div>
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white font-medium">
                  Reels-də izlə
                </span>
              </button>
            )}

            <ImageViewer
              images={images}
              initialIndex={viewerIndex}
              open={viewerOpen}
              onOpenChange={setViewerOpen}
            />
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">{listing.title}</h1>
            <p className="mt-3 font-display text-3xl font-bold text-primary">
              {Number(listing.price).toLocaleString()} {listing.currency}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(listing.created_at)}</span>
              <Badge variant="outline">{listing.category}</Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                onClick={() => {
                  if (!user) { navigate("/auth"); return; }
                  toggleFavorite.mutate();
                }} 
                variant="outline" 
                className="gap-1.5"
                disabled={toggleFavorite.isPending}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-primary text-primary" : ""}`} />
                {isFavorited ? "Seçilmişlərdə" : "Seçilmişlərə əlavə et"}
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
              <ReportButton targetType="listing" targetId={listing.id} />
              {user && user.id === listing.user_id && (
                <>
                  <Button variant="outline" size="icon" asChild>
                    <Link to={`/create-listing?edit=${listing.id}`}><Edit2 className="h-4 w-4" /></Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Elanı silmək istəyirsiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          await supabase.from("listings").delete().eq("id", listing.id);
                          toast({ title: "Elan silindi" });
                          navigate("/profile");
                        }}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mt-6">
                <h3 className="font-display text-sm font-semibold text-foreground">Təsvir</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
              </div>
            )}

            {/* Details Table */}
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-foreground">Məhsul məlumatları</h3>
              <div className="space-y-2 text-sm">
                <DetailRow label="Kateqoriya" value={listing.category} />
                <DetailRow label="Vəziyyət" value={listing.condition} />
                <DetailRow label="Şəhər" value={listing.location} />
                <DetailRow label="Valyuta" value={listing.currency} />
                <DetailRow label="Baxış sayı" value={String(listing.views_count)} />
                <DetailRow label="Yerləşdirmə tarixi" value={new Date(listing.created_at).toLocaleDateString("az")} />
                {listing.is_buyable && (
                  <DetailRow label="Satış" value="Birbaşa alış mümkündür" />
                )}
                {/* Custom fields - skip internal underscore-prefixed keys and complex objects */}
                {(listing as any).custom_fields && Object.entries((listing as any).custom_fields).map(([key, val]) => {
                  if (!val) return null;
                  if (key.startsWith("_")) return null;
                  if (typeof val === "object") return null;
                  const fieldDef = categoryFieldDefs.find((f: any) => f.field_name === key);
                  return <DetailRow key={key} label={fieldDef?.field_label || key} value={String(val)} />;
                })}
              </div>
            </div>

            {/* Shipping Methods */}
            {(listing.custom_fields as any)?._shipping_methods?.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Çatdırılma üsulları
                </h3>
                <div className="space-y-2">
                  {((listing.custom_fields as any)._shipping_methods as any[]).map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-foreground">{m.name || "Çatdırılma"}</p>
                        {m.estimated_days && (
                          <p className="text-xs text-muted-foreground">{m.estimated_days}</p>
                        )}
                      </div>
                      <p className="ml-2 font-bold text-primary">
                        {Number(m.price || 0) === 0 ? "Pulsuz" : `${Number(m.price).toLocaleString()} ${listing.currency}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seller Card - above reviews */}
        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-card max-w-2xl">
          {store ? (
            /* Store-based listing: show only store info once */
            <>
              <Link
                to={`/store/${store.id}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card border border-border">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{store.name}</p>
                    {store.is_premium && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span>{storeAvgRating.toFixed(1)}</span>
                    <span>·</span>
                    <span>{storeOwnerReviews.length} rəy</span>
                    {store.city && <><span>·</span><span>{store.city}</span></>}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>

              <div className="mt-4 flex flex-col gap-2">
                {listing.is_buyable && user?.id !== listing.user_id && (
                  <Button 
                    className="w-full gap-2 h-12 text-lg font-bold shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                    onClick={() => {
                      if (!user) { navigate("/auth"); return; }
                      setCheckoutOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" /> İndi al
                  </Button>
                )}
                {user?.id !== listing.user_id && (
                  <Button 
                    variant={listing.is_buyable ? "outline" : "default"}
                    className={`w-full gap-2 h-12 text-lg font-bold ${!listing.is_buyable ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20' : ''}`}
                    onClick={() => {
                      if (!user) { navigate("/auth"); return; }
                    }}
                  >
                    <MessageSquare className="h-5 w-5" /> Mağaza ilə əlaqə
                  </Button>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  {showPhone ? (
                    <a href={`tel:${store.phone || seller?.phone || ''}`} className="flex-1">
                      <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                        <Phone className="h-4 w-4" />
                        {store.phone || seller?.phone || "Nömrə yoxdur"}
                      </Button>
                    </a>
                  ) : (
                    <Button className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => setShowPhone(true)}>
                      <Phone className="h-4 w-4" />
                      Nömrəni göstər
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={async () => {
                      if (!user) { navigate("/auth"); return; }
                      const { data: existing } = await supabase
                        .from("conversations")
                        .select("id")
                        .eq("listing_id", listing.id)
                        .eq("buyer_id", user.id)
                        .eq("seller_id", listing.user_id)
                        .maybeSingle();
                      if (existing) {
                        navigate(`/messages?c=${existing.id}`);
                      } else {
                        const { data: newConvo } = await supabase
                          .from("conversations")
                          .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.user_id })
                          .select("id")
                          .single();
                        if (newConvo) navigate(`/messages?c=${newConvo.id}`);
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4" /> Mesaj yaz
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Individual seller listing */
            <>
              <div className="flex items-center justify-between">
                <Link to={`/seller/${listing.user_id}`} className="group flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {seller?.full_name || "Adsız"}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span>{avgRating.toFixed(1)}</span>
                    <span>·</span>
                    <span>{sellerReviews.length} rəy</span>
                    {seller?.city && <><span>·</span><span>{seller.city}</span></>}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
                  {user && user.id !== listing.user_id && (
                    <Button
                      variant={isFollowingSeller ? "outline" : "default"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        if (!user) { navigate("/auth"); return; }
                        toggleFollowSeller.mutate();
                      }}
                      disabled={toggleFollowSeller.isPending}
                    >
                      {isFollowingSeller ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {isFollowingSeller ? "İzləyirsən" : "İzlə"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Buy button for individual seller buyable listings */}
              {listing.is_buyable && user?.id !== listing.user_id && (
                <div className="mt-4">
                  <Button 
                    className="w-full gap-2 h-12 text-lg font-bold shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                    onClick={() => {
                      if (!user) { navigate("/auth"); return; }
                      setCheckoutOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" /> İndi al
                  </Button>
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                {showPhone ? (
                  <a href={`tel:${seller?.phone || ''}`} className="flex-1">
                    <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
                      <Phone className="h-4 w-4" />
                      {seller?.phone || "Nömrə yoxdur"}
                    </Button>
                  </a>
                ) : (
                  <Button className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => setShowPhone(true)}>
                    <Phone className="h-4 w-4" />
                    Nömrəni göstər
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    if (!user) { navigate("/auth"); return; }
                    const { data: existing } = await supabase
                      .from("conversations")
                      .select("id")
                      .eq("listing_id", listing.id)
                      .eq("buyer_id", user.id)
                      .eq("seller_id", listing.user_id)
                      .maybeSingle();
                    if (existing) {
                      navigate(`/messages?c=${existing.id}`);
                    } else {
                      const { data: newConvo } = await supabase
                        .from("conversations")
                        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.user_id })
                        .select("id")
                        .single();
                      if (newConvo) navigate(`/messages?c=${newConvo.id}`);
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" /> Mesaj yaz
                </Button>
              </div>
            </>
          )}
        </div>


        {/* Comments */}
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Şərhlər ({comments.length})
          </h2>

          {/* Comment Form */}
          {user ? (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{replyingTo.name}</span> istifadəçisinə cavab yazırsınız...
                  </span>
                  <button onClick={() => setReplyingTo(null)} className="flex items-center gap-1 hover:text-foreground">
                    <X className="h-3 w-3" /> Ləğv et
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <Input
                  placeholder={replyingTo ? "Cavabınız..." : "Şərhiniz..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !!commentText.trim() && !addComment.isPending) {
                      addComment.mutate();
                    }
                  }}
                  className="bg-transparent"
                />
                <Button
                  onClick={() => addComment.mutate()}
                  disabled={!commentText.trim() || addComment.isPending}
                  className="shrink-0 gap-2"
                >
                  <Send className="h-4 w-4" /> Göndər
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-border bg-card p-4 text-center">
              <button onClick={() => navigate("/auth")} className="text-sm font-medium text-primary hover:underline">
                Şərh yazmaq üçün daxil olun
              </button>
            </div>
          )}

          {comments.length > 0 ? (
            <div className="space-y-6">
              {comments.filter((c: any) => !c.parent_id).map((c: any) => (
                <div key={c.id} className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground ring-1 ring-border">
                      {c.profile?.avatar_url ? (
                        <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (c.profile?.full_name || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.profile?.full_name || "İstifadəçi"}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                      </div>
                      <p className="mt-1 break-words text-sm text-foreground">{c.content}</p>
                      {user && (
                        <button 
                          onClick={() => setReplyingTo({ id: c.id, name: c.profile?.full_name || "İstifadəçi" })}
                          className="mt-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                        >
                          Cavab yaz
                        </button>
                      )}
                      {(user?.id === c.user_id || isPrivileged) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="mt-1 ml-4 text-[10px] font-semibold text-destructive hover:underline flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              Sil
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Şərhi silmək istəyirsiniz?</AlertDialogTitle>
                              <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteComment.mutate(c.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {comments.filter((reply: any) => reply.parent_id === c.id).length > 0 && (
                    <div className="ml-10 flex flex-col gap-3 border-l-2 border-muted/50 pl-4">
                      {comments.filter((reply: any) => reply.parent_id === c.id).map((reply: any) => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border">
                            {reply.profile?.avatar_url ? (
                              <img src={reply.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (reply.profile?.full_name || "?")[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {reply.profile?.full_name || "İstifadəçi"}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(reply.created_at)}</span>
                            </div>
                            <p className="mt-1 break-words text-sm text-foreground">{reply.content}</p>
                            {(user?.id === reply.user_id || isPrivileged) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="mt-1 text-[10px] font-semibold text-destructive hover:underline flex items-center gap-1">
                                    <Trash2 className="h-3 w-3" />
                                    Sil
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Şərhi silmək istəyirsiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteComment.mutate(reply.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hələ şərh yoxdur. İlk şərhi siz yazın!</p>
          )}
        </div>

        {/* Similar Listings */}
        {similarListings.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-display text-xl font-bold text-foreground">Oxşar elanlar</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {similarListings.map((l: any) => (
                <ListingCard
                  key={l.id} id={l.id} title={l.title}
                  price={`${Number(l.price).toLocaleString()} ${l.currency}`}
                  location={l.location} time={formatTime(l.created_at)}
                  image={l.image_urls?.[0] || "/placeholder.svg"}
                  condition={l.condition} isPremium={l.is_premium} isUrgent={l.is_urgent} isBuyable={l.is_buyable}
                  numericPrice={Number(l.price)} currency={l.currency} userId={l.user_id} customFields={l.custom_fields}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      {listing && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          listing={{
            id: listing.id,
            title: listing.title,
            price: Number(listing.price),
            currency: listing.currency,
            user_id: listing.user_id,
            store_id: listing.store_id,
            image_urls: listing.image_urls,
            custom_fields: listing.custom_fields,
          }}
        />
      )}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paylaş</DialogTitle>
            <DialogDescription>
              Bu elanı dostlarınızla paylaşın
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {/* QR Code Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border-4 border-white bg-white p-4 shadow-xl ring-1 ring-black/5">
                <img
                  src={`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(window.location.href)}&choe=UTF-8`}
                  alt="QR Code"
                  className="h-44 w-44"
                />
              </div>
              <p className="text-[12px] font-semibold text-foreground tracking-tight">QR kodu skan et və ya kopyala</p>
            </div>

            {/* Social Icons Grid */}
            <div className="grid w-full grid-cols-4 gap-2">
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted transition-colors text-green-600 font-medium"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="text-[10px]">WhatsApp</span>
              </a>
              <a
                href={shareLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted transition-colors text-blue-500 font-medium"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Send className="h-5 w-5" />
                </div>
                <span className="text-[10px]">Telegram</span>
              </a>
              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted transition-colors text-blue-700 font-medium"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700/10">
                  <Facebook className="h-5 w-5" />
                </div>
                <span className="text-[10px]">Facebook</span>
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted transition-colors text-foreground font-medium"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
                  <Twitter className="h-5 w-5" />
                </div>
                <span className="text-[10px]">X (Twitter)</span>
              </a>
            </div>

            {/* Link Copy Section */}
            <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
              <input
                readOnly
                value={window.location.href}
                className="flex-1 bg-transparent text-xs text-foreground outline-none truncate"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 hover:bg-primary/10 hover:text-primary"
                onClick={shareLinks.copy}
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[10px]">Kopyala</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default ProductDetail;
