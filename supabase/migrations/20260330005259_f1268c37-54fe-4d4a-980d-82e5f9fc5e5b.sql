
-- Store change requests table
CREATE TABLE public.store_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'edit',
  changes jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);

ALTER TABLE public.store_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own requests" ON public.store_change_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests" ON public.store_change_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON public.store_change_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests" ON public.store_change_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests" ON public.store_change_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tickets table
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON public.tickets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets" ON public.tickets
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own open tickets" ON public.tickets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'open');

-- Ticket messages table
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own tickets" ON public.ticket_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Users can add messages to own tickets" ON public.ticket_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- Trigger for ticket notifications to admins
CREATE OR REPLACE FUNCTION public.on_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _user_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _user_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM notify_admins('new_ticket', 'Yeni dəstək sorğusu', _user_name || ' tərəfindən: ' || NEW.subject, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_ticket_trigger AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION on_new_ticket();

-- Trigger for store change requests
CREATE OR REPLACE FUNCTION public.on_new_store_change_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _user_name text; _store_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _user_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _store_name FROM public.stores WHERE id = NEW.store_id;
  PERFORM notify_admins(
    'store_change_request',
    CASE WHEN NEW.request_type = 'delete' THEN 'Mağaza silmə sorğusu' ELSE 'Mağaza redaktə sorğusu' END,
    _user_name || ' "' || COALESCE(_store_name, '') || '" mağazası üçün ' || CASE WHEN NEW.request_type = 'delete' THEN 'silmə' ELSE 'redaktə' END || ' sorğusu göndərdi',
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_store_change_request_trigger AFTER INSERT ON public.store_change_requests FOR EACH ROW EXECUTE FUNCTION on_new_store_change_request();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
