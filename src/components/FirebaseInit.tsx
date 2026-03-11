import { useEffect } from "react";
import { initFirebaseMessaging, requestNotificationPermission } from "@/lib/firebase";

const FirebaseInit = () => {
  useEffect(() => {
    const init = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const token = await initFirebaseMessaging();
        if (token) {
          console.log("[Firebase] FCM token:", token);
        }
      }
    };

    // Delay init to not block page load
    const timer = setTimeout(init, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default FirebaseInit;
