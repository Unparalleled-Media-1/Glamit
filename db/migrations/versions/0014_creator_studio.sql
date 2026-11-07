-- Additive Creator Studio. Existing Auth, catalog and financial authorities remain canonical.
CREATE TABLE public.creator_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES public.organizations(id),
 handle text NOT NULL UNIQUE CHECK(handle ~ '^[a-z0-9][a-z0-9_-]{2,39}$' AND handle NOT IN ('admin','api','auth','support','privacy','terms','login','creator')),
 display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 160),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=4000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','suspended')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_profiles_org ON public.creator_profiles(organization_id);
CREATE TABLE public.connected_social_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('tiktok','instagram','youtube','pinterest','facebook')),
 provider_account_id text CHECK(length(provider_account_id) BETWEEN 1 AND 512),
 display_name text NOT NULL DEFAULT '' CHECK(length(display_name)<=160),
 profile_url text NOT NULL CHECK(length(profile_url)<=2048),
 status text NOT NULL DEFAULT 'manual_unverified' CHECK(status IN ('manual_unverified','connected','expired','revoked','error')),
 authorized_scopes text[] NOT NULL DEFAULT '{}',token_expires_at timestamptz,last_sync_at timestamptz,error_code text,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(creator_id,provider),UNIQUE(id,creator_id),
 CHECK(status<>'connected' OR (provider_account_id IS NOT NULL AND last_sync_at IS NOT NULL)),
 CHECK(error_code IS NULL OR error_code ~ '^[A-Z_]{3,100}$')
);
CREATE TABLE public.social_media_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
 connection_id uuid,provider text NOT NULL CHECK(provider IN ('tiktok','instagram','youtube','pinterest','facebook')),
 source_url text NOT NULL CHECK(length(source_url)<=2048),title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=4000),
 rights_confirmed boolean NOT NULL DEFAULT false,
 source text NOT NULL DEFAULT 'creator_submitted' CHECK(source IN ('creator_submitted','authorized_api')),
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(creator_id,source_url),UNIQUE(id,creator_id),
 FOREIGN KEY(connection_id,creator_id) REFERENCES public.connected_social_accounts(id,creator_id)
);
CREATE TABLE public.creator_collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),description text NOT NULL DEFAULT '' CHECK(length(description)<=4000),
 disclosure text NOT NULL DEFAULT '' CHECK(length(disclosure)<=1000),sponsored boolean NOT NULL DEFAULT false,
 rights_confirmed boolean NOT NULL DEFAULT false,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','rejected')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,creator_id),
 CHECK(NOT sponsored OR length(btrim(disclosure))>0)
);
CREATE TABLE public.creator_collection_items (
 collection_id uuid NOT NULL REFERENCES public.creator_collections(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id),position integer NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 99),
 PRIMARY KEY(collection_id,product_id)
);
CREATE TABLE public.creator_campaign_briefs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES public.organizations(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),
 deliverables text NOT NULL CHECK(length(btrim(deliverables)) BETWEEN 1 AND 4000),
 eligibility text NOT NULL DEFAULT '' CHECK(length(eligibility)<=2000),
 compensation_terms text NOT NULL CHECK(length(btrim(compensation_terms)) BETWEEN 1 AND 4000),
 disclosure text NOT NULL DEFAULT 'Sponsored' CHECK(length(btrim(disclosure)) BETWEEN 1 AND 500),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed','suspended')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id)
);
CREATE INDEX creator_campaign_org ON public.creator_campaign_briefs(organization_id);
CREATE TABLE public.creator_campaign_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),campaign_id uuid NOT NULL REFERENCES public.creator_campaign_briefs(id),
 creator_id uuid NOT NULL REFERENCES public.creator_profiles(id),pitch text NOT NULL CHECK(length(btrim(pitch)) BETWEEN 1 AND 4000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','accepted','declined','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(campaign_id,creator_id),UNIQUE(id,creator_id)
);
CREATE TABLE public.creator_campaign_deliverables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),application_id uuid NOT NULL,creator_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240),content_url text NOT NULL CHECK(length(content_url)<=2048),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','changes_requested')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(application_id,creator_id) REFERENCES public.creator_campaign_applications(id,creator_id)
);
CREATE TABLE public.creator_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL REFERENCES public.creator_profiles(id),
 collection_id uuid NOT NULL,code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
 disclosure text NOT NULL CHECK(length(btrim(disclosure)) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(collection_id,creator_id) REFERENCES public.creator_collections(id,creator_id),
 UNIQUE(creator_id,collection_id)
);
CREATE TABLE public.creator_attribution_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),referral_id uuid NOT NULL REFERENCES public.creator_referrals(id),
 source_event_id text NOT NULL UNIQUE CHECK(length(source_event_id) BETWEEN 1 AND 240),
 event_kind text NOT NULL CHECK(event_kind IN ('consented_interaction','verified_sale','verified_refund')),
 verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.creator_commission_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL REFERENCES public.creator_profiles(id),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 rate_bps integer NOT NULL CHECK(rate_bps BETWEEN 0 AND 10000),
 funded_by text NOT NULL CHECK(funded_by IN ('merchant','platform')),
 basis text NOT NULL CHECK(basis='eligible_item_net'),currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 terms text NOT NULL CHECK(length(btrim(terms)) BETWEEN 1 AND 4000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','signed','revoked')),
 evidence_reference text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,creator_id),
 CHECK(status<>'signed' OR (evidence_reference IS NOT NULL AND length(btrim(evidence_reference))>0))
);
CREATE TABLE public.creator_earnings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL,
 agreement_id uuid NOT NULL,attribution_event_id uuid NOT NULL REFERENCES public.creator_attribution_events(id),
 source_event_id text NOT NULL UNIQUE CHECK(length(source_event_id) BETWEEN 1 AND 240),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),amount_minor bigint NOT NULL,
 event_kind text NOT NULL CHECK(event_kind IN ('earned','reversed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(agreement_id,creator_id) REFERENCES public.creator_commission_agreements(id,creator_id),
 CHECK((event_kind='earned' AND amount_minor>=0) OR (event_kind='reversed' AND amount_minor<=0))
);
CREATE TABLE public.creator_payout_eligibility (
 creator_id uuid PRIMARY KEY REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'not_verified' CHECK(status IN ('not_verified','ineligible','eligible','suspended')),
 evidence_reference text,verified_at timestamptz,
 CHECK(status<>'eligible' OR (evidence_reference IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE TABLE public.creator_social_sync_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),connection_id uuid NOT NULL REFERENCES public.connected_social_accounts(id),
 status text NOT NULL CHECK(status IN ('succeeded','failed','rate_limited','permission_required')),
 error_code text CHECK(error_code IS NULL OR error_code ~ '^[A-Z_]{3,100}$'),
 item_count integer NOT NULL DEFAULT 0 CHECK(item_count>=0),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE SCHEMA creator_private;
REVOKE ALL ON SCHEMA creator_private FROM PUBLIC,anon,authenticated;
CREATE TABLE creator_private.social_credentials (
 connection_id uuid PRIMARY KEY REFERENCES public.connected_social_accounts(id),
 creator_id uuid NOT NULL,
 key_id text NOT NULL CHECK(length(key_id) BETWEEN 1 AND 100),
 encrypted_envelope bytea NOT NULL CHECK(octet_length(encrypted_envelope)>=28),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(connection_id,creator_id) REFERENCES public.connected_social_accounts(id,creator_id)
);
REVOKE ALL ON creator_private.social_credentials FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE creator_private.social_credentials ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION glam_private.creator_access(cid uuid,writing boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.creator_profiles p
 WHERE p.id=cid AND glam_private.active_profile_id() IS NOT NULL AND
 ((p.organization_id IS NULL AND p.profile_id=glam_private.active_profile_id()) OR
  (p.organization_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.organization_members m
   JOIN public.organizations o ON o.id=m.organization_id
   JOIN public.workspace_capability c ON c.organization_id=o.id
   WHERE o.id=p.organization_id AND m.user_id=glam_private.current_app_user_id()
   AND m.active AND NOT o.suspended AND c.workspace='creator' AND c.status='verified' AND c.expires_at>now()
   AND EXISTS(SELECT 1 FROM public.account_eligibility e WHERE e.user_id=m.user_id AND e.age_band='eligible_adult' AND e.expires_at>now())
   AND (m.role='owner' OR EXISTS(SELECT 1 FROM public.workspace_role r WHERE r.organization_id=o.id AND r.user_id=m.user_id AND r.workspace='creator'
     AND (NOT writing OR r.role IN ('admin','creator'))))))))
$$;
REVOKE ALL ON FUNCTION glam_private.creator_access(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION glam_private.creator_access(uuid,boolean) TO authenticated;
-- Direct client writes are forbidden. RPC derives ownership and whitelists every payload.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['creator_profiles','connected_social_accounts','social_media_items',
 'creator_collections','creator_collection_items','creator_campaign_briefs','creator_campaign_applications',
 'creator_campaign_deliverables','creator_referrals','creator_attribution_events','creator_commission_agreements',
 'creator_earnings','creator_payout_eligibility','creator_social_sync_logs'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
CREATE POLICY creator_profile_scope ON public.creator_profiles FOR SELECT TO authenticated USING(glam_private.creator_access(id));
CREATE POLICY creator_connections_scope ON public.connected_social_accounts FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_media_scope ON public.social_media_items FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_collections_scope ON public.creator_collections FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_items_scope ON public.creator_collection_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.creator_collections c WHERE c.id=collection_id AND glam_private.creator_access(c.creator_id)));
CREATE POLICY creator_campaign_scope ON public.creator_campaign_briefs FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY creator_applications_scope ON public.creator_campaign_applications FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id) OR EXISTS(SELECT 1 FROM public.creator_campaign_briefs b WHERE b.id=campaign_id AND glam_private.is_org_member(b.organization_id)));
CREATE POLICY creator_deliverables_scope ON public.creator_campaign_deliverables FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_referrals_scope ON public.creator_referrals FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_events_scope ON public.creator_attribution_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.creator_referrals r WHERE r.id=referral_id AND glam_private.creator_access(r.creator_id)));
CREATE POLICY creator_agreements_scope ON public.creator_commission_agreements FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id) OR glam_private.is_org_member(organization_id));
CREATE POLICY creator_earnings_scope ON public.creator_earnings FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_payout_scope ON public.creator_payout_eligibility FOR SELECT TO authenticated USING(glam_private.creator_access(creator_id));
CREATE POLICY creator_sync_scope ON public.creator_social_sync_logs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.connected_social_accounts a WHERE a.id=connection_id AND glam_private.creator_access(a.creator_id)));
CREATE FUNCTION glam_private.creator_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'CREATOR_EVIDENCE_APPEND_ONLY'; END $$;
CREATE TRIGGER creator_earnings_immutable BEFORE UPDATE OR DELETE ON public.creator_earnings FOR EACH ROW EXECUTE FUNCTION glam_private.creator_append_only();
CREATE TRIGGER creator_events_immutable BEFORE UPDATE OR DELETE ON public.creator_attribution_events FOR EACH ROW EXECUTE FUNCTION glam_private.creator_append_only();
CREATE FUNCTION glam_private.creator_url(provider text,url text,media boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF length(url)>2048 OR url ~ '[[:space:]\\]' OR url !~ '^https://' THEN RETURN false; END IF;
 CASE provider
 WHEN 'tiktok' THEN RETURN url ~* ('^https://(www\.)?tiktok\.com/@[A-Za-z0-9_.]+'||(CASE WHEN media THEN '/video/[0-9]+/?$' ELSE '/?$' END));
 WHEN 'instagram' THEN RETURN CASE WHEN media THEN url ~* '^https://(www\.)?instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?$' ELSE url ~* '^https://(www\.)?instagram\.com/[A-Za-z0-9_.]+/?$' AND url !~* '/(accounts|direct|explore|p|reel)/?$' END;
 WHEN 'youtube' THEN RETURN CASE WHEN media THEN url ~* '^https://(www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$' OR url ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}$' ELSE url ~* '^https://(www\.)?youtube\.com/(@[^/?#]+|channel/[A-Za-z0-9_-]+)/?$' END;
 WHEN 'pinterest' THEN RETURN url ~* ('^https://(www\.)?pinterest\.com/'||(CASE WHEN media THEN 'pin/[0-9]+/?$' ELSE '[A-Za-z0-9_]+/?$' END));
 WHEN 'facebook' THEN RETURN CASE WHEN media THEN url ~* '^https://(www\.)?facebook\.com/[A-Za-z0-9_.-]+/(videos|posts)/[A-Za-z0-9]+/?$' ELSE url ~* '^https://(www\.)?facebook\.com/([A-Za-z0-9_.-]+/?|profile\.php\?id=[0-9]+)$' AND url !~* '/(login|logout|dialog|share|sharer)(/|\?|$)' END;
 ELSE RETURN false; END CASE;
END $$;
REVOKE ALL ON FUNCTION glam_private.creator_url(text,text,boolean) FROM PUBLIC;
ALTER FUNCTION public.glam_api_v1(text,text,jsonb,text) RENAME TO glam_account_api_v1;
ALTER FUNCTION public.glam_account_api_v1(text,text,jsonb,text) SET SCHEMA glam_private;
REVOKE ALL ON FUNCTION glam_private.glam_account_api_v1(text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.glam_api_v1(p_method text,p_path text,p_body jsonb DEFAULT '{}',p_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;actor uuid;cid uuid;rid uuid;rowid uuid;result jsonb;profile_row public.creator_profiles;
BEGIN
 IF p_path NOT LIKE '/v1/me/creator%' THEN
  RETURN glam_private.glam_account_api_v1(p_method,p_path,p_body,p_key);
 END IF;
 IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>32768 THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END IF;
 uid:=glam_private.bootstrap_identity();actor:=auth.uid();
 IF NOT (public.glam_api_gate()->>'allowed')::boolean THEN RAISE SQLSTATE 'PT429' USING MESSAGE='RATE_LIMITED'; END IF;
 IF p_method<>'GET' AND NOT EXISTS(SELECT 1 FROM public.account_eligibility e WHERE e.user_id=uid AND e.age_band='eligible_adult' AND e.expires_at>now()) THEN RAISE SQLSTATE 'PT403' USING MESSAGE='CREATOR_ADULT_ELIGIBILITY_REQUIRED'; END IF;
 IF p_path='/v1/me/creator' AND p_method='GET' THEN
  SELECT * INTO profile_row FROM public.creator_profiles WHERE profile_id=actor;
  IF NOT FOUND THEN RETURN jsonb_build_object('profile',NULL,'connections','[]'::jsonb,'media','[]'::jsonb,'collections','[]'::jsonb,'applications','[]'::jsonb,'agreements','[]'::jsonb,'earnings','[]'::jsonb,'referrals','[]'::jsonb,'payout_eligibility','not_verified','oauth_available',false,'posting_available',false,'payouts_available',false); END IF;
  cid:=profile_row.id;
  RETURN jsonb_build_object('profile',to_jsonb(profile_row),
   'connections',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.provider) FROM public.connected_social_accounts a WHERE creator_id=cid),'[]'::jsonb),
   'media',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY created_at DESC) FROM public.social_media_items m WHERE creator_id=cid),'[]'::jsonb),
   'collections',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY created_at DESC) FROM public.creator_collections c WHERE creator_id=cid),'[]'::jsonb),
   'applications',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY created_at DESC) FROM public.creator_campaign_applications a WHERE creator_id=cid),'[]'::jsonb),
   'agreements',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM public.creator_commission_agreements a WHERE creator_id=cid),'[]'::jsonb),
   'earnings',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY created_at DESC) FROM public.creator_earnings e WHERE creator_id=cid),'[]'::jsonb),
   'referrals',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM public.creator_referrals r WHERE creator_id=cid),'[]'::jsonb),
   'payout_eligibility',coalesce((SELECT status FROM public.creator_payout_eligibility WHERE creator_id=cid),'not_verified'),
   'oauth_available',false,'posting_available',false,'payouts_available',false);
 ELSIF p_path='/v1/me/creator/profile' AND p_method IN ('POST','PATCH') THEN
  IF p_body-ARRAY['handle','display_name','bio','expected_revision']<>'{}' THEN RAISE SQLSTATE 'PT422' USING MESSAGE='UNEXPECTED_PROFILE_FIELD'; END IF;
  SELECT * INTO profile_row FROM public.creator_profiles WHERE profile_id=actor FOR UPDATE;
  IF FOUND THEN
   IF p_method='POST' THEN RAISE SQLSTATE 'PT409' USING MESSAGE='CREATOR_PROFILE_EXISTS'; END IF;
   IF (p_body->>'expected_revision')::integer IS DISTINCT FROM profile_row.revision THEN RAISE SQLSTATE 'PT409' USING MESSAGE='REVISION_CONFLICT'; END IF;
   UPDATE public.creator_profiles SET handle=coalesce(p_body->>'handle',handle),display_name=coalesce(p_body->>'display_name',display_name),bio=coalesce(p_body->>'bio',bio),revision=revision+1,updated_at=now() WHERE id=profile_row.id RETURNING to_jsonb(creator_profiles) INTO result;
  ELSE
   IF p_method<>'POST' THEN RAISE SQLSTATE 'PT404' USING MESSAGE='CREATOR_NOT_FOUND'; END IF;
   INSERT INTO public.creator_profiles(profile_id,handle,display_name,bio) VALUES(actor,p_body->>'handle',p_body->>'display_name',coalesce(p_body->>'bio','')) RETURNING to_jsonb(creator_profiles) INTO result;
   INSERT INTO public.creator_payout_eligibility(creator_id) VALUES((result->>'id')::uuid);
  END IF;
  INSERT INTO public.audit_event(id,actor_id,action,resource_id) VALUES(gen_random_uuid(),uid,'creator.profile.saved',(result->>'id')::uuid);
  RETURN result;
 END IF;
 SELECT id INTO cid FROM public.creator_profiles WHERE profile_id=actor;
 IF cid IS NULL THEN RAISE SQLSTATE 'PT404' USING MESSAGE='CREATOR_NOT_FOUND'; END IF;
 IF p_path='/v1/me/creator/connections' AND p_method='POST' THEN
  IF p_body-ARRAY['provider','profile_url','display_name']<>'{}' OR NOT coalesce(glam_private.creator_url(p_body->>'provider',p_body->>'profile_url'),false) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='INVALID_SOCIAL_PROFILE'; END IF;
  -- An actual OAuth connection may not be silently downgraded without revocation.
  IF EXISTS(SELECT 1 FROM public.connected_social_accounts WHERE creator_id=cid AND provider=p_body->>'provider' AND (status NOT IN ('manual_unverified','revoked') OR EXISTS(SELECT 1 FROM creator_private.social_credentials sc WHERE sc.connection_id=connected_social_accounts.id))) THEN RAISE SQLSTATE 'PT409' USING MESSAGE='DISCONNECT_REQUIRED'; END IF;
  INSERT INTO public.connected_social_accounts(creator_id,provider,profile_url,display_name)
   VALUES(cid,p_body->>'provider',p_body->>'profile_url',coalesce(p_body->>'display_name',''))
   ON CONFLICT(creator_id,provider) DO UPDATE SET profile_url=excluded.profile_url,display_name=excluded.display_name,status='manual_unverified',provider_account_id=NULL,authorized_scopes='{}',token_expires_at=NULL,last_sync_at=NULL,error_code=NULL,revision=public.connected_social_accounts.revision+1,updated_at=now() RETURNING to_jsonb(connected_social_accounts) INTO result;
  RETURN result;
 ELSIF p_path ~ '^/v1/me/creator/connections/[a-fA-F0-9-]{36}$' AND p_method='DELETE' THEN
  rowid:=split_part(p_path,'/',6)::uuid;
  IF EXISTS(SELECT 1 FROM public.connected_social_accounts WHERE id=rowid AND creator_id=cid AND (status NOT IN ('manual_unverified','revoked') OR EXISTS(SELECT 1 FROM creator_private.social_credentials sc WHERE sc.connection_id=connected_social_accounts.id))) THEN RAISE SQLSTATE 'PT409' USING MESSAGE='PROVIDER_REVOCATION_REQUIRED'; END IF;
  UPDATE public.connected_social_accounts SET status='revoked',authorized_scopes='{}',token_expires_at=NULL,updated_at=now() WHERE id=rowid AND creator_id=cid;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE='NOT_FOUND'; END IF;
  RETURN '{}'::jsonb;
 ELSIF p_path='/v1/me/creator/media' AND p_method='POST' THEN
  IF p_body-ARRAY['provider','source_url','title','description','rights_confirmed']<>'{}' OR jsonb_typeof(p_body->'rights_confirmed') IS DISTINCT FROM 'boolean' OR NOT coalesce(glam_private.creator_url(p_body->>'provider',p_body->>'source_url',true),false) THEN RAISE SQLSTATE 'PT422' USING MESSAGE='INVALID_CONTENT'; END IF;
  IF NOT (p_body->>'rights_confirmed')::boolean THEN RAISE SQLSTATE 'PT422' USING MESSAGE='CONTENT_RIGHTS_REQUIRED'; END IF;
  INSERT INTO public.social_media_items(creator_id,provider,source_url,title,description,rights_confirmed) VALUES(cid,p_body->>'provider',p_body->>'source_url',p_body->>'title',coalesce(p_body->>'description',''),true) RETURNING to_jsonb(social_media_items) INTO result;
  RETURN result;
 ELSIF p_path='/v1/me/creator/collections' AND p_method='POST' THEN
  IF p_body-ARRAY['title','description','disclosure','sponsored','rights_confirmed','product_ids']<>'{}' OR jsonb_typeof(p_body->'sponsored') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_body->'rights_confirmed') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_body->'product_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_body->'product_ids')>100 THEN RAISE SQLSTATE 'PT422' USING MESSAGE='INVALID_COLLECTION'; END IF;
  IF NOT (p_body->>'rights_confirmed')::boolean THEN RAISE SQLSTATE 'PT422' USING MESSAGE='CONTENT_RIGHTS_REQUIRED'; END IF;
  INSERT INTO public.creator_collections(creator_id,title,description,disclosure,sponsored,rights_confirmed) VALUES(cid,p_body->>'title',coalesce(p_body->>'description',''),coalesce(p_body->>'disclosure',''),(p_body->>'sponsored')::boolean,(p_body->>'rights_confirmed')::boolean) RETURNING id INTO rid;
  IF jsonb_array_length(p_body->'product_ids')>0 THEN RAISE SQLSTATE 'PT409' USING MESSAGE='QUALIFIED_CATALOG_SELECTION_REQUIRED'; END IF;
  RETURN (SELECT to_jsonb(c) FROM public.creator_collections c WHERE id=rid);
 ELSIF p_method='DELETE' AND p_path ~ '^/v1/me/creator/(media|collections)/[a-fA-F0-9-]{36}$' THEN
  rowid:=split_part(p_path,'/',6)::uuid;
  IF split_part(p_path,'/',5)='media' THEN
   DELETE FROM public.social_media_items WHERE id=rowid AND creator_id=cid AND publication_status='draft';
  ELSE
   DELETE FROM public.creator_collections WHERE id=rowid AND creator_id=cid AND status='draft';
  END IF;
  IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE='NOT_FOUND'; END IF;
  RETURN '{}'::jsonb;
 ELSIF p_path='/v1/me/creator/earnings' AND p_method='GET' THEN
  RETURN jsonb_build_object('entries',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM public.creator_earnings e WHERE creator_id=cid),'[]'::jsonb),'balance',NULL,'payouts_available',false,'reason','VERIFIED_FINANCIAL_EVENTS_REQUIRED');
 ELSIF p_path LIKE '/v1/me/creator/%/publish' THEN
  RAISE SQLSTATE 'PT409' USING MESSAGE='PUBLICATION_QUALIFICATION_REQUIRED';
 ELSIF p_path LIKE '/v1/me/creator/%/authorize' OR p_path LIKE '/v1/me/creator/%/sync' THEN
  RAISE SQLSTATE 'PT503' USING MESSAGE='SOCIAL_PROVIDER_NOT_QUALIFIED';
 END IF;
 RAISE SQLSTATE 'PT501' USING MESSAGE='CREATOR_OPERATION_NOT_IMPLEMENTED';
END $$;
REVOKE ALL ON FUNCTION public.glam_api_v1(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_v1(text,text,jsonb,text) TO authenticated;
