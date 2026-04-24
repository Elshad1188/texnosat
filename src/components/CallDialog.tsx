import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Mode = "outgoing" | "incoming";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  callId?: string | null;
  conversationId: string;
  selfId: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  initialOffer?: any;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const CallDialog = ({
  open,
  onClose,
  mode,
  callId: initialCallId,
  conversationId,
  selfId,
  peerId,
  peerName,
  peerAvatar,
  initialOffer,
}: Props) => {
  const [status, setStatus] = useState<"connecting" | "ringing" | "active" | "ended">(
    mode === "outgoing" ? "connecting" : "ringing"
  );
  const [muted, setMuted] = useState(false);
  const [callId, setCallId] = useState<string | null>(initialCallId ?? null);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(initialCallId ?? null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  // Ringtone for incoming
  useEffect(() => {
    if (!open) return;
    if (mode === "incoming" && status === "ringing") {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
      );
      // Use beep loop via Web Audio
      try {
        const ctx = new AudioContext();
        const playBeep = () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 480;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        };
        const interval = window.setInterval(playBeep, 1200);
        playBeep();
        return () => {
          window.clearInterval(interval);
          ctx.close().catch(() => {});
        };
      } catch {
        // ignore
      }
    }
  }, [open, mode, status]);

  // Duration timer
  useEffect(() => {
    if (status === "active") {
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
  }, [status]);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    pcRef.current?.getSenders().forEach((s) => {
      try { s.track?.stop(); } catch {}
    });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
  };

  const endCall = async (markStatus: "ended" | "declined" | "missed" = "ended") => {
    setStatus("ended");
    cleanup();
    if (callIdRef.current) {
      try {
        await supabase
          .from("calls")
          .update({
            status: markStatus,
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
          })
          .eq("id", callIdRef.current);
      } catch {}
    }
    setTimeout(() => onClose(), 400);
  };

  const setupPeerConnection = (currentCallId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await (supabase.from("call_ice_candidates") as any).insert({
          call_id: currentCallId,
          sender_id: selfId,
          candidate: e.candidate.toJSON() as any,
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setStatus("active");
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        if (status !== "ended") endCall("ended");
      }
    };

    return pc;
  };

  const subscribeSignaling = (currentCallId: string) => {
    const ch = supabase
      .channel(`call-${currentCallId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${currentCallId}` },
        async (payload) => {
          const row: any = payload.new;
          if (row.status === "declined" || row.status === "ended") {
            endCall(row.status);
            return;
          }
          if (mode === "outgoing" && row.answer && pcRef.current && !pcRef.current.currentRemoteDescription) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(row.answer));
              remoteSetRef.current = true;
              for (const c of pendingIceRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
              pendingIceRef.current = [];
            } catch (e) {
              console.error("setRemoteDescription failed", e);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_ice_candidates",
          filter: `call_id=eq.${currentCallId}`,
        },
        async (payload) => {
          const row: any = payload.new;
          if (row.sender_id === selfId) return;
          const cand = row.candidate;
          if (pcRef.current && remoteSetRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn("ice add failed", e);
            }
          } else {
            pendingIceRef.current.push(cand);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
  };

  // Outgoing flow
  useEffect(() => {
    if (!open || mode !== "outgoing") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // Create call row
        const { data: callRow, error: callErr } = await supabase
          .from("calls")
          .insert({
            conversation_id: conversationId,
            caller_id: selfId,
            callee_id: peerId,
            status: "ringing",
            call_type: "audio",
          })
          .select()
          .single();
        if (callErr || !callRow) throw callErr || new Error("Call create failed");
        setCallId(callRow.id);
        callIdRef.current = callRow.id;
        setStatus("ringing");

        const pc = setupPeerConnection(callRow.id);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        subscribeSignaling(callRow.id);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await (supabase.from("calls") as any)
          .update({ offer: offer as any })
          .eq("id", callRow.id);
      } catch (err: any) {
        toast({
          title: "Zəng başlamadı",
          description: err?.message ?? "Mikrofona icazə vermək lazımdır",
          variant: "destructive",
        });
        endCall("ended");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Incoming: just subscribe, wait for accept
  useEffect(() => {
    if (!open || mode !== "incoming" || !initialCallId) return;
    subscribeSignaling(initialCallId);
    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialCallId]);

  const acceptCall = async () => {
    if (!initialCallId || !initialOffer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = setupPeerConnection(initialCallId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
      remoteSetRef.current = true;
      for (const c of pendingIceRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await (supabase.from("calls") as any)
        .update({
          answer: answer as any,
          status: "accepted",
          answered_at: new Date().toISOString(),
        })
        .eq("id", initialCallId);
      setStatus("active");
    } catch (err: any) {
      toast({
        title: "Zəng qəbul edilmədi",
        description: err?.message ?? "Mikrofona icazə lazımdır",
        variant: "destructive",
      });
      endCall("declined");
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    setMuted(newMuted);
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const statusLabel =
    status === "connecting"
      ? "Bağlanır..."
      : status === "ringing"
      ? mode === "outgoing"
        ? "Zəng edilir..."
        : "Gələn zəng"
      : status === "active"
      ? formatDuration(duration)
      : "Zəng bitdi";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) endCall("ended"); }}>
      <DialogContent className="max-w-sm border-0 bg-gradient-to-b from-primary/95 to-primary p-0 overflow-hidden">
        <div className="flex flex-col items-center justify-between min-h-[480px] px-6 py-10 text-primary-foreground">
          <div className="flex flex-col items-center gap-3 mt-6">
            <div className="text-xs uppercase tracking-wider opacity-80">{statusLabel}</div>
            <div className="relative">
              <div className={`h-28 w-28 rounded-full overflow-hidden bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-4xl font-bold ${status === "ringing" ? "animate-pulse" : ""}`}>
                {peerAvatar ? (
                  <img src={peerAvatar} alt={peerName} className="h-full w-full object-cover" />
                ) : (
                  <span>{peerName[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              {status === "active" && (
                <Volume2 className="absolute -bottom-1 -right-1 h-7 w-7 p-1.5 rounded-full bg-green-500 text-white" />
              )}
            </div>
            <div className="text-2xl font-bold">{peerName}</div>
            <div className="text-sm opacity-80">Səsli zəng</div>
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline />

          <div className="flex items-center gap-6 mb-4">
            {(status === "active" || (status === "connecting" && mode === "outgoing") || (status === "ringing" && mode === "outgoing")) && (
              <Button
                size="icon"
                onClick={toggleMute}
                className={`h-14 w-14 rounded-full ${muted ? "bg-white text-primary" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            )}

            {mode === "incoming" && status === "ringing" && (
              <Button
                size="icon"
                onClick={acceptCall}
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white animate-bounce"
              >
                <Phone className="h-7 w-7" />
              </Button>
            )}

            <Button
              size="icon"
              onClick={() => endCall(mode === "incoming" && status === "ringing" ? "declined" : "ended")}
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>

          {status === "connecting" && (
            <div className="absolute top-4 right-4">
              <Loader2 className="h-4 w-4 animate-spin text-white/70" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallDialog;
