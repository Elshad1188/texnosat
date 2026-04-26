import { Heart, MapPin, Clock, Store, Crown, Zap, GitCompareArrows, ChevronLeft, ChevronRight, ShoppingCart, Truck, BedDouble, Maximize2, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompare } from "@/contexts/CompareContext";
import WatermarkOverlay from "@/components/WatermarkOverlay";
import CheckoutDialog from "@/components/CheckoutDialog";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/contexts/LanguageContext";

interface ListingCardProps {
  id: string;
  title: string;
  price: string;
  numericPrice?: number;
  currency?: string;
  userId?: string;
  customFields?: any;
  location: string;
  time: string;
  image: string;
  images?: string[];
  condition?: string;
  isPremium?: boolean;
  isUrgent?: boolean;
  isBuyable?: boolean;
  storeId?: string | null;
  storeName?: string;
  storeLogo?: string | null;
  imageSlider?: boolean;
}

const ListingCard = ({ id, title, price, numericPrice, currency, userId, customFields, location, time, image, images, condition, isPremium, isUrgent, isBuyable, storeId, storeName, storeLogo, imageSlider }: ListingCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toggle, has } = useCompare();
  const isComparing = has(id);

  const allImages = images && images.length > 1 ? images : [image];
  const hasSlider = imageSlider && allImages.length > 1;
  const [currentImg, setCurrentImg] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Auto-rotate images
  useEffect(() => {
    if (!hasSlider) return;
    const timer = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % allImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [hasSlider, allImages.length]);

  const { data: favoriteData } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("listing_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isFavorited = !!favoriteData;

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("auth.login_required", "Daxil olun"));
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("listing_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ listing_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
      onClick={() => navigate(`/product/${id}`)}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden bg-muted"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={allImages[currentImg] || image}
          alt={title}
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        <WatermarkOverlay />

        {/* Slider dots */}
        {hasSlider && allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentImg(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentImg ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Arrows on hover */}
        {hasSlider && hovered && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImg((currentImg - 1 + allImages.length) % allImages.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImg((currentImg + 1) % allImages.length); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-sm"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!user) { navigate("/auth"); return; }
            toggleFavorite.mutate();
          }}
          disabled={toggleFavorite.isPending}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-colors hover:bg-card"
        >
          <Heart className={`h-4 w-4 ${isFavorited ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {isBuyable && (
            <div className="flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 shadow-lg backdrop-blur-sm">
              <ShoppingCart className="h-3 w-3 text-primary-foreground" />
              <span className="text-[10px] font-bold text-primary-foreground">{t("card.for_sale")}</span>
            </div>
          )}
          {customFields?._shipping_methods?.length > 0 ? (
            <div
              title={t("card.delivery_available")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/90 shadow-lg shadow-emerald-500/30 backdrop-blur-sm"
            >
              <Truck className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div
              title={t("card.delivery_unavailable")}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm"
            >
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          {isPremium && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/90 shadow-lg shadow-amber-500/30 backdrop-blur-sm">
              <Crown className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          {isUrgent && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 shadow-lg shadow-red-500/30 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5 text-white fill-white" />
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <p className="font-display text-lg font-bold text-foreground">{price}</p>
        {customFields?.deal_type && (
          <p className="mt-0.5 text-[11px] font-medium text-primary">{customFields.deal_type}</p>
        )}

        {/* Real estate parameters */}
        {(customFields?.rooms || customFields?.area_m2 || customFields?.floor) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {customFields?.rooms && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                <BedDouble className="h-3 w-3 text-primary" />
                {customFields.rooms} otaq
              </span>
            )}
            {customFields?.area_m2 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                <Maximize2 className="h-3 w-3 text-primary" />
                {customFields.area_m2} m²
              </span>
            )}
            {customFields?.floor && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                <Building2 className="h-3 w-3 text-primary" />
                {customFields.floor}{customFields?.total_floors ? `/${customFields.total_floors}` : ""}
              </span>
            )}
          </div>
        )}

        {title && (
          <h3 className="mt-2 line-clamp-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
        )}

        {/* Store Badge */}
        {storeId && storeName && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/store/${storeId}`);
            }}
            className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 transition-colors hover:bg-muted"
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded bg-card">
              {storeLogo ? (
                <img src={storeLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-2.5 w-2.5 text-muted-foreground" />
              )}
            </div>
            <span className="truncate text-[11px] font-medium text-muted-foreground">{storeName}</span>
          </button>
        )}

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {time}
          </span>
        </div>

        {/* Buy / Compare buttons */}
        {isBuyable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!user) { navigate("/auth"); return; }
              setCheckoutOpen(true);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t("card.buy")}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle({ id, title, price, image, location, condition });
          }}
          className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
            isComparing
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          }`}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {isComparing ? t("card.comparing") : t("card.compare")}
        </button>
      </div>

      {isBuyable && numericPrice != null && userId && createPortal(
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          listing={{
            id,
            title,
            price: numericPrice,
            currency: currency || "₼",
            user_id: userId,
            store_id: storeId || null,
            image_urls: images && images.length > 0 ? images : [image],
            custom_fields: customFields,
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default ListingCard;
