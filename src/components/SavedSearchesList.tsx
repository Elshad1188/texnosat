import { Bell, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SavedSearchesList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: searches = [], isLoading } = useQuery({
    queryKey: ["saved-searches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("saved_searches").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const buildLink = (s: any) => {
    const params = new URLSearchParams();
    if (s.query) params.set("search", s.query);
    if (s.category) params.set("category", s.category);
    return `/products?${params.toString()}`;
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("saved_searches").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    toast.success(current ? "Bildirişlər söndürüldü" : "Bildirişlər aktivdir");
  };

  const remove = async (id: string) => {
    await supabase.from("saved_searches").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    toast.success("Silindi");
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (searches.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Hələ yadda saxlanılmış axtarışınız yoxdur</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Elanlar səhifəsində axtarış edib "Axtarışı yadda saxla" düyməsinə basın</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((s: any) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {s.query && <Badge variant="secondary">🔍 {s.query}</Badge>}
                {s.category && <Badge variant="outline">{s.category}</Badge>}
                {s.region && <Badge variant="outline">📍 {s.region}</Badge>}
                {s.condition && <Badge variant="outline">{s.condition}</Badge>}
                {(s.price_min || s.price_max) && (
                  <Badge variant="outline">
                    {s.price_min || 0}–{s.price_max || "∞"} ₼
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Yaradıldı: {new Date(s.created_at).toLocaleDateString("az")}
                {s.last_notified_at && ` • Son bildiriş: ${new Date(s.last_notified_at).toLocaleDateString("az")}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s.id, s.is_active)} />
              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                <Link to={buildLink(s)}><ExternalLink className="h-4 w-4" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedSearchesList;
