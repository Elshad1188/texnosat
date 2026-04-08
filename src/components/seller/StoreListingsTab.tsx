import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Eye, Rocket, Trash2 } from "lucide-react";

interface StoreListingsTabProps {
  listings: any[];
  onBoost: (id: string) => void;
}

const StoreListingsTab = ({ listings, onBoost }: StoreListingsTabProps) => {
  const queryClient = useQueryClient();

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-dashboard-listings"] });
      toast({ title: "Elan silindi" });
    },
  });

  const toggleListing = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("listings").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-dashboard-listings"] });
      toast({ title: "Elan yeniləndi" });
    },
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Elanlar ({listings.length})</h2>
        <Button size="sm" className="gap-1 h-8 text-xs bg-gradient-primary text-primary-foreground" asChild>
          <Link to="/create-listing"><Plus className="h-3 w-3" />Əlavə et</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Mağazada hələ elan yoxdur</p>
            <Button size="sm" className="mt-4 bg-gradient-primary text-primary-foreground" asChild>
              <Link to="/create-listing">İlk elanı yerləşdir</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {listings.map((l) => (
            <Card key={l.id} className="overflow-hidden">
              <CardContent className="flex items-center gap-2.5 p-2.5">
                <Link to={`/product/${l.id}`} className="shrink-0">
                  {l.image_urls?.[0] ? (
                    <img src={l.image_urls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${l.id}`} className="text-xs font-semibold text-foreground hover:text-primary line-clamp-1">
                    {l.title}
                  </Link>
                  <p className="text-xs font-bold text-primary">{l.price} {l.currency}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Eye className="h-2.5 w-2.5" />{l.views_count}
                    </span>
                    <Badge variant={l.is_active ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">
                      {l.is_active ? "Aktiv" : "Deaktiv"}
                    </Badge>
                    {l.stock > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        Stok: {l.stock}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500"
                    onClick={() => onBoost(l.id)}>
                    <Rocket className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => toggleListing.mutate({ id: l.id, is_active: !l.is_active })}>
                    <Eye className={`h-3.5 w-3.5 ${l.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Elanı silmək istəyirsiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteListing.mutate(l.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreListingsTab;
