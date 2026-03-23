CREATE OR REPLACE FUNCTION public.delete_own_message(_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_user_id uuid := auth.uid();
  _deleted_count integer := 0;
BEGIN
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.messages m
  USING public.conversations c
  WHERE m.id = _message_id
    AND m.sender_id = _current_user_id
    AND c.id = m.conversation_id
    AND (c.buyer_id = _current_user_id OR c.seller_id = _current_user_id);

  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_conversation_for_user(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_user_id uuid := auth.uid();
  _deleted_count integer := 0;
BEGIN
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (c.buyer_id = _current_user_id OR c.seller_id = _current_user_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  DELETE FROM public.messages
  WHERE conversation_id = _conversation_id;

  DELETE FROM public.conversations
  WHERE id = _conversation_id
    AND (buyer_id = _current_user_id OR seller_id = _current_user_id);

  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_conversation_for_user(uuid) TO authenticated;