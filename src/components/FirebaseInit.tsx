import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initFirebaseMessaging, requestNotificationPermission } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const FirebaseInit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Listen for notification clicks coming from the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_NAVIGATE" && event.data.link) {
        const link: string = event.data.link;
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
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const token = await initFirebaseMessaging();
      if (!token) return;

      console.log("[Firebase] FCM token obtained");

      // Save token to database (upsert)
      await supabase.from("fcm_tokens").upsert(
        { user_id: user.id, token, updated_at: new Date().toISOString() },
        { onConflict: "user_id,token" }
      );
    };

    const timer = setTimeout(init, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

export default FirebaseInit;
