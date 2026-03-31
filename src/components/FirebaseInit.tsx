import { useEffect } from "react";
import { initFirebaseMessaging, requestNotificationPermission } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const FirebaseInit = () => {
  const { user } = useAuth();

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
