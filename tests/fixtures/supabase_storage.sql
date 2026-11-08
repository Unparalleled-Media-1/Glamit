-- Disposable local PostgreSQL ONLY. This is a catalog test double, not a Storage service.
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY, bucket_id text REFERENCES storage.buckets(id), name text NOT NULL,
  UNIQUE(bucket_id,name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;

-- Mirror the verified provider guard; production migrations must never disable it.
CREATE OR REPLACE FUNCTION storage.protect_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('storage.allow_delete_query',true),'false') <> 'true' THEN
    RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
      USING ERRCODE='42501';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS protect_buckets_delete ON storage.buckets;
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets
  FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
