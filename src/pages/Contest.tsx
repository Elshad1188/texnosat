import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy, Users, Sparkles, Crown, Medal, Award, Clock, Loader2, Share2, Info } from "lucide-react";

const formatTimeLeft = (target: Date) => {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Bitdi";
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  return `${d}g ${h}s ${m}d ${s}san`;
};

const Contest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["contest-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("contest_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  const { data: contest, refetch } = useQuery({
    queryKey: ["contest-current"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contests").select("*").eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ["contest-leaders", contest?.id],
    queryFn: async () => {
      if (!contest?.id) return [];
      const { data } = await supabase
        .from("contest_participants")
        .select("user_id, invites_count, referral_code")
        .eq("contest_id", contest.id)
        .order("invites_count", { ascending: false })
        .limit(50);
      const ids = (data || []).map((p) => p.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids);
      return (data || []).map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.user_id === p.user_id),
      }));
    },
    refetchInterval: 15000,
    enabled: !!contest?.id,
  });

  const { data: myParticipation } = useQuery({
    queryKey: ["contest-me", contest?.id, user?.id],
    queryFn: async () => {
      if (!contest?.id || !user) return null;
      const { data } = await supabase
        .from("contest_participants")
        .select("*").eq("contest_id", contest.id).eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!contest?.id && !!user,
  });

  const weekEnd = useMemo(() => contest?.week_end ? new Date(contest.week_end) : null, [contest?.week_end]);
  const timeLeft = weekEnd ? formatTimeLeft(weekEnd) : "—";

  const winnerAmount = ((Number(contest?.total_pool || 0) * Number(settings?.winner_pct || 70)) / 100).toFixed(2);
  const secondAmount = ((Number(contest?.total_pool || 0) * Number(settings?.second_pct || 10)) / 100).toFixed(2);
  const thirdAmount = ((Number(contest?.total_pool || 0) * Number(settings?.third_pct || 5)) / 100).toFixed(2);

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke("contest-join");
      if (error) throw error;
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      throw new Error(data?.error || "Ödəniş başladıla bilmədi");
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (settings && !settings.is_enabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Yarışma hazırda deaktivdir</h1>
          <p className="text-muted-foreground">Tezliklə yenidən fəal olacaq. İzləyin!</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6 pb-24">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-6 sm:p-8 text-white shadow-xl mb-6">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> HƏFTƏLİK YARIŞMA
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display mb-2">
              {settings?.contest_title || "Elan24 Çempionatı"}
            </h1>
            <p className="text-sm sm:text-base text-white/90 mb-5 max-w-xl">
              {settings?.contest_description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/80 mb-1">Cari fond</div>
                <div className="text-3xl font-black">{Number(contest?.total_pool || 0).toFixed(0)} ₼</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/80 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Qalıb
                </div>
                <div className="text-lg font-bold tabular-nums" key={tick}>{timeLeft}</div>
              </div>
            </div>

            {myParticipation ? (
              <Button
                size="lg"
                onClick={() => navigate("/contest/me")}
                className="w-full h-14 bg-white text-orange-600 hover:bg-white/90 font-bold text-base shadow-lg"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Mənim panelim — {myParticipation.invites_count} dəvət
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleJoin}
                disabled={joining}
                className="w-full h-14 bg-white text-orange-600 hover:bg-white/90 font-bold text-base shadow-lg"
              >
                {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>🏆 Cəmi {Number(settings?.entry_fee || 1)} AZN ilə qoşul</>
                )}
              </Button>
            )}
            <p className="text-[11px] text-white/80 mt-2 text-center">
              + {Number(settings?.bonus_balance_amount || 1)} AZN balansa bonus
            </p>
          </div>
        </div>

        {/* Prize breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Card className="p-3 text-center border-amber-500/40 bg-amber-500/5">
            <Crown className="h-6 w-6 mx-auto text-amber-500 mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">1-ci yer</div>
            <div className="text-lg font-bold">{winnerAmount} ₼</div>
            <div className="text-[10px] text-muted-foreground">{settings?.winner_pct}%</div>
          </Card>
          <Card className="p-3 text-center border-slate-400/40 bg-slate-400/5">
            <Medal className="h-6 w-6 mx-auto text-slate-400 mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">2-ci yer</div>
            <div className="text-lg font-bold">{secondAmount} ₼</div>
            <div className="text-[10px] text-muted-foreground">{settings?.second_pct}%</div>
          </Card>
          <Card className="p-3 text-center border-orange-700/40 bg-orange-700/5">
            <Award className="h-6 w-6 mx-auto text-orange-700 mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">3-cü yer</div>
            <div className="text-lg font-bold">{thirdAmount} ₼</div>
            <div className="text-[10px] text-muted-foreground">{settings?.third_pct}%</div>
          </Card>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Card className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">İştirakçılar</div>
              <div className="text-lg font-bold">{contest?.participants_count || 0}</div>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Toplam dəvət</div>
              <div className="text-lg font-bold">{contest?.invites_count || 0}</div>
            </div>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className="p-4 mb-6">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Liderlər cədvəli
          </h3>
          {leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Hələ iştirakçı yoxdur. İlk olun!</p>
          ) : (
            <div className="space-y-2">
              {leaders.map((p: any, i: number) => (
                <div key={p.user_id} className={`flex items-center gap-3 p-2 rounded-lg ${i < 3 ? "bg-muted/50" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-500 text-white" :
                    i === 1 ? "bg-slate-400 text-white" :
                    i === 2 ? "bg-orange-700 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.profile?.full_name || "İstifadəçi"}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{p.invites_count} dəvət</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Rules */}
        <Card className="p-4">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" /> Qaydalar
          </h3>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {settings?.rules_text}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Contest;
