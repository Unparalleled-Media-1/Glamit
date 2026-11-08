-- Candidate only. Requires approval of this exact SQL before production execution.
-- Supabase Storage catalogs must already exist; never manufacture Storage in production.
DO $$ BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Existing Supabase Storage catalogs are required';
  END IF;
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='glam-private-media') THEN
    RAISE EXCEPTION 'Existing media bucket must be reconciled explicitly, not overwritten';
  END IF;
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('glam-private-media','glam-private-media',false,10485760,ARRAY['image/png']);

-- Restrictive: even a pre-existing permissive policy cannot expose this bucket.
-- Only the server's Storage service credential bypasses RLS; no signed/public URLs.
CREATE POLICY glam_private_media_server_only ON storage.objects AS RESTRICTIVE
FOR ALL TO PUBLIC USING(bucket_id <> 'glam-private-media')
WITH CHECK(bucket_id <> 'glam-private-media');

CREATE TABLE public.private_media (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.app_user,
  request_key uuid NOT NULL,
  request_hash text CHECK(request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$'),
  policy_id uuid NOT NULL REFERENCES public.policy_document,
  consent_sequence bigint NOT NULL REFERENCES public.consent_event(sequence),
  object_key text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'pending'
    CHECK(state IN ('pending','ready','deletion_pending','deleted')),
  input_mime text NOT NULL CHECK(input_mime IN ('image/jpeg','image/png','image/webp')),
  input_size integer CHECK(input_size BETWEEN 1 AND 10485760),
  input_sha256 text CHECK(input_sha256 IS NULL OR input_sha256 ~ '^[0-9a-f]{64}$'),
  stored_size integer CHECK(stored_size BETWEEN 1 AND 10485760),
  stored_sha256 text CHECK(stored_sha256 IS NULL OR stored_sha256 ~ '^[0-9a-f]{64}$'),
  width integer CHECK(width>0), height integer CHECK(height>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK(expires_at>created_at),
  deletion_requested_at timestamptz, deleted_at timestamptz,
  purge_attempts integer NOT NULL DEFAULT 0 CHECK(purge_attempts>=0),
  next_purge_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_error_code text CHECK(last_error_code IS NULL OR last_error_code ~ '^[a-z_]{1,100}$'),
  UNIQUE(owner_id,request_key),
  CHECK(object_key=owner_id::text||'/'||id::text||'.png'),
  CHECK(state <> 'ready' OR (stored_size IS NOT NULL AND stored_sha256 IS NOT NULL
                            AND width IS NOT NULL AND height IS NOT NULL)),
  CHECK(state = 'deleted' OR (input_size IS NOT NULL AND input_sha256 IS NOT NULL
                             AND request_hash IS NOT NULL)),
  CHECK(state <> 'deleted' OR (deleted_at IS NOT NULL AND input_size IS NULL
    AND input_sha256 IS NULL AND stored_size IS NULL AND stored_sha256 IS NULL
    AND width IS NULL AND height IS NULL AND request_hash IS NULL))
);
CREATE INDEX private_media_owner ON public.private_media(owner_id,created_at DESC,id);
CREATE INDEX private_media_expiry ON public.private_media(expires_at,owner_id)
  WHERE state <> 'deleted';
ALTER TABLE public.private_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.private_media FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.private_media IS
  'Server-mediated private media. Retention duration requires explicit reviewed configuration.';
