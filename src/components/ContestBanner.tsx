import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ArrowRight, Users, Coins } from "lucide-react";

const ContestBanner = () => {
  const [enabled, setEnabled] = useState(false);
  const [contest, setContest] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("contest_settings").select("is_enabled").eq("id", 1).maybeSingle();
      if (!s?.is_enabled) return;
      setEnabled(true);
      const { data: c } = await supabase
        .from("contests")
        .select("total_pool,participants_count,week_end")
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      setContest(c);
    })();
  }, []);

  useEffect(() => {
    if (!contest?.week_end) return;
    const tick = () => {
      const ms = new Date(contest.week_end).getTime() - Date.now();
      if (ms <= 0) return setCountdown("Bitir...");
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCountdown(`${d}g ${h}s ${m}d`);
    };
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, [contest?.week_end]);

  if (!enabled) return null;

  return (
    <Link
      to="/contest"
      className="relative block overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 p-4 md:p-5 shadow-sm transition hover:shadow-md group"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-sm md:text-base">Həftəlik Dəvət Yarışması</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">1 ₼</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Fond: <b className="text-foreground">{Number(contest?.total_pool || 0).toFixed(2)} ₼</b></span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {contest?.participants_count || 0}</span>
            {countdown && <span className="hidden sm:inline">⏱ {countdown}</span>}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition" />
      </div>
    </Link>
  );
};

export default ContestBanner;
