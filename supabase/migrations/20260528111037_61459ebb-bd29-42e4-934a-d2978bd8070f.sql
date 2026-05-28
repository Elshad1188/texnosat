CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_link_tokens TO service_role;

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- No client policies: only service role (edge functions) accesses this table.

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expires ON public.telegram_link_tokens(expires_at);