import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Wallet, Copy, Users, ArrowUpRight, ArrowDownRight, Gift, Check, Loader2 } from "lucide-react";

const Balance = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [referralInput, setReferralInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["balance-transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("balance_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const balance = (profile as any)?.balance || 0;
  const referralCode = (profile as any)?.referral_code || "";
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Referal linki kopyalandı!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const applyReferral = async () => {
    if (!referralInput.trim()) return;
    setProcessing(true);
    try {
      // Check if referral system is enabled
      const { data: refSettings } = await supabase
        .from("site_settings").select("value").eq("key", "referral").maybeSingle();
      const enabled = refSettings?.value ? (refSettings.value as any).referral_enabled !== false : true;
      if (!enabled) {
        toast({ title: "Referal sistemi hazırda deaktivdir", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const { data, error } = await supabase.rpc("process_referral", {
        _referral_code: referralInput.trim().toUpperCase(),
        _new_user_id: user.id,
      });
      if (error) throw error;
      if (data) {
        toast({ title: "Referal kodu uğurla tətbiq edildi! +1₼ bonus" });
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        queryClient.invalidateQueries({ queryKey: ["balance-transactions", user.id] });
        setReferralInput("");
      } else {
        toast({ title: "Kod etibarsızdır və ya artıq istifadə edilib", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        {/* Balance Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-primary p-6 text-center">
            <Wallet className="mx-auto h-8 w-8 text-primary-foreground opacity-80" />
            <p className="mt-2 text-sm text-primary-foreground/80">Cari balansınız</p>
            <p className="mt-1 text-4xl font-bold text-primary-foreground">{Number(balance).toFixed(2)} ₼</p>
          </div>
          <CardContent className="p-4">
            <p className="text-center text-xs text-muted-foreground">
              Balansınızı premium elan, təcili elan və VIP xidmətlər üçün istifadə edə bilərsiniz
            </p>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4 text-primary" />
              Referal proqramı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Dostlarınızı dəvət edin, hər uğurlu qeydiyyat üçün <strong className="text-primary">2₼</strong> bonus qazanın!
                Dəvət olunan şəxs isə <strong className="text-primary">1₼</strong> bonus alacaq.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Sizin referal kodunuz</p>
              <div className="flex gap-2">
                <Input value={referralCode} readOnly className="h-9 text-sm font-mono bg-muted" />
                <Button size="sm" variant="outline" className="h-9 gap-1 shrink-0" onClick={copyReferral}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Referal linki</p>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="h-9 text-xs bg-muted truncate" />
                <Button size="sm" variant="outline" className="h-9 gap-1 shrink-0" onClick={copyReferral}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Referal kodu daxil edin</p>
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="h-9 text-sm font-mono uppercase"
                />
                <Button
                  size="sm"
                  className="h-9 bg-gradient-primary text-primary-foreground shrink-0"
                  onClick={applyReferral}
                  disabled={processing || !referralInput.trim()}
                >
                  {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Tətbiq et"}
                </Button>
              </div>
            </div>

            {/* Referral Stats */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xl font-bold text-foreground">{referrals.length}</p>
                <p className="text-[10px] text-muted-foreground">Dəvət edilən</p>
              </div>
              <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                <Wallet className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xl font-bold text-foreground">
                  {referrals.reduce((s: number, r: any) => s + Number(r.bonus_amount), 0)}₼
                </p>
                <p className="text-[10px] text-muted-foreground">Qazanılan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Əməliyyat tarixçəsi</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Hələ əməliyyat yoxdur</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      t.amount > 0 ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30"
                    }`}>
                      {t.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("az-AZ")} · {new Date(t.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant={t.amount > 0 ? "default" : "destructive"} className="shrink-0 text-xs">
                      {t.amount > 0 ? "+" : ""}{Number(t.amount).toFixed(2)} ₼
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Balance;
