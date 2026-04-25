import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type IncomingCall = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  offer: any;
  status: string;
};

export const useIncomingCall = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    if (!user) return;

    const tryAccept = async (row: any) => {
      // Need a valid offer to accept
      if (!row?.offer) {
        // Fetch latest from DB in case realtime payload lacked offer
        const { data } = await supabase
          .from("calls")
          .select("*")
          .eq("id", row.id)
          .maybeSingle();
        if (data?.offer && data.status === "ringing") {
          setIncoming(data as IncomingCall);
        }
        return;
      }
      setIncoming(row as IncomingCall);
    };

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.status === "ringing") {
            tryAccept(row);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const cur = incomingRef.current;
          if (row.status === "ringing" && row.offer) {
            // First time we see the offer
            if (!cur || cur.id === row.id) {
              setIncoming(row as IncomingCall);
            }
          }
          if (["ended", "declined", "missed", "accepted"].includes(row.status)) {
            if (cur?.id === row.id) setIncoming(null);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { incoming, dismiss: () => setIncoming(null) };
};
