-- GENERATED from canonical Alembic application@head; do not edit.
-- Starting revision: 0012_hosted_routines; excludes Stripe sandbox0009.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE FUNCTION glam_private.active_profile_id() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated' THEN RETURN NULL; END IF;
  BEGIN sid:=(auth.jwt()->>'session_id')::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END;
  IF EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=auth.uid()
    AND (s.not_after IS NULL OR s.not_after>now())) THEN RETURN auth.uid(); END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION glam_private.active_profile_id() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION glam_private.active_profile_id() TO authenticated;

CREATE OR REPLACE FUNCTION glam_private.current_app_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u.id FROM public.app_user u WHERE u.subject=glam_private.active_profile_id()::text
  AND u.issuer=auth.jwt()->>'iss'
$$;

ALTER POLICY profiles_select_self ON public.profiles USING(id=glam_private.active_profile_id());
ALTER POLICY profiles_insert_self ON public.profiles WITH CHECK(id=glam_private.active_profile_id());
ALTER POLICY profiles_update_self ON public.profiles USING(id=glam_private.active_profile_id()) WITH CHECK(id=glam_private.active_profile_id());
DO $$ DECLARE t text; p text; BEGIN
 FOREACH t IN ARRAY ARRAY['user_preferences','style_passports'] LOOP
  FOREACH p IN ARRAY CASE t WHEN 'user_preferences' THEN ARRAY['preferences_select_self','preferences_insert_self','preferences_update_self','preferences_delete_self'] ELSE ARRAY['passports_select_self','passports_insert_self','passports_update_self','passports_delete_self'] END LOOP
   IF p LIKE '%insert%' THEN EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK(profile_id=glam_private.active_profile_id())',p,t);
   ELSIF p LIKE '%update%' THEN EXECUTE format('ALTER POLICY %I ON public.%I USING(profile_id=glam_private.active_profile_id()) WITH CHECK(profile_id=glam_private.active_profile_id())',p,t);
   ELSE EXECUTE format('ALTER POLICY %I ON public.%I USING(profile_id=glam_private.active_profile_id())',p,t); END IF;
  END LOOP;
 END LOOP;
END $$;

CREATE TABLE public.notification_preferences (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 sms_updates boolean NOT NULL DEFAULT false,
 email_updates boolean NOT NULL DEFAULT false,
 push_updates boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.device_auth_preferences (
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 device_id uuid NOT NULL,
 platform text NOT NULL CHECK(platform IN ('ios','android')),
 biometric_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(profile_id,device_id)
);
COMMENT ON COLUMN public.device_auth_preferences.biometric_enabled IS 'User-declared convenience preference; never server authentication or MFA evidence.';
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_auth_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences,public.device_auth_preferences FROM anon,authenticated;
GRANT SELECT ON public.notification_preferences,public.device_auth_preferences TO authenticated;
CREATE POLICY notifications_self ON public.notification_preferences FOR SELECT TO authenticated USING(profile_id=glam_private.active_profile_id());
CREATE POLICY device_preferences_self ON public.device_auth_preferences FOR SELECT TO authenticated USING(profile_id=glam_private.active_profile_id());

CREATE OR REPLACE FUNCTION glam_private.bootstrap_identity() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; subject_id uuid:=glam_private.active_profile_id(); v_issuer text:=auth.jwt()->>'iss';
BEGIN
 IF subject_id IS NULL OR v_issuer IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='AUTHENTICATION_REQUIRED'; END IF;
 INSERT INTO public.app_user(id,issuer,subject) VALUES(gen_random_uuid(),v_issuer,subject_id::text) ON CONFLICT(issuer,subject) DO NOTHING;
 SELECT id INTO uid FROM public.app_user WHERE issuer=v_issuer AND subject=subject_id::text FOR UPDATE;
 INSERT INTO public.credit_account(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
 INSERT INTO public.profiles(id) VALUES(subject_id) ON CONFLICT DO NOTHING;
 INSERT INTO public.user_preferences(profile_id) VALUES(subject_id) ON CONFLICT DO NOTHING;
 INSERT INTO public.notification_preferences(profile_id) VALUES(subject_id) ON CONFLICT DO NOTHING;
 RETURN uid;
END $$;
CREATE OR REPLACE FUNCTION public.glam_api_gate() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; uid uuid:=glam_private.active_profile_id();
BEGIN
 IF uid IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='SESSION_REVOKED_OR_EXPIRED'; END IF;
 INSERT INTO public.api_request_counters(user_id,window_start,request_count) VALUES(uid,date_trunc('minute',clock_timestamp()),1)
 ON CONFLICT(user_id,window_start) DO UPDATE SET request_count=least(public.api_request_counters.request_count+1,121) RETURNING request_count INTO n;
 RETURN jsonb_build_object('allowed',n<=120,'retry_after',60);
END $$;

ALTER FUNCTION public.glam_api_v1(text,text,jsonb,text) RENAME TO glam_routines_api_v1;
ALTER FUNCTION public.glam_routines_api_v1(text,text,jsonb,text) SET SCHEMA glam_private;
REVOKE ALL ON FUNCTION glam_private.glam_routines_api_v1(text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.glam_api_v1(p_method text,p_path text,p_body jsonb DEFAULT '{}',p_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; subject_id uuid; result jsonb; did uuid;
BEGIN
 IF p_path NOT IN ('/v1/me/notifications','/v1/me/devices','/v1/me/consents') AND p_path NOT LIKE '/v1/me/devices/%' THEN
  RETURN glam_private.glam_routines_api_v1(p_method,p_path,p_body,p_key);
 END IF;
 IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>32768 THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END IF;
 uid:=glam_private.bootstrap_identity();subject_id:=auth.uid();
 IF NOT (public.glam_api_gate()->>'allowed')::boolean THEN RAISE SQLSTATE 'PT429' USING MESSAGE='RATE_LIMITED'; END IF;
 IF p_path='/v1/me/notifications' THEN
  IF p_method='PATCH' THEN
   IF p_body-ARRAY['sms_updates','email_updates','push_updates','expected_revision']<>'{}'
    OR jsonb_typeof(p_body->'expected_revision') IS DISTINCT FROM 'number'
    OR EXISTS(SELECT 1 FROM jsonb_each(p_body) f WHERE f.key<>'expected_revision' AND jsonb_typeof(f.value)<>'boolean') THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END IF;
   UPDATE public.notification_preferences SET sms_updates=coalesce((p_body->>'sms_updates')::boolean,sms_updates),email_updates=coalesce((p_body->>'email_updates')::boolean,email_updates),push_updates=coalesce((p_body->>'push_updates')::boolean,push_updates),revision=revision+1,updated_at=now()
    WHERE profile_id=subject_id AND revision=(p_body->>'expected_revision')::integer RETURNING to_jsonb(notification_preferences) INTO result;
   IF result IS NULL THEN RAISE SQLSTATE 'PT409' USING MESSAGE='REVISION_CONFLICT'; END IF;
   RETURN result;
  ELSIF p_method='GET' THEN RETURN (SELECT to_jsonb(n) FROM public.notification_preferences n WHERE profile_id=subject_id); END IF;
 ELSIF p_path='/v1/me/consents' AND p_method='GET' THEN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM
   (SELECT DISTINCT ON (p.purpose) p.purpose,c.policy_id,c.action,c.created_at FROM public.consent_event c JOIN public.policy_document p ON p.id=c.policy_id WHERE c.user_id=uid ORDER BY p.purpose,c.sequence DESC) e),'[]'::jsonb);
 ELSIF p_path='/v1/me/devices' AND p_method='GET' THEN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM public.device_auth_preferences d WHERE d.profile_id=subject_id),'[]'::jsonb);
 ELSIF p_path LIKE '/v1/me/devices/%' THEN
  IF p_path !~ '^/v1/me/devices/[a-fA-F0-9-]{36}$' THEN RAISE SQLSTATE 'PT404' USING MESSAGE='NOT_FOUND'; END IF;
  BEGIN did:=split_part(p_path,'/',5)::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END;
  IF did IS NULL THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END IF;
  IF p_method='PUT' THEN
   IF p_body-ARRAY['platform','biometric_enabled']<>'{}' OR p_body->>'platform' NOT IN ('ios','android') OR jsonb_typeof(p_body->'platform') IS DISTINCT FROM 'string' OR jsonb_typeof(p_body->'biometric_enabled') IS DISTINCT FROM 'boolean' THEN RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR'; END IF;
   INSERT INTO public.device_auth_preferences(profile_id,device_id,platform,biometric_enabled) VALUES(subject_id,did,p_body->>'platform',(p_body->>'biometric_enabled')::boolean)
   ON CONFLICT(profile_id,device_id) DO UPDATE SET platform=excluded.platform,biometric_enabled=excluded.biometric_enabled,updated_at=now() RETURNING to_jsonb(device_auth_preferences) INTO result;
   RETURN result;
  ELSIF p_method='DELETE' THEN DELETE FROM public.device_auth_preferences WHERE profile_id=subject_id AND device_id=did; RETURN 'null'::jsonb; END IF;
 END IF;
 RAISE SQLSTATE 'PT405' USING MESSAGE='METHOD_NOT_ALLOWED';
END $$;
REVOKE ALL ON FUNCTION public.glam_api_v1(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_v1(text,text,jsonb,text) TO authenticated;

UPDATE alembic_version SET version_num='0013_passwordless_accounts' WHERE alembic_version.version_num = '0012_hosted_routines';
COMMIT;
