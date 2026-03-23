ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE;

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);