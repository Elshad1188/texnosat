import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Props {
  query?: string;
  category?: string;
  subcategory?: string;
  region?: string;
  condition?: string;
  priceMin?: string | number;
  priceMax?: string | number;
}

const SaveSearchButton = (props: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const normalize = () => ({
    query: props.query?.trim() || null,
    category: props.category || null,
    subcategory: props.subcategory || null,
    region: props.region || null,
    condition: props.condition && props.condition !== "Hamısı" ? props.condition : null,
    price_min: props.priceMin ? Number(props.priceMin) : null,
    price_max: props.priceMax ? Number(props.priceMax) : null,
  });

  const filters = normalize();
  const hasAnyFilter = !!(filters.query || filters.category || filters.region || filters.condition || filters.price_min || filters.price_max);

  const { data: existing } = useQuery({
    queryKey: ["saved-search-match", user?.id, filters],
    queryFn: async () => {
      if (!user) return null;
      let q = supabase.from("saved_searches").select("*").eq("user_id", user.id).eq("is_active", true);
      // exact-match check
      const { data } = await q;
      return (data || []).find((s: any) =>
        (s.query || null) === filters.query &&
        (s.category || null) === filters.category &&
        (s.region || null) === filters.region &&
        (s.condition || null) === filters.condition &&
        (s.price_min ?? null) === filters.price_min &&
        (s.price_max ?? null) === filters.price_max
      ) || null;
    },
    enabled: !!user && hasAnyFilter,
  });

  const handleSave = async () => {
    if (!user) {
      toast.error("Abunə olmaq üçün daxil olun");
      navigate("/auth");
      return;
    }
    if (!hasAnyFilter) {
      toast.error("Axtarış üçün ən azı bir filter seçin");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await supabase.from("saved_searches").delete().eq("id", existing.id);
        toast.success("Abunəlik ləğv edildi");
      } else {
        const { error } = await supabase.from("saved_searches").insert({ user_id: user.id, ...filters });
        if (error) throw error;
        toast.success("Axtarış yadda saxlandı — uyğun yeni elanlar haqqında bildiriş alacaqsınız");
      }
      queryClient.invalidateQueries({ queryKey: ["saved-search-match"] });
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    } catch (e: any) {
      toast.error(e.message || "Xəta baş verdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button variant={existing ? "default" : "outline"} onClick={handleSave} disabled={saving} className="gap-2">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      <span className="hidden sm:inline">{existing ? "Abunəlikdən çıx" : "Axtarışı yadda saxla"}</span>
    </Button>
  );
};

export default SaveSearchButton;
