import { Heart, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ListingCardProps {
  id: string;
  title: string;
  price: string;
  location: string;
  time: string;
  image: string;
  condition?: string;
  isPremium?: boolean;
  isUrgent?: boolean;
}

const ListingCard = ({ id, title, price, location, time, image, condition, isPremium, isUrgent }: ListingCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      if (!user) throw new Error("Auth required");
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
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
        <div className="absolute left-2 top-2 flex gap-1.5">
          {isPremium && (
            <Badge className="bg-gradient-primary text-primary-foreground border-0 text-xs">Premium</Badge>
          )}
          {isUrgent && (
            <Badge variant="destructive" className="text-xs">Təcili</Badge>
          )}
        </div>
        {condition && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">{condition}</Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-2 font-display text-lg font-bold text-foreground">{price}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {time}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
