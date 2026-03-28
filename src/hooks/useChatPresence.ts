import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useChatPresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // 1. Update presence globally (Last Seen)
    const updatePresence = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch (e) {
        console.error("Failed to update presence:", e);
      }
    };

    // 2. Mark incoming messages as delivered (2 gray ticks)
    const syncDeliveryReceipts = async () => {
      try {
        const { data: convos } = await supabase
          .from("conversations")
          .select("id")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
          
        if (convos && convos.length > 0) {
          const convoIds = convos.map(c => c.id);
          // Mark all un-delivered messages from other senders in my conversations as delivered
          await supabase
            .from("messages")
            .update({ is_delivered: true })
            .in("conversation_id", convoIds)
            .neq("sender_id", user.id)
            .eq("is_delivered", false);
        }
      } catch (e) {
        console.error("Failed to sync delivery receipts:", e);
      }
    };

    // Run on mount
    updatePresence();
    syncDeliveryReceipts();

    // Setup heartbeats and window focus listeners
    const presenceInterval = setInterval(updatePresence, 60000); // every minute
    const deliveryInterval = setInterval(syncDeliveryReceipts, 30000); // every 30s
    
    const handleFocus = () => {
      updatePresence();
      syncDeliveryReceipts();
    };
    
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(deliveryInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);
}
