import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Crown, Medal, Award, Trophy, X } from "lucide-react";
import { useState, useEffect } from "react";

interface Winner {
  place: number;
  user_id: string | null;
  name: string;
  amount: number;
  invites: number | null;
}

const ContestWinnersBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["last-contest-winners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", "last_contest_winners")
        .maybeSingle();
      return data;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!data?.updated_at) return;
    const key = `contest_winners_dismissed_${data.updated_at}`;
    if (localStorage.getItem(key)) setDismissed(true);
  }, [data?.updated_at]);

  if (!data || dismissed) return null;

  const value = data.value as any;
  // Only show for 7 days after announcement
  const announcedAt = new Date(value?.finalized_at || data.updated_at).getTime();
  if (Date.now() - announcedAt > 7 * 24 * 60 * 60 * 1000) return null;

  const winners: Winner[] = (value?.winners || []).filter((w: Winner) => w.user_id);
  if (winners.length === 0) return null;

  const close = () => {
    localStorage.setItem(`contest_winners_dismissed_${data.updated_at}`, "1");
    setDismissed(true);
  };

  const icons: Record<number, JSX.Element> = {
    1: <Crown className="h-4 w-4 text-amber-300" />,
    2: <Medal className="h-4 w-4 text-slate-200" />,
    3: <Award className="h-4 w-4 text-orange-300" />,
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white border-0 p-4 mb-4">
      <button
        onClick={close}
        className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition"
        aria-label="Bağla"
      >
        <X className="h-3 w-3" />
      </button>
      <Link to="/contest" className="block">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5" />
          <h3 className="font-bold text-sm sm:text-base">Yarışmanın qalibləri elan olundu!</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {winners.map((w) => (
            <div
              key={w.place}
              className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs sm:text-sm"
            >
              {icons[w.place]}
              <span className="font-semibold truncate max-w-[120px]">{w.name}</span>
              <span className="font-bold">{Number(w.amount).toFixed(2)} ₼</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/90 mt-2">Yeni həftə başladı — sən də qoşul və qazan! →</p>
      </Link>
    </Card>
  );
};

export default ContestWinnersBanner;
