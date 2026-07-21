import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

const translateAuthError = (msg: string, lang: "az" | "ru"): string => {
  const m = (msg || "").toLowerCase();
  const dict: Record<string, { az: string; ru: string }> = {
    invalid_login: {
      az: "E-mail və ya şifrə yanlışdır",
      ru: "Неверный e-mail или пароль",
    },
    password_short: {
      az: "Şifrə minimum 6 simvol olmalıdır",
      ru: "Пароль должен содержать минимум 6 символов",
    },
    user_exists: {
      az: "Bu e-mail ilə artıq hesab mövcuddur",
      ru: "Пользователь с таким e-mail уже существует",
    },
    email_invalid: {
      az: "E-mail ünvanı düzgün deyil",
      ru: "Некорректный e-mail",
    },
    email_not_confirmed: {
      az: "E-mail təsdiqlənməyib. Poçtunuzu yoxlayın",
      ru: "E-mail не подтверждён. Проверьте почту",
    },
    rate_limit: {
      az: "Çox sayda cəhd. Bir az sonra yenidən sınayın",
      ru: "Слишком много попыток. Попробуйте позже",
    },
    weak_password: {
      az: "Şifrə çox zəifdir",
      ru: "Слишком слабый пароль",
    },
    network: {
      az: "Şəbəkə xətası. İnternet bağlantınızı yoxlayın",
      ru: "Ошибка сети. Проверьте подключение",
    },
  };
  if (m.includes("invalid login")) return dict.invalid_login[lang];
  if (m.includes("password") && (m.includes("6") || m.includes("short") || m.includes("at least"))) return dict.password_short[lang];
  if (m.includes("weak") && m.includes("password")) return dict.weak_password[lang];
  if (m.includes("already") || m.includes("registered") || m.includes("exists")) return dict.user_exists[lang];
  if (m.includes("invalid") && m.includes("email")) return dict.email_invalid[lang];
  if (m.includes("not confirmed") || m.includes("confirm")) return dict.email_not_confirmed[lang];
  if (m.includes("rate") || m.includes("too many")) return dict.rate_limit[lang];
  if (m.includes("network") || m.includes("failed to fetch")) return dict.network[lang];
  return msg;
};

type AuthMode = "login" | "register" | "forgot";

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { language } = useLanguage();

  // Password rules + live validation
  const pwRules = [
    { key: "len", test: (p: string) => p.length >= 6, label: { az: "Minimum 6 simvol", ru: "Минимум 6 символов" } },
    { key: "letter", test: (p: string) => /[A-Za-zÀ-ÿƏəĞğİıÖöŞşÜüÇç]/.test(p), label: { az: "Ən azı bir hərf", ru: "Хотя бы одна буква" } },
    { key: "digit", test: (p: string) => /\d/.test(p), label: { az: "Ən azı bir rəqəm", ru: "Хотя бы одна цифра" } },
  ];
  const allPwValid = pwRules.every((r) => r.test(password));

  // Referal kodu URL-də olarsa avtomatik tətbiq olunur (link paylaşımı üçün), amma input göstərilmir
  const autoReferralCode = searchParams.get("ref") || "";

  // OAuth consent flow: preserve original destination as same-origin relative path.
  const rawNext = searchParams.get("next") || "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const goNext = () => navigate(nextPath, { replace: true });


  const [defaultCountry, setDefaultCountry] = useState<any>("AZ");

  useEffect(() => {
    if (autoReferralCode) {
      setMode("register");
    }
  }, [autoReferralCode]);

  useEffect(() => {
    // Auto-detect country from IP for phone input
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        if (d?.country_code) setDefaultCountry(d.country_code);
      })
      .catch(() => {});
  }, []);

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
        if (!allPwValid) {
          toast({
            title: language === "ru" ? "Ошибка" : "Xəta",
            description: language === "ru"
              ? "Пароль не соответствует требованиям"
              : "Şifrə tələblərə uyğun deyil",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({
            title: language === "ru" ? "Ошибка" : "Xəta",
            description: language === "ru" ? "Пароли не совпадают" : "Şifrələr uyğun gəlmir",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        if (!phone || !isValidPhoneNumber(phone)) {
          toast({
            title: language === "ru" ? "Ошибка" : "Xəta",
            description: language === "ru" ? "Введите корректный номер" : "Mobil nömrəni düzgün daxil edin",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        await signUp(email, password, fullName, phone);
        toast({ title: "Hesab yaradıldı!", description: "Xoş gəldiniz!" });
        if (autoReferralCode) {
          setTimeout(async () => {
            const upper = autoReferralCode.toUpperCase();
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (!newUser) return;
            // Try classic referral
            const { data: refSettings } = await supabase
              .from("site_settings").select("value").eq("key", "referral").maybeSingle();
            const enabled = refSettings?.value ? (refSettings.value as any).referral_enabled !== false : true;
            if (enabled) {
              await supabase.rpc("process_referral", { _referral_code: upper, _new_user_id: newUser.id });
            }
            // Try contest invite
            await supabase.rpc("register_contest_invite", { _referral_code: upper });
            sessionStorage.removeItem("contest_ref");
          }, 2000);
        }
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: language === "ru" ? "Ошибка" : "Xəta",
        description: translateAuthError(error?.message || "", language),
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
                  <Label htmlFor="phone">{language === "ru" ? "Мобильный номер" : "Mobil nömrə"}</Label>
                  <PhoneInput
                    international
                    defaultCountry={defaultCountry}
                    value={phone}
                    onChange={(v) => setPhone(v || "")}
                    className="phone-input-custom"
                    placeholder={language === "ru" ? "Введите номер" : "Nömrəni daxil edin"}
                  />
                  {phone && !isValidPhoneNumber(phone) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="h-3.5 w-3.5" />
                      {language === "ru" ? "Некорректный номер" : "Nömrə düzgün deyil"}
                    </p>
                  )}
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
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "register" && (
                    <ul className="mt-2 space-y-1 rounded-md border border-border bg-muted/30 p-2 text-xs">
                      {pwRules.map((r) => {
                        const ok = r.test(password);
                        return (
                          <li key={r.key} className={`flex items-center gap-2 ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            <span>{r.label[language === "ru" ? "ru" : "az"]}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Şifrəni təkrar daxil edin</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs flex items-center gap-1 ${password === confirmPassword ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {password === confirmPassword ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {password === confirmPassword
                        ? (language === "ru" ? "Пароли совпадают" : "Şifrələr uyğundur")
                        : (language === "ru" ? "Пароли не совпадают" : "Şifrələr uyğun gəlmir")}
                    </p>
                  )}
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
