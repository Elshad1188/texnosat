
-- Telegram bot state for tracking getUpdates offset
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

-- Telegram bot settings per user (store selection, markup config)
CREATE TABLE public.telegram_bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  telegram_chat_id bigint NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  markup_type text NOT NULL DEFAULT 'percent',
  markup_value numeric NOT NULL DEFAULT 20,
  target_category text NOT NULL DEFAULT 'elektronika',
  target_location text NOT NULL DEFAULT 'Bakı',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(telegram_chat_id)
);

ALTER TABLE public.telegram_bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bot settings" ON public.telegram_bot_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bot settings" ON public.telegram_bot_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot settings" ON public.telegram_bot_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bot settings" ON public.telegram_bot_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
