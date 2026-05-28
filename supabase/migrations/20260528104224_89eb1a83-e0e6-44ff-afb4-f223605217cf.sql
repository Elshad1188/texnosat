
-- 1) Hide sensitive financial columns from anonymous users
REVOKE SELECT (amount_paid) ON public.contest_participants FROM anon;
REVOKE SELECT (cost_price) ON public.listings FROM anon;

-- 2) Tighten storage upload policies: enforce per-user folder scope
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload store logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload store logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3) Revoke anon EXECUTE on internal trigger / admin SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'generate_referral_code()',
    'on_new_listing()',
    'on_new_ticket()',
    'on_new_favorite()',
    'on_new_message()',
    'on_new_store()',
    'on_new_report()',
    'on_new_user_profile()',
    'check_low_stock_notification()',
    'update_conversation_last_message()',
    'on_new_message_notify_recipient()',
    'notify_store_followers_on_listing()',
    'handle_new_user()',
    'notify_saved_search_subscribers()',
    'on_new_review()',
    'on_new_store_change_request()',
    'on_notification_push()',
    'update_updated_at_column()',
    'validate_review_rating()',
    'validate_listing_deal_type()',
    'enqueue_email(text,jsonb)',
    'read_email_batch(text,integer,integer)',
    'delete_email(text,bigint)',
    'move_to_dlq(text,text,bigint,jsonb)',
    'finalize_current_contest()',
    'get_or_create_current_contest()',
    'notify_admins(text,text,text,text)',
    'admin_get_user_email(uuid)',
    'reset_user_spin_cooldown(uuid)',
    'spend_balance(uuid,numeric,text,uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, public', fn);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %: %', fn, SQLERRM;
    END;
  END LOOP;
END $$;
