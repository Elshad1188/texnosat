-- Calls table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ringing', -- ringing, accepted, declined, ended, missed
  call_type text NOT NULL DEFAULT 'audio', -- audio, video (future)
  offer jsonb,
  answer jsonb,
  duration_seconds integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_calls_callee ON public.calls(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_convo ON public.calls(conversation_id);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their calls"
  ON public.calls FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can insert calls they make"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls"
  ON public.calls FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- ICE candidates exchange (separate table because there are many per call)
CREATE TABLE IF NOT EXISTS public.call_ice_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  candidate jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ice_call ON public.call_ice_candidates(call_id);

ALTER TABLE public.call_ice_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call participants view ice"
  ON public.call_ice_candidates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_id AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid())
  ));

CREATE POLICY "Call participants send ice"
  ON public.call_ice_candidates FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_id AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid())
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_ice_candidates;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_ice_candidates REPLICA IDENTITY FULL;