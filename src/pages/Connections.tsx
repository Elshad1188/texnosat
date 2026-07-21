import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, ShieldCheck, Trash2, ExternalLink, KeyRound, ArrowLeft, Bot } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { formatDateTime } from "@/lib/datetime";

type OAuthClient = { id: string; name: string; uri?: string; logo_uri?: string };
type OAuthGrant = { client: OAuthClient; scopes: string[]; granted_at: string };
type OAuthApi = {
  listGrants(): Promise<{ data: OAuthGrant[] | null; error: { message: string } | null }>;
  revokeGrant(o: { clientId: string }): Promise<{ error: { message: string } | null }>;
};

const scopeLabel = (s: string, ru: boolean) => {
  const map: Record<string, [string, string]> = {
    openid: ["Kimlik təsdiqi", "Подтверждение личности"],
    email: ["E-poçt ünvanınız", "Ваш email"],
    profile: ["Əsas profil məlumatı", "Основные данные профиля"],
    offline_access: ["Uzunmüddətli giriş (refresh token)", "Долгосрочный доступ (refresh token)"],
  };
  const v = map[s];
  return v ? (ru ? v[1] : v[0]) : s;
};

const Connections = () => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const ru = language === "ru";
  const navigate = useNavigate();

  const [grants, setGrants] = useState<OAuthGrant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

  const load = async () => {
    setError(null);
    try {
      const { data, error } = await oauth.listGrants();
      if (error) throw error;
      setGrants(data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setGrants([]);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?next=" + encodeURIComponent("/connections"));
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const revoke = async (clientId: string, name: string) => {
    if (!confirm(ru
      ? `«${name}» приложение отключить? Оно больше не сможет работать от вашего имени.`
      : `«${name}» tətbiqinin bağlantısını ləğv edim? O daha sizin adınızdan işləyə bilməyəcək.`)) return;
    setRevoking(clientId);
    try {
      const { error } = await oauth.revokeGrant({ clientId });
      if (error) throw error;
      toast.success(ru ? "Доступ отозван" : "İcazə ləğv edildi");
      await load();
    } catch (e: any) {
      toast.error(e?.message || (ru ? "Ошибка" : "Xəta"));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/profile"><ArrowLeft className="h-4 w-4 mr-1" />{ru ? "Профиль" : "Profil"}</Link>
        </Button>

        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Plug className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {ru ? "Подключённые приложения" : "Qoşulmuş tətbiqlər"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ru
                ? "AI-ассистенты и внешние клиенты, которым вы разрешили действовать от вашего имени через MCP (Model Context Protocol)."
                : "Sizin adınızdan MCP (Model Context Protocol) vasitəsilə işləməyə icazə verdiyiniz AI-köməkçilər və xarici tətbiqlər."}
            </p>
          </div>
        </div>

        {/* Status card */}
        <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-foreground mb-1">
                {ru ? "MCP-сервер Elan24 активен" : "Elan24 MCP serveri aktivdir"}
              </div>
              <p className="text-muted-foreground">
                {ru
                  ? "ChatGPT, Claude, Cursor и другие MCP-клиенты могут подключиться к вашему аккаунту через OAuth. Ваши данные защищены RLS — приложение видит только то, что видите вы."
                  : "ChatGPT, Claude, Cursor və digər MCP klientləri hesabınıza OAuth ilə qoşula bilər. Məlumatlarınız RLS ilə qorunur — tətbiq yalnız sizin gördüyünüzü görür."}
              </p>
            </div>
          </div>
        </Card>

        {/* Grants list */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {ru ? "Активные подключения" : "Aktiv bağlantılar"}
          </h2>
          {grants && grants.length > 0 && (
            <Badge variant="secondary">{grants.length}</Badge>
          )}
        </div>

        {grants === null && (
          <div className="space-y-3">
            {[0, 1].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}

        {error && (
          <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
            {error}
          </Card>
        )}

        {grants && grants.length === 0 && !error && (
          <Card className="p-8 text-center">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">
              {ru
                ? "Пока ни одно приложение не подключено к вашему аккаунту."
                : "Hələ heç bir tətbiq hesabınıza qoşulmayıb."}
            </p>
          </Card>
        )}

        {grants && grants.length > 0 && (
          <div className="space-y-3">
            {grants.map(g => (
              <Card key={g.client.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {g.client.logo_uri ? (
                      <img src={g.client.logo_uri} alt={g.client.name} className="h-full w-full object-cover" />
                    ) : (
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{g.client.name}</h3>
                      <Badge variant="outline" className="text-[10px]">OAuth 2.1</Badge>
                    </div>
                    {g.client.uri && (
                      <a
                        href={g.client.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                      >
                        {g.client.uri.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {ru ? "Разрешено" : "İcazə verildi"}: {formatDateTime(g.granted_at)}
                    </p>

                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        {ru ? "Разрешения" : "İcazələr"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.scopes.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {ru ? "Только базовый доступ" : "Yalnız əsas giriş"}
                          </span>
                        )}
                        {g.scopes.map(s => (
                          <Badge key={s} variant="secondary" className="font-normal">
                            {scopeLabel(s, ru)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => revoke(g.client.id, g.client.name)}
                    disabled={revoking === g.client.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {revoking === g.client.id
                      ? (ru ? "Отзыв…" : "Ləğv…")
                      : (ru ? "Отозвать" : "Ləğv et")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6 p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {ru ? "Как это работает?" : "Bu necə işləyir?"}
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>{ru
              ? "Внешний AI-клиент (ChatGPT, Claude и др.) открывает страницу согласия Elan24."
              : "Xarici AI klient (ChatGPT, Claude və s.) Elan24 razılıq səhifəsini açır."}</li>
            <li>{ru
              ? "Вы входите под своим аккаунтом и подтверждаете доступ."
              : "Öz hesabınızla daxil olub icazəni təsdiqləyirsiniz."}</li>
            <li>{ru
              ? "Приложение действует от вашего имени и видит только ваши данные (RLS)."
              : "Tətbiq sizin adınızdan işləyir və yalnız sizin məlumatlarınızı görür (RLS)."}</li>
            <li>{ru
              ? "В любой момент можно отозвать доступ здесь — сессии клиента будут завершены."
              : "İstənilən vaxt burada icazəni ləğv edə bilərsiniz — klientin sessiyaları bağlanacaq."}</li>
          </ul>
        </Card>
      </main>
    </div>
  );
};

export default Connections;
