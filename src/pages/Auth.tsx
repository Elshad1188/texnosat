import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowLeft, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

type AuthMode = "login" | "register" | "forgot";

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      setMode("register");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast({ title: "Şifrə sıfırlama linki göndərildi", description: "E-mail qutunuzu yoxlayın" });
        setMode("login");
      } else if (mode === "login") {
        await signIn(email, password);
        toast({ title: "Uğurla daxil oldunuz!" });
        navigate("/");
      } else {
        await signUp(email, password, fullName);
        toast({ title: "Hesab yaradıldı!", description: "Xoş gəldiniz!" });
        if (referralCode) {
          setTimeout(async () => {
            const { data: refSettings } = await supabase
              .from("site_settings").select("value").eq("key", "referral").maybeSingle();
            const enabled = refSettings?.value ? (refSettings.value as any).referral_enabled !== false : true;
            if (!enabled) return;
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
              await supabase.rpc("process_referral", {
                _referral_code: referralCode.toUpperCase(),
                _new_user_id: newUser.id,
              });
            }
          }, 2000);
        }
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Xəta",
        description: error.message === "Invalid login credentials"
          ? "E-mail və ya şifrə yanlışdır"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: t("nav.login"),
    register: t("nav.register"),
    forgot: t("auth.forgot_password"),
  };

  const descriptions: Record<AuthMode, string> = {
    login: t("auth.signin_title"),
    register: t("auth.signup_title"),
    forgot: t("auth.forgot_password"),
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">
                {theme.logo_icon || "E"}
              </span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              {theme.logo_text_main || "Elan"}<span className="text-primary">{theme.logo_text_accent || "24"}</span>
            </span>
          </Link>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">{titles[mode]}</CardTitle>
            <CardDescription>{descriptions[mode]}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth.full_name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" placeholder="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
              )}
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="referral">{t("auth.referral_code")}</Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="referral" placeholder="XXXXXXXX" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="pl-10 uppercase font-mono" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">{t("common.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? t("common.loading") : titles[mode]}
              </Button>
            </form>

            {mode === "login" && (
              <div className="mt-3 text-center">
                <button onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                  {t("auth.forgot_password")}
                </button>
              </div>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>{t("auth.no_account")}{" "}<button onClick={() => setMode("register")} className="text-primary font-medium hover:underline">{t("auth.signup_link")}</button></>
              ) : mode === "register" ? (
                <>{t("auth.have_account")}{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">{t("auth.signin_link")}</button></>
              ) : (
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">{t("common.back")}</button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
