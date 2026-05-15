import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy, Copy, Share2, Users, ArrowLeft, MessageCircle, Send } from "lucide-react";

const ContestMe = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: contest } = useQuery({
    queryKey: ["contest-current"],
    queryFn: async () => {
      const { data } = await supabase.from("contests").select("*").eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: me } = useQuery({
    queryKey: ["contest-me", contest?.id, user?.id],
    queryFn: async () => {
      if (!contest?.id || !user) return null;
      const { data } = await supabase.from("contest_participants").select("*").eq("contest_id", contest.id).eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!contest?.id && !!user,
    refetchInterval: 10000,
  });

  const { data: rank } = useQuery({
    queryKey: ["contest-rank", contest?.id, user?.id],
    queryFn: async () => {
      if (!contest?.id || !me) return null;
      const { count } = await supabase
        .from("contest_participants")
        .select("id", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .gt("invites_count", me.invites_count);
      return (count || 0) + 1;
    },
    enabled: !!me,
    refetchInterval: 10000,
  });

  const link = me ? `${window.location.origin}/r/${me.referral_code}` : "";
  const shareText = `🏆 Mən Elan24 Çempionatındayam! Cəmi 1 AZN ilə qoşul, dostlarını dəvət et və böyük fondu qazan: ${link}`;

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (contest && !me) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-12 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Hələ qoşulmamısınız</h1>
          <p className="text-muted-foreground mb-6">Yarışmaya qoşulub öz dəvət linkinizi alın.</p>
          <Button onClick={() => navigate("/contest")} className="bg-gradient-primary text-primary-foreground">
            Yarışmaya qoşul
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "Link kopyalandı!" });
  };

  const shareOn = (platform: string) => {
    const enc = encodeURIComponent(shareText);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${enc}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${enc}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    };
    window.open(urls[platform], "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6 pb-24">
        <Link to="/contest" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Yarışmaya qayıt
        </Link>

        {/* My stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Card className="p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Reytinq</div>
            <div className="text-2xl font-bold text-primary">#{rank || "—"}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Dəvətlərim</div>
            <div className="text-2xl font-bold">{me?.invites_count || 0}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Girişlərim</div>
            <div className="text-2xl font-bold">{me?.entries_count || 0}</div>
          </Card>
        </div>

        {/* My link */}
        <Card className="p-5 mb-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-amber-500" /> Sənin dəvət linkin
          </h3>
          <div className="flex gap-2 mb-3">
            <Input value={link} readOnly className="font-mono text-xs" />
            <Button onClick={copy} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => shareOn("whatsapp")} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
            <Button onClick={() => shareOn("telegram")} className="bg-[#0088cc] hover:bg-[#0088cc]/90 text-white">
              <Send className="h-4 w-4 mr-1" /> Telegram
            </Button>
            <Button onClick={() => shareOn("facebook")} className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
              <Users className="h-4 w-4 mr-1" /> Facebook
            </Button>
          </div>
        </Card>

        {/* Re-entry */}
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Şansını ikiqat artırmaq istəyirsən? Yenidən qoşulub fond yığımına töhfə ver.
          </p>
          <Button variant="outline" onClick={() => navigate("/contest")}>
            Yenidən qoşul
          </Button>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ContestMe;
