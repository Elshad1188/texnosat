import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!user) return;
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
            setIncoming(row);
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
          if (row.offer && incoming?.id === row.id && !incoming.offer) {
            setIncoming({ ...incoming, offer: row.offer });
          }
          if (["ended", "declined", "missed"].includes(row.status)) {
            setIncoming((cur) => (cur?.id === row.id ? null : cur));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { incoming, dismiss: () => setIncoming(null) };
};
