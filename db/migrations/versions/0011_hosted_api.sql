-- Hosted transport shares the canonical database and the existing /v1 contracts.
CREATE TABLE public.api_request_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK(request_count>0),
  PRIMARY KEY(user_id,window_start)
);
CREATE INDEX api_request_counters_expiry ON public.api_request_counters(window_start);
ALTER TABLE public.api_request_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_request_counters FROM anon,authenticated;
CREATE POLICY counters_server_only ON public.api_request_counters TO anon,authenticated
  USING(false) WITH CHECK(false);

CREATE FUNCTION glam_private.canonical_json(v jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE raw text; output text:=''; ch text; cp integer;
BEGIN
  CASE jsonb_typeof(v)
  WHEN 'object' THEN
    SELECT '{'||coalesce(string_agg(to_json(key)::text||':'||glam_private.canonical_json(value),',' ORDER BY key COLLATE "C"),'')||'}'
    INTO raw FROM jsonb_each(v);
  WHEN 'array' THEN
    SELECT '['||coalesce(string_agg(glam_private.canonical_json(value),',' ORDER BY ord),'')||']'
    INTO raw FROM jsonb_array_elements(v) WITH ORDINALITY t(value,ord);
  ELSE raw:=v::text;
  END CASE;
  FOR i IN 1..length(raw) LOOP
    ch:=substr(raw,i,1); cp:=ascii(ch);
    IF cp<=127 THEN output:=output||ch;
    ELSIF cp<=65535 THEN output:=output||'\u'||lpad(to_hex(cp),4,'0');
    ELSE
      cp:=cp-65536;
      output:=output||'\u'||lpad(to_hex(55296+(cp>>10)),4,'0')||'\u'||lpad(to_hex(56320+(cp&1023)),4,'0');
    END IF;
  END LOOP;
  RETURN output;
END $$;
REVOKE ALL ON FUNCTION glam_private.canonical_json(jsonb) FROM PUBLIC;

CREATE FUNCTION glam_private.bootstrap_identity() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; subject_id uuid:=auth.uid(); v_issuer text:=auth.jwt()->>'iss';
BEGIN
  IF subject_id IS NULL OR v_issuer IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated' THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE='AUTHENTICATION_REQUIRED';
  END IF;
  INSERT INTO public.app_user(id,issuer,subject) VALUES(gen_random_uuid(),v_issuer,subject_id::text)
    ON CONFLICT(issuer,subject) DO NOTHING;
  SELECT id INTO uid FROM public.app_user WHERE app_user.issuer=v_issuer AND subject=subject_id::text FOR UPDATE;
  INSERT INTO public.credit_account(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles(id) VALUES(subject_id) ON CONFLICT DO NOTHING;
  RETURN uid;
END $$;
REVOKE ALL ON FUNCTION glam_private.bootstrap_identity() FROM PUBLIC;

-- Separate committed gateway meter also counts requests whose later operation fails.
CREATE FUNCTION public.glam_api_gate() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated' THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE='AUTHENTICATION_REQUIRED';
  END IF;
  INSERT INTO public.api_request_counters(user_id,window_start,request_count)
    VALUES(auth.uid(),date_trunc('minute',clock_timestamp()),1)
    ON CONFLICT(user_id,window_start) DO UPDATE
      SET request_count=least(public.api_request_counters.request_count+1,121)
    RETURNING request_count INTO n;
  RETURN jsonb_build_object('allowed',n<=120,'retry_after',60);
END $$;
REVOKE ALL ON FUNCTION public.glam_api_gate() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_gate() TO authenticated;

CREATE FUNCTION public.glam_backend_status() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('status','ready','scope','hosted_core_api','migration',
   (SELECT version_num FROM public.alembic_version WHERE version_num<>'0009_stripe_test_ledger' LIMIT 1))
$$;
REVOKE ALL ON FUNCTION public.glam_backend_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_backend_status() TO authenticated,service_role;

CREATE FUNCTION public.glam_api_v1(p_method text,p_path text,p_body jsonb DEFAULT '{}',p_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; subject_id uuid:=auth.uid(); result jsonb; cached record; v_route text; body_hash text;
        row_id uuid; expected integer; count_now integer; name_value text; actor_claims jsonb:=auth.jwt();
BEGIN
  IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>32768 THEN
    RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
  END IF;
  uid:=glam_private.bootstrap_identity();
  INSERT INTO public.api_request_counters(user_id,window_start,request_count)
    VALUES(subject_id,date_trunc('minute',clock_timestamp()),1)
    ON CONFLICT(user_id,window_start) DO UPDATE SET request_count=public.api_request_counters.request_count+1
    RETURNING request_count INTO count_now;
  IF count_now>120 THEN RAISE SQLSTATE 'PT429' USING MESSAGE='RATE_LIMITED'; END IF;

  IF p_method='GET' AND p_path='/v1/me' THEN RETURN jsonb_build_object('id',uid); END IF;
  IF p_method='GET' AND p_path='/v1/me/profile' THEN
    RETURN (SELECT to_jsonb(p) FROM public.profiles p WHERE id=subject_id);
  END IF;
  IF p_method='PATCH' AND p_path='/v1/me/profile' THEN
    IF p_body-ARRAY['display_name','avatar_object_key']<>'{}' THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='UNKNOWN_PROFILE_FIELD';
    END IF;
    IF p_body ? 'display_name' AND p_body->>'display_name' IS NOT NULL
       AND (jsonb_typeof(p_body->'display_name')<>'string' OR length(btrim(p_body->>'display_name'))=0) THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
    END IF;
    IF p_body->>'avatar_object_key' IS NOT NULL AND
       (NOT starts_with(p_body->>'avatar_object_key',subject_id::text||'/') OR
        position('..' IN p_body->>'avatar_object_key')>0 OR position('?' IN p_body->>'avatar_object_key')>0) THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE='PRIVATE_OBJECT_OWNER_MISMATCH';
    END IF;
    UPDATE public.profiles SET
      display_name=CASE WHEN p_body ? 'display_name' THEN p_body->>'display_name' ELSE display_name END,
      avatar_object_key=CASE WHEN p_body ? 'avatar_object_key' THEN p_body->>'avatar_object_key' ELSE avatar_object_key END
      WHERE id=subject_id RETURNING to_jsonb(profiles) INTO result;
    RETURN result;
  END IF;

  IF p_path='/v1/me/preferences' AND p_method IN ('GET','PATCH') THEN
    INSERT INTO public.user_preferences(profile_id) VALUES(subject_id) ON CONFLICT DO NOTHING;
    IF p_method='PATCH' THEN
      IF p_body-ARRAY['locale','currency','measurement_system','personalization_opt_in','marketing_opt_in']<>'{}'
        OR (p_body ? 'personalization_opt_in' AND jsonb_typeof(p_body->'personalization_opt_in')<>'boolean')
        OR (p_body ? 'marketing_opt_in' AND jsonb_typeof(p_body->'marketing_opt_in')<>'boolean') THEN
        RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
      END IF;
      UPDATE public.user_preferences SET locale=coalesce(p_body->>'locale',locale),currency=coalesce(p_body->>'currency',currency),
        measurement_system=coalesce(p_body->>'measurement_system',measurement_system),
        personalization_opt_in=coalesce((p_body->>'personalization_opt_in')::boolean,personalization_opt_in),
        marketing_opt_in=coalesce((p_body->>'marketing_opt_in')::boolean,marketing_opt_in)
        WHERE profile_id=subject_id;
    END IF;
    RETURN (SELECT to_jsonb(p) FROM public.user_preferences p WHERE profile_id=subject_id);
  END IF;

  IF p_path='/v1/me/style-passport' AND p_method IN ('GET','PATCH') THEN
    INSERT INTO public.style_passports(profile_id) VALUES(subject_id) ON CONFLICT DO NOTHING;
    IF p_method='PATCH' THEN
      IF p_body-ARRAY['preferred_colors','preferred_styles','coverage_preference','sizing_notes','expected_revision']<>'{}'
        OR jsonb_typeof(p_body->'expected_revision') IS DISTINCT FROM 'number' THEN
        RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
      END IF;
      FOREACH name_value IN ARRAY ARRAY['preferred_colors','preferred_styles'] LOOP
        IF p_body ? name_value AND (jsonb_typeof(p_body->name_value)<>'array' OR
          EXISTS(SELECT 1 FROM jsonb_array_elements(p_body->name_value) a WHERE jsonb_typeof(a)<>'string')) THEN
          RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
        END IF;
      END LOOP;
      UPDATE public.style_passports SET
        preferred_colors=CASE WHEN p_body ? 'preferred_colors' THEN ARRAY(SELECT jsonb_array_elements_text(p_body->'preferred_colors')) ELSE preferred_colors END,
        preferred_styles=CASE WHEN p_body ? 'preferred_styles' THEN ARRAY(SELECT jsonb_array_elements_text(p_body->'preferred_styles')) ELSE preferred_styles END,
        coverage_preference=CASE WHEN p_body ? 'coverage_preference' THEN p_body->>'coverage_preference' ELSE coverage_preference END,
        sizing_notes=CASE WHEN p_body ? 'sizing_notes' THEN p_body->>'sizing_notes' ELSE sizing_notes END,
        revision=revision+1
        WHERE profile_id=subject_id AND revision=(p_body->>'expected_revision')::integer RETURNING to_jsonb(style_passports) INTO result;
      IF result IS NULL THEN RAISE SQLSTATE 'PT409' USING MESSAGE='REVISION_CONFLICT'; END IF;
      RETURN result;
    END IF;
    RETURN (SELECT to_jsonb(p) FROM public.style_passports p WHERE profile_id=subject_id);
  END IF;

  IF p_method='POST' AND p_path='/v1/organizations' THEN
    IF p_body-ARRAY['name']<>'{}' OR jsonb_typeof(p_body->'name') IS DISTINCT FROM 'string'
      OR length(btrim(p_body->>'name')) NOT BETWEEN 1 AND 160 OR p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 160 THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
    END IF;
    v_route:='organizations';body_hash:=encode(sha256(convert_to(glam_private.canonical_json(p_body),'UTF8')),'hex');
    SELECT request_hash,response INTO cached FROM public.idempotency_record WHERE user_id=uid AND idempotency_record.route=v_route AND key=p_key;
    IF FOUND THEN
      IF cached.request_hash<>body_hash THEN RAISE SQLSTATE 'PT409' USING MESSAGE='IDEMPOTENCY_CONFLICT'; END IF;
      RETURN cached.response;
    END IF;
    row_id:=gen_random_uuid();
    INSERT INTO public.organizations(id,name) VALUES(row_id,p_body->>'name');
    INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(row_id,uid,'owner');
    INSERT INTO public.audit_event(id,actor_id,action,resource_id) VALUES(gen_random_uuid(),uid,'organization.created',row_id);
    result:=jsonb_build_object('id',row_id,'name',p_body->>'name');
    INSERT INTO public.idempotency_record(user_id,route,key,request_hash,response) VALUES(uid,v_route,p_key,body_hash,result);
    RETURN result;
  END IF;
  IF p_method='GET' AND p_path ~ '^/v1/organizations/[a-fA-F0-9-]{36}$' THEN
    row_id:=split_part(p_path,'/',4)::uuid;
    SELECT jsonb_build_object('id',o.id,'name',o.name,'role',m.role) INTO result
      FROM public.organizations o JOIN public.organization_members m ON m.organization_id=o.id
      WHERE o.id=row_id AND m.user_id=uid AND m.active AND NOT o.suspended;
    IF result IS NULL THEN RAISE SQLSTATE 'PT404' USING MESSAGE='NOT_FOUND'; END IF;
    RETURN result;
  END IF;

  IF p_method='GET' AND p_path='/v1/me/workspaces' THEN
    RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',o.id,'name',o.name,'workspace',c.workspace,
        'can_write',m.role='owner' OR EXISTS(SELECT 1 FROM public.workspace_role r WHERE r.organization_id=o.id AND r.user_id=uid
         AND r.workspace=c.workspace AND r.role IN ('admin','catalog_manager','campaign_manager','booking_manager','creator','affiliate'))))
      FROM public.organizations o JOIN public.organization_members m ON m.organization_id=o.id
      JOIN public.workspace_capability c ON c.organization_id=o.id
      WHERE m.user_id=uid AND m.active AND NOT o.suspended AND c.status='verified' AND c.expires_at>now()
      AND EXISTS(SELECT 1 FROM public.account_eligibility e WHERE e.user_id=uid AND e.age_band='eligible_adult' AND e.expires_at>now())), '[]'::jsonb);
  END IF;
  IF p_method='GET' AND p_path='/v1/me/credits' THEN
    RETURN (SELECT jsonb_build_object('available',coalesce(sum(units) FILTER(WHERE bucket='available'),0),
      'held',coalesce(sum(units) FILTER(WHERE bucket='held'),0)) FROM public.credit_posting WHERE user_id=uid);
  END IF;
  RAISE SQLSTATE 'PT501' USING MESSAGE='BACKEND_OPERATION_NOT_IMPLEMENTED';
END $$;
REVOKE ALL ON FUNCTION public.glam_api_v1(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_v1(text,text,jsonb,text) TO authenticated;
