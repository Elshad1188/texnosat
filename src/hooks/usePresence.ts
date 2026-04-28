import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tracks user presence so push notifications are skipped when the app is open & visible.
 * - 'active'  : tab visible
 * - 'background' : tab hidden but session alive
 * - 'offline' : closed (best effort via beforeunload/pagehide)
 */
export const usePresence = () => {
  const { user } = useAuth();
  const lastStateRef = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    const update = async (state: "active" | "background" | "offline") => {
      if (lastStateRef.current === state && state !== "active") return;
      lastStateRef.current = state;
      try {
        await supabase
          .from("profiles")
          .update({ presence_state: state, last_seen: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch {
        /* ignore */
      }
    };

    const computeState = (): "active" | "background" =>
      document.visibilityState === "visible" ? "active" : "background";

    update(computeState());

    const interval = setInterval(() => update(computeState()), 20000);

    const onVisibility = () => update(computeState());
    const onLeave = () => {
      // Best-effort offline mark using sendBeacon-like fast path
      try {
        update("offline");
      } catch { /* ignore */ }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      // Mark background on unmount (logout etc.)
      update("offline");
    };
  }, [user]);
};
