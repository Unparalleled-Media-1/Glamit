-- Preserve the deployed core implementation and its canonical migration record.
ALTER FUNCTION public.glam_api_v1(text,text,jsonb,text) RENAME TO glam_core_api_v1;
ALTER FUNCTION public.glam_core_api_v1(text,text,jsonb,text) SET SCHEMA glam_private;
REVOKE ALL ON FUNCTION glam_private.glam_core_api_v1(text,text,jsonb,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.glam_api_v1(p_method text,p_path text,p_body jsonb DEFAULT '{}',p_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; row_id uuid; result jsonb; cached record; body_hash text; expected integer;
BEGIN
  IF p_path !~ '^/v1/me/routines(/[^/]+)?$' THEN
    RETURN glam_private.glam_core_api_v1(p_method,p_path,p_body,p_key);
  END IF;
  IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>32768 THEN
    RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
  END IF;
  uid:=glam_private.bootstrap_identity();
  IF NOT (public.glam_api_gate()->>'allowed')::boolean THEN
    RAISE SQLSTATE 'PT429' USING MESSAGE='RATE_LIMITED';
  END IF;
  IF p_method='GET' AND p_path='/v1/me/routines' THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.updated_at DESC,r.id) FROM
      (SELECT id,title,steps,revision,updated_at FROM public.personal_routine WHERE owner_id=uid
       ORDER BY updated_at DESC,id LIMIT 100) r),'[]'::jsonb);
  END IF;
  IF p_path<>'/v1/me/routines' THEN
    IF split_part(p_path,'/',5) !~ '^[a-fA-F0-9-]{36}$' THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
    END IF;
    row_id:=split_part(p_path,'/',5)::uuid;
    SELECT revision INTO expected FROM public.personal_routine WHERE id=row_id AND owner_id=uid FOR UPDATE;
    IF NOT FOUND THEN RAISE SQLSTATE 'PT404' USING MESSAGE='NOT_FOUND'; END IF;
    IF p_method='DELETE' THEN
      DELETE FROM public.personal_routine WHERE id=row_id AND owner_id=uid;
      UPDATE public.idempotency_record SET response=jsonb_build_object('deleted',true)
       WHERE user_id=uid AND route='routines' AND response->>'id'=row_id::text;
      INSERT INTO public.audit_event(id,actor_id,action,resource_id) VALUES(gen_random_uuid(),uid,'routine.deleted',row_id);
      RETURN 'null'::jsonb;
    END IF;
  END IF;
  IF (p_method='POST' AND p_path='/v1/me/routines') OR (p_method='PUT' AND row_id IS NOT NULL) THEN
    IF p_body-ARRAY['title','steps','expected_revision']<>'{}'
      OR (p_method='POST' AND p_body ? 'expected_revision')
      OR jsonb_typeof(p_body->'title') IS DISTINCT FROM 'string'
      OR length(btrim(p_body->>'title')) NOT BETWEEN 1 AND 160
      OR jsonb_typeof(p_body->'steps') IS DISTINCT FROM 'array' THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
    END IF;
    IF jsonb_array_length(p_body->'steps') NOT BETWEEN 1 AND 30 OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(p_body->'steps') s WHERE
      jsonb_typeof(s)<>'object' OR s-ARRAY['text','done']<>'{}'
      OR jsonb_typeof(s->'text') IS DISTINCT FROM 'string'
      OR length(btrim(s->>'text')) NOT BETWEEN 1 AND 500
      OR (s ? 'done' AND jsonb_typeof(s->'done') IS DISTINCT FROM 'boolean')) THEN
      RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
    END IF;
    p_body:=jsonb_set(p_body,'{title}',to_jsonb(btrim(p_body->>'title')));
    p_body:=jsonb_set(p_body,'{steps}',(SELECT jsonb_agg(jsonb_build_object('text',btrim(s->>'text'),'done',coalesce((s->>'done')::boolean,false)) ORDER BY ord) FROM jsonb_array_elements(p_body->'steps') WITH ORDINALITY t(s,ord)));
    IF p_method='POST' THEN
      IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 160 THEN
        RAISE SQLSTATE 'PT422' USING MESSAGE='IDEMPOTENCY_KEY_REQUIRED';
      END IF;
      body_hash:=encode(sha256(convert_to(glam_private.canonical_json(p_body),'UTF8')),'hex');
      SELECT request_hash,response INTO cached FROM public.idempotency_record WHERE user_id=uid AND route='routines' AND key=p_key;
      IF FOUND THEN
        IF cached.request_hash<>body_hash THEN RAISE SQLSTATE 'PT409' USING MESSAGE='IDEMPOTENCY_CONFLICT'; END IF;
        IF cached.response->>'deleted'='true' THEN RAISE SQLSTATE 'PT410' USING MESSAGE='ROUTINE_DELETED'; END IF;
        RETURN cached.response;
      END IF;
      row_id:=gen_random_uuid();
      INSERT INTO public.personal_routine(id,owner_id,title,steps) VALUES(row_id,uid,btrim(p_body->>'title'),p_body->'steps');
    ELSE
      IF jsonb_typeof(p_body->'expected_revision') IS DISTINCT FROM 'number' THEN
        RAISE SQLSTATE 'PT422' USING MESSAGE='VALIDATION_ERROR';
      END IF;
      IF expected<>(p_body->>'expected_revision')::integer THEN RAISE SQLSTATE 'PT409' USING MESSAGE='REVISION_CONFLICT'; END IF;
      UPDATE public.personal_routine SET title=btrim(p_body->>'title'),steps=p_body->'steps',revision=revision+1,updated_at=now()
        WHERE id=row_id AND owner_id=uid;
    END IF;
    SELECT jsonb_build_object('id',id,'title',title,'steps',steps,'revision',revision,'updated_at',updated_at) INTO result
      FROM public.personal_routine WHERE id=row_id AND owner_id=uid;
    INSERT INTO public.audit_event(id,actor_id,action,resource_id)
      VALUES(gen_random_uuid(),uid,CASE p_method WHEN 'POST' THEN 'routine.created' ELSE 'routine.updated' END,row_id);
    IF p_method='POST' THEN
      INSERT INTO public.idempotency_record(user_id,route,key,request_hash,response) VALUES(uid,'routines',p_key,body_hash,result);
    END IF;
    RETURN result;
  END IF;
  RAISE SQLSTATE 'PT405' USING MESSAGE='METHOD_NOT_ALLOWED';
END $$;
REVOKE ALL ON FUNCTION public.glam_api_v1(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.glam_api_v1(text,text,jsonb,text) TO authenticated;
