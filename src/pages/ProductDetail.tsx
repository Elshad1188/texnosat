import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Share2, MapPin, Clock, Star, Phone, MessageCircle, Shield, Eye, Loader2, Send, Store, ExternalLink, Edit2, Trash2, Crown, Zap, Gem, Play, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import ImageViewer from "@/components/ImageViewer";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import ReportButton from "@/components/ReportButton";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPhone, setShowPhone] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

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

  // Fetch reviewer profiles
  const reviewerIds = sellerReviews.map((r: any) => r.reviewer_id);
  const { data: reviewerProfiles = [] } = useQuery({
    queryKey: ["reviewer-profiles", reviewerIds],
    queryFn: async () => {
      if (reviewerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("user_id", reviewerIds);
      return data || [];
    },
    enabled: reviewerIds.length > 0,
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

  // Submit review
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Auth required");
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        reviewed_user_id: listing.user_id,
        listing_id: listing.id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
      // Notify seller of new review
      const stars = "⭐".repeat(reviewRating);
      await supabase.from("notifications").insert({
        user_id: listing.user_id,
        title: `${stars} Yeni rəy`,
        message: `"${listing.title}" elanınız üçün ${reviewRating}/5 ulduz reytinq aldınız.${reviewComment ? `\n\nŞərh: ${reviewComment}` : ""}`,
        type: reviewRating >= 4 ? "success" : reviewRating >= 3 ? "info" : "warning",
        is_read: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Rəyiniz əlavə edildi!" });
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", listing?.user_id] });
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
  const getReviewerName = (uid: string) => (reviewerProfiles as any[]).find((p) => p.user_id === uid)?.full_name || "Adsız";
  const canReview = user && user.id !== listing.user_id && !sellerReviews.some((r: any) => r.reviewer_id === user.id);

  return (
    <div className="min-h-screen bg-background">
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
                      <img
                        src={img}
                        alt={listing.title}
                        className="aspect-[4/3] w-full object-cover cursor-pointer"
                        onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
                      />
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
              <div className="absolute left-3 top-3 flex gap-1.5 z-10 pointer-events-none">
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
              <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
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
                {/* Custom fields */}
                {(listing as any).custom_fields && Object.entries((listing as any).custom_fields).map(([key, val]) => {
                  if (!val) return null;
                  const fieldDef = categoryFieldDefs.find((f: any) => f.field_name === key);
                  return <DetailRow key={key} label={fieldDef?.field_label || key} value={String(val)} />;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Seller Card - above reviews */}
        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-card max-w-2xl">
          <div className="flex items-center justify-between">
            <Link to={`/seller/${listing.user_id}`} className="group flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{seller?.full_name || "Adsız"}</p>
                <Badge className={`${level.color} border-0 text-[10px]`}>{level.label}</Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span>{avgRating.toFixed(1)}</span>
                <span>·</span>
                <span>{sellerReviews.length} rəy</span>
                {seller?.city && <><span>·</span><span>{seller.city}</span></>}
              </div>
            </Link>
            <div className="flex items-center gap-2">
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
              <Link to={`/seller/${listing.user_id}`} className="text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Store Link */}
          {store && (
            <Link
              to={`/store/${store.id}`}
              className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
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
                  <p className="truncate text-sm font-semibold text-foreground">{store.name}</p>
                  {store.is_premium && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span>{storeAvgRating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{storeOwnerReviews.length} rəy</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => setShowPhone(!showPhone)}>
              <Phone className="h-4 w-4" />
              {showPhone ? (seller?.phone || "Nömrə yoxdur") : "Nömrəni göstər"}
            </Button>
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

        {/* Reviews */}
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Satıcı rəyləri ({sellerReviews.length})
          </h2>

          {/* Review Form */}
          {canReview && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Rəy yazın</h3>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-6 w-6 ${s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Şərhinizi yazın..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="mt-3 gap-2">
                <Send className="h-4 w-4" /> {submitReview.isPending ? "Göndərilir..." : "Rəy göndər"}
              </Button>
            </div>
          )}

          {sellerReviews.length > 0 ? (
            <div className="space-y-3">
              {sellerReviews.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {getReviewerName(r.reviewer_id)[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{getReviewerName(r.reviewer_id)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(r.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hələ rəy yoxdur</p>
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
                  condition={l.condition} isPremium={l.is_premium} isUrgent={l.is_urgent}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
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
