import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("authorization_id çatışmır");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message ?? String(error));
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message ?? String(error));
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("Yönləndirmə ünvanı qaytarılmadı.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Bağlantı açıla bilmədi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "Xarici tətbiq";
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
      ? details.scope.split(" ").filter(Boolean)
      : [];

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">İcazə tələb olunur</span>
          </div>
          <CardTitle className="text-lg">
            {clientName} Elan24 hesabınıza qoşulmaq istəyir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Təsdiq etsəniz, <span className="font-medium text-foreground">{clientName}</span> siz
            olaraq Elan24-ün aktiv alətlərini çağıra biləcək. Bu, sizin daxili icazələrinizi və
            server qaydalarını dəyişmir.
          </p>
          {scopes.length > 0 && (
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium mb-1">Tələb olunan icazələr</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {scopes.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => decide(true)}
              disabled={busy}
              className="flex-1 bg-gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Təsdiqlə"}
            </Button>
            <Button
              onClick={() => decide(false)}
              disabled={busy}
              variant="outline"
              className="flex-1"
            >
              İmtina et
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
