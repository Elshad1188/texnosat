import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initFirebaseMessaging, isInPreviewOrIframe, isPushSupported } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FirebaseInit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Listen for notification clicks + in-app notifications from the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (isInPreviewOrIframe()) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "NOTIFICATION_NAVIGATE" && data.link) {
        const link: string = data.link;
        if (link.startsWith("http://") || link.startsWith("https://")) {
          try {
            const url = new URL(link);
            if (url.origin === window.location.origin) {
              navigate(url.pathname + url.search + url.hash);
            } else {
              window.location.href = link;
            }
          } catch {
            window.location.href = link;
          }
        } else {
          navigate(link.startsWith("/") ? link : `/${link}`);
        }
      }

      // App is open & visible — show in-app toast instead of system push
      if (data.type === "INAPP_NOTIFICATION" && data.payload) {
        const { title, body, link } = data.payload;
        toast(title || "Yeni bildiriş", {
          description: body || undefined,
          action: link
            ? { label: "Aç", onClick: () => navigate(link) }
            : undefined,
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);

  // Refresh the FCM token only if permission was already granted earlier.
  // Never auto-prompt — that must come from a user gesture (see enablePushNotifications).
  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (isInPreviewOrIframe()) return;
    if (Notification.permission !== "granted") return;

    const refresh = async () => {
      const token = await initFirebaseMessaging();
      if (!token) return;

      const { error } = await supabase
        .from("fcm_tokens")
        .upsert(
          { user_id: user.id, token, updated_at: new Date().toISOString(), last_seen_at: new Date().toISOString() },
          { onConflict: "user_id,token" }
        );
      if (error) console.error("[Firebase] token upsert error:", error);
    };

    const timer = setTimeout(refresh, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

export default FirebaseInit;
