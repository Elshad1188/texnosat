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

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast({ title: "Uğurla daxil oldunuz!" });
      } else {
        await signUp(email, password, fullName);
        toast({ title: "Hesab yaradıldı!", description: "Xoş gəldiniz!" });
        // Process referral after signup
        if (referralCode) {
          setTimeout(async () => {
            // Check if referral system is enabled
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
      }
      navigate("/");
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">T</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Texno<span className="text-primary">sat</span>
            </span>
          </Link>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              {isLogin ? "Daxil ol" : "Qeydiyyat"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Hesabınıza daxil olun"
                : "Yeni hesab yaradın və elan yerləşdirin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad və soyad</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Ad Soyad"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="referral">Referal kodu (istəyə bağlı)</Label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="referral"
                      placeholder="XXXXXXXX"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="pl-10 uppercase font-mono"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Gözləyin..." : isLogin ? "Daxil ol" : "Qeydiyyatdan keç"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Hesabınız yoxdur?" : "Artıq hesabınız var?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Qeydiyyatdan keçin" : "Daxil olun"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Ana səhifəyə qayıt
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
