import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Crown, Edit2, Eye, MapPin, Phone, Clock, Trash2 } from "lucide-react";

interface StoreHeaderProps {
  store: any;
  userId: string;
}

const StoreHeader = ({ store, userId }: StoreHeaderProps) => {
  return (
    <Card className="mb-6 overflow-hidden">
      {store.cover_url && (
        <img src={store.cover_url} alt="" className="h-28 sm:h-32 w-full object-cover" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 border-2 border-card shadow shrink-0">
            <AvatarImage src={store.logo_url || ""} />
            <AvatarFallback className="bg-secondary font-bold text-lg">
              {store.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground truncate">{store.name}</h1>
              {store.is_premium && (
                <Badge className="gap-1 bg-gradient-primary text-primary-foreground text-[10px]">
                  <Crown className="h-3 w-3" /> Premium
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {store.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />{store.city}
                </span>
              )}
              {store.phone && (
                <span className="flex items-center gap-0.5">
                  <Phone className="h-3 w-3" />{store.phone}
                </span>
              )}
              {store.working_hours && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />{store.working_hours}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" asChild>
            <Link to={`/create-store?edit=${store.id}`}>
              <Edit2 className="h-3 w-3" />Redaktə
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" asChild>
            <Link to={`/store/${store.id}`}>
              <Eye className="h-3 w-3" />Bax
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mağazanı silmək istəyirsiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Silmə sorğusu admin təsdiqi tələb edir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  await supabase.from("store_change_requests").insert({
                    store_id: store.id,
                    user_id: userId,
                    request_type: "delete",
                    changes: {},
                  });
                  toast({ title: "Silmə sorğusu göndərildi" });
                }}>Göndər</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoreHeader;
