-- RECOVERY SCRIPT, NOT AN ALEMBIC REVISION. Review-only until the owner approves this exact SQL.
-- Reverses 0014_creator_studio ONLY while the application head is still 0014 and no creator data exists.
-- If anything newer is applied, or any creator row exists, it refuses: use the pre-migration backup or a
-- reviewed forward migration with a data decision instead. One transaction; execute once, never auto-retry.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$
DECLARE t text; n bigint;
BEGIN
  IF (SELECT count(*) FROM public.alembic_version WHERE version_num<>'0009_stripe_test_ledger')<>1
     OR NOT EXISTS(SELECT 1 FROM public.alembic_version WHERE version_num='0014_creator_studio') THEN
    RAISE EXCEPTION 'Rollback is valid only while the application head is exactly 0014_creator_studio';
  END IF;
  FOREACH t IN ARRAY ARRAY['public.creator_profiles','public.connected_social_accounts','public.social_media_items',
   'public.creator_collections','public.creator_collection_items','public.creator_campaign_briefs',
   'public.creator_campaign_applications','public.creator_campaign_deliverables','public.creator_referrals',
   'public.creator_attribution_events','public.creator_commission_agreements','public.creator_earnings',
   'public.creator_payout_eligibility','public.creator_social_sync_logs','creator_private.social_credentials'] LOOP
    EXECUTE format('SELECT count(*) FROM %s',t) INTO n;
    IF n>0 THEN RAISE EXCEPTION 'Creator data exists in %: rollback refused (restore a backup or write a reviewed data-preserving fix)',t; END IF;
  END LOOP;
END $$;

-- 1. Restore the original RPC: drop the creator-aware wrapper, move the original back and rename it.
DROP FUNCTION public.glam_api_v1(text,text,jsonb,text);
ALTER FUNCTION glam_private.glam_account_api_v1(text,text,jsonb,text) SET SCHEMA public;
ALTER FUNCTION public.glam_account_api_v1(text,text,jsonb,text) RENAME TO glam_api_v1;
REVOKE ALL ON FUNCTION public.glam_api_v1(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_v1(text,text,jsonb,text) TO authenticated;

-- 2. Remove the (empty) creator objects. Policies and triggers go with their tables.
DROP TABLE creator_private.social_credentials;
DROP SCHEMA creator_private;
DROP TABLE public.creator_social_sync_logs, public.creator_payout_eligibility, public.creator_earnings,
  public.creator_commission_agreements, public.creator_attribution_events, public.creator_referrals,
  public.creator_campaign_deliverables, public.creator_campaign_applications, public.creator_campaign_briefs,
  public.creator_collection_items, public.creator_collections, public.social_media_items,
  public.connected_social_accounts, public.creator_profiles;
DROP FUNCTION glam_private.creator_access(uuid,boolean);
DROP FUNCTION glam_private.creator_url(text,text,boolean);
DROP FUNCTION glam_private.creator_append_only();

UPDATE public.alembic_version SET version_num='0013_passwordless_accounts' WHERE version_num='0014_creator_studio';
COMMIT;
