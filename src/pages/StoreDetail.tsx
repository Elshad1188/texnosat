import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Store, MapPin, Phone, Clock, Crown, MessageCircle, Loader2, ArrowLeft,
  Users, UserPlus, UserMinus, Settings, Star, Send, Trash2, Instagram
} from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdminOrMod, useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocation } from "react-router-dom";
import StoreBoostDialog from "@/components/StoreBoostDialog";
import ModerationToolbar from "@/components/admin/ModerationToolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Az əvvəl";
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(dateStr).toLocaleDateString("az");
}

const StoreDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const { isPrivileged } = useIsAdminOrMod();
  const location = useLocation();
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [searchParams] = useSearchParams();
  const isModerationMode = searchParams.get("mode") === "moderation";
  const { isAdmin } = useIsAdmin();
  const showModerationBar = isModerationMode && isAdmin;
  const fromProfile = location.state?.fromProfile === true;

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const isOwner = !!user && !!store && store.user_id === user.id;

  const { data: listings = [] } = useQuery({
    queryKey: ["store-listings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings").select("*")
        .eq("store_id", id).eq("is_active", true)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["store-reviews", store?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("reviewed_user_id", store!.user_id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!store?.user_id,
  });

  const reviewerIds = reviews.map((r: any) => r.reviewer_id);
  const { data: reviewerProfiles = [] } = useQuery({
    queryKey: ["reviewer-profiles", reviewerIds],
    queryFn: async () => {
      if (reviewerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("user_id", reviewerIds);
      return data || [];
    },
    enabled: reviewerIds.length > 0,
  });

  const getReviewerName = (uid: string) =>
    (reviewerProfiles as any[]).find((p) => p.user_id === uid)?.full_name || "Adsız";

  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;

  const canReview = user && store && user.id !== store.user_id && !reviews.some((r: any) => r.reviewer_id === user.id);

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user || !store) throw new Error("Auth required");
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        reviewed_user_id: store.user_id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
      // Notify store owner
      const stars = "⭐".repeat(reviewRating);
      await supabase.from("notifications").insert({
        user_id: store.user_id,
        title: `${stars} Yeni rəy`,
        message: `"${store.name}" mağazanız üçün ${reviewRating}/5 ulduz reytinq aldınız.${reviewComment ? `\n\nŞərh: ${reviewComment}` : ""}`,
        type: reviewRating >= 4 ? "success" : reviewRating >= 3 ? "info" : "warning",
        is_read: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Rəyiniz əlavə edildi!" });
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["store-reviews", store?.user_id] });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rəy silindi" });
      queryClient.invalidateQueries({ queryKey: ["store-reviews", store?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", store?.user_id] });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["store-followers-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("store_followers").select("id", { count: "exact", head: true })
        .eq("store_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["store-following", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_followers").select("id")
        .eq("store_id", id!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await supabase.from("store_followers").delete().eq("store_id", id!).eq("user_id", user!.id);
      } else {
        await supabase.from("store_followers").insert({ store_id: id!, user_id: user!.id });
        // Notify the store owner of new follower
        if (store && store.user_id !== user!.id) {
          await supabase.from("notifications").insert({
            user_id: store.user_id,
            title: "🏪 Yeni abunəçi",
            message: `Biri "${store.name}" mağazanıza abunə oldu.`,
            type: "info",
            is_read: false,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-followers-count", id] });
      queryClient.invalidateQueries({ queryKey: ["store-following", id, user?.id] });
      toast({ title: isFollowing ? "Abunəlikdən çıxdınız" : "Mağazaya abunə oldunuz" });
    },
  });

  const handleMessageStore = async () => {
    if (!user) { toast({ title: "Mesaj üçün daxil olun", variant: "destructive" }); navigate("/auth"); return; }
    if (!store) return;
    try {
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .eq("buyer_id", user.id).eq("seller_id", store.user_id)
        .is("listing_id", null).maybeSingle();
      if (existing) {
        navigate(`/messages?c=${existing.id}`);
      } else {
        const { data: newConvo, error } = await supabase
          .from("conversations").insert({ buyer_id: user.id, seller_id: store.user_id })
          .select("id").single();
        if (error) throw error;
        navigate(`/messages?c=${newConvo.id}`);
      }
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center py-32 text-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Mağaza tapılmadı</p>
          <Button asChild className="mt-6"><Link to="/stores">Mağazalara qayıt</Link></Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${showModerationBar ? "pt-14" : ""}`}>
      {showModerationBar && (
        <ModerationToolbar 
          id={store.id} 
          type="store" 
          currentStatus={store.status}
          userId={store.user_id}
          title={store.name}
        />
      )}
      <Header />

      <div className="relative h-48 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-64">
        {store.cover_url && <img src={store.cover_url} alt="Cover" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <main className="container mx-auto px-4">
        <div className="relative -mt-16 mb-8 rounded-xl border border-border bg-card p-6 shadow-lg">
          <Link to="/stores" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted shadow-md">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{store.name}</h1>
                {store.is_premium && (
                  <Badge className="gap-1 bg-gradient-primary text-primary-foreground">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>

              {store.description && <p className="mt-2 text-sm text-muted-foreground">{store.description}</p>}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {store.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {store.city}{store.address && `, ${store.address}`}</span>}
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" /> {store.phone}
                  </a>
                )}
                {store.working_hours && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {store.working_hours}</span>}
                {(store as any).instagram_url && (
                  <a
                    href={(store as any).instagram_url.startsWith('http') ? (store as any).instagram_url : `https://instagram.com/${(store as any).instagram_url.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                  >
                    <Instagram className="h-4 w-4" /> {(store as any).instagram_url.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}
                  </a>
                )}
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {followersCount} abunəçi</span>
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)} ({reviews.length} rəy)</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={cn(
                        "gap-1 border-0 hover:opacity-90",
                        store.is_premium ? "bg-muted text-muted-foreground" : "bg-gradient-primary text-primary-foreground"
                      )}
                      onClick={() => !store.is_premium && setShowBoostDialog(true)}
                      disabled={store.is_premium}
                    >
                      <Crown className="h-4 w-4" />
                      {store.is_premium ? "Premium aktivdir" : "Yüksəlt"}
                    </Button>
                    {fromProfile && (
                      <Button size="sm" variant="outline" className="gap-1" asChild>
                        <Link to="/create-store"><Settings className="h-4 w-4" />Redaktə et</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90"
                      onClick={handleMessageStore}
                    >
                      <MessageCircle className="h-4 w-4" />Mağazaya mesaj yaz
                    </Button>
                    {user && (
                      <Button
                        variant={isFollowing ? "outline" : "secondary"}
                        className="gap-1"
                        onClick={() => toggleFollow.mutate()}
                        disabled={toggleFollow.isPending}
                      >
                        {isFollowing ? <><UserMinus className="h-4 w-4" />Abunəlikdən çıx</> : <><UserPlus className="h-4 w-4" />Abunə ol</>}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Mağaza elanları ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Bu mağazada hələ elan yoxdur</p>
              {isOwner && (
                <Button className="mt-4 bg-gradient-primary text-primary-foreground" asChild>
                  <Link to="/create-listing">Elan yerləşdir</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id} id={listing.id} title={listing.title}
                  price={`${listing.price} ${listing.currency}`}
                  location={listing.location}
                  time={new Date(listing.created_at).toLocaleDateString("az-AZ")}
                  image={listing.image_urls?.[0] || "/placeholder.svg"}
                  condition={listing.condition} isPremium={listing.is_premium}
                  isUrgent={listing.is_urgent} isBuyable={(listing as any).is_buyable}
                  storeId={store.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Mağaza rəyləri ({reviews.length})
          </h2>

          {/* Review Form */}
          {canReview && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Mağaza haqqında rəy yazın</h3>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-6 w-6 transition-colors ${s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400/50"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Mağaza haqqında rəyiniz..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} className="resize-none" />
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="mt-3 gap-2">
                <Send className="h-4 w-4" /> {submitReview.isPending ? "Göndərilir..." : "Rəy göndər"}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ rəy yoxdur</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {getReviewerName(r.reviewer_id)[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{getReviewerName(r.reviewer_id)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(r.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>}
                  
                  {(user?.id === r.reviewer_id || store.user_id === user?.id || isPrivileged) && (
                    <div className="mt-3 flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Sil</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rəyi silmək istəyirsiniz?</AlertDialogTitle>
                            <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteReview.mutate(r.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      {store && (
        <StoreBoostDialog
          storeId={store.id}
          storeName={store.name}
          open={showBoostDialog}
          onOpenChange={setShowBoostDialog}
        />
      )}
    </div>
  );
};

export default StoreDetail;
