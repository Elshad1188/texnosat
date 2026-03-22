
-- Enhance messaging system with deletion and better read tracking

-- 1. Add columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- 2. Add deletion tracking to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS buyer_deleted_at timestamp with time zone;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS seller_deleted_at timestamp with time zone;

-- 3. Function to mark messages as read with timestamp
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(msg_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true, read_at = now()
  WHERE id = ANY(msg_ids)
  AND sender_id != auth.uid();
END;
$$;

-- 4. Update conversations when a message is deleted (optional but good for last_message_at)
-- If we want to hide conversations that are "fully deleted", we use the deleted_at columns.

-- 5. Update RLS policies for messages to hide deleted ones
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR SELECT USING (
    is_deleted = false AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- 6. Add policy for users to delete their own messages (soft delete)
CREATE POLICY "Users can soft delete their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (is_deleted = true);

-- 7. Add policy for users to delete conversations (soft delete)
CREATE POLICY "Users can soft delete their own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
