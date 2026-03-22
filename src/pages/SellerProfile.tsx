import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User, MapPin, Star, Calendar, Package, ArrowLeft, Loader2, Store, Crown, ExternalLink, Send
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";

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

const SellerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", id).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch seller's store (if any)
  const { data: sellerStore } = useQuery({
    queryKey: ["seller-store", id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("user_id", id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch seller's listings
  const { data: listings = [] } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch stores for listing badges
  const storeIds = [...new Set(listings.map(l => l.store_id).filter(Boolean))] as string[];
  const { data: storesMap = {} } = useQuery({
    queryKey: ["stores-map-seller", storeIds.join(",")],
    queryFn: async () => {
      if (storeIds.length === 0) return {};
      const { data } = await supabase.from("stores").select("id, name, logo_url").in("id", storeIds);
      const map: Record<string, { name: string; logo_url: string | null }> = {};
      data?.forEach(s => { map[s.id] = { name: s.name, logo_url: s.logo_url }; });
      return map;
    },
    enabled: storeIds.length > 0,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["seller-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_user_id", id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch reviewer profiles
  const reviewerIds = reviews.map((r: any) => r.reviewer_id);
  const { data: reviewerProfiles = [] } = useQuery({
    queryKey: ["reviewer-profiles-seller", reviewerIds],
    queryFn: async () => {
      if (reviewerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("user_id", reviewerIds);
      return data || [];
    },
    enabled: reviewerIds.length > 0,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;
  const level = getUserLevel(reviews.length, avgRating);
  const getReviewerName = (uid: string) =>
    (reviewerProfiles as any[]).find((p) => p.user_id === uid)?.full_name || "Adsız";

  const canReview = user && user.id !== id && !reviews.some((r: any) => r.reviewer_id === user.id);

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Auth required");
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        reviewed_user_id: id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
      // Notify seller of new review
      if (profile) {
        const stars = "⭐".repeat(reviewRating);
        await supabase.from("notifications").insert({
          user_id: id,
          title: `${stars} Yeni rəy`,
          message: `Profiliniz üçün ${reviewRating}/5 ulduz reytinq aldınız.${reviewComment ? `\n\nŞərh: ${reviewComment}` : ""}`,
          type: reviewRating >= 4 ? "success" : reviewRating >= 3 ? "info" : "warning",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Rəyiniz əlavə edildi!" });
      setReviewComment("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", id] });
    },
    onError: (err: any) => {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    },
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center py-32 text-center">
          <User className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Satıcı tapılmadı</p>
          <Button asChild className="mt-6">
            <Link to="/products">Elanlara qayıt</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link to="/products" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Geri qayıt
        </Link>

        {/* Profile Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {profile.full_name || "Adsız satıcı"}
                </h1>
                <Badge className={`${level.color} border-0`}>{level.label}</Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {avgRating.toFixed(1)} ({reviews.length} rəy)
                </span>
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {profile.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(profile.created_at).toLocaleDateString("az")} tarixindən
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> {listings.length} elan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Card */}
        {sellerStore && (
          <Link
            to={`/store/${sellerStore.id}`}
            className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
          >
            {/* Cover strip */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              {sellerStore.logo_url ? (
                <img src={sellerStore.logo_url} alt={sellerStore.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Store className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-base font-semibold text-foreground">{sellerStore.name}</h3>
                {sellerStore.is_premium && (
                  <Badge className="gap-0.5 bg-gradient-primary text-primary-foreground text-[9px] px-1.5 py-0">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {sellerStore.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sellerStore.city}</span>
                )}
                {sellerStore.description && (
                  <span className="truncate">{sellerStore.description}</span>
                )}
              </div>
            </div>

            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {/* Listings */}
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Satıcının elanları ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Bu satıcının aktiv elanı yoxdur</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {listings.map((l: any) => {
                const st = l.store_id ? storesMap[l.store_id] : undefined;
                return (
                  <ListingCard
                    key={l.id}
                    id={l.id}
                    title={l.title}
                    price={`${Number(l.price).toLocaleString()} ${l.currency}`}
                    location={l.location}
                    time={formatTime(l.created_at)}
                    image={l.image_urls?.[0] || "/placeholder.svg"}
                    condition={l.condition}
                    isPremium={l.is_premium}
                    isUrgent={l.is_urgent}
                    storeId={l.store_id}
                    storeName={st?.name}
                    storeLogo={st?.logo_url}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Rəylər ({reviews.length})
          </h2>

          {/* Review Form */}
          {canReview && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Satıcı haqqında rəy yazın</h3>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-6 w-6 transition-colors ${s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400/50"}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder="Satıcı haqqında rəyiniz..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} className="resize-none" />
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="mt-3 gap-2">
                <Send className="h-4 w-4" /> {submitReview.isPending ? "Göndərilir..." : "Rəy göndər"}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ rəy yoxdur</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r: any) => (
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
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SellerProfile;
