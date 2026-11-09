-- Candidate only. Never execute in production without exact-SQL/recovery approval.
CREATE UNIQUE INDEX private_media_id_owner_for_analysis ON public.private_media(id,owner_id);
CREATE TABLE public.analysis_job (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.app_user,
  media_id uuid NOT NULL,
  FOREIGN KEY(media_id,owner_id) REFERENCES public.private_media(id,owner_id),
  request_key uuid NOT NULL,
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  policy_id uuid NOT NULL REFERENCES public.policy_document,
  consent_sequence bigint NOT NULL REFERENCES public.consent_event(sequence),
  session_id uuid,
  goals jsonb NOT NULL CHECK(jsonb_typeof(goals)='array' AND jsonb_array_length(goals) BETWEEN 1 AND 5),
  model text NOT NULL CHECK(length(model) BETWEEN 1 AND 128),
  state text NOT NULL DEFAULT 'queued'
    CHECK(state IN ('queued','running','completed','failed','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK(expires_at>created_at),
  attempt_id uuid,
  attempted_at timestamptz,
  finished_at timestamptz,
  result jsonb CHECK(result IS NULL OR jsonb_typeof(result)='object'),
  error_code text CHECK(error_code IS NULL OR error_code ~ '^[a-z_]{1,100}$'),
  UNIQUE(owner_id,request_key),
  CHECK((state='completed')=(result IS NOT NULL)),
  CHECK(state<>'completed' OR (finished_at IS NOT NULL AND attempt_id IS NOT NULL)),
  CHECK(state<>'running' OR (attempt_id IS NOT NULL AND attempted_at IS NOT NULL)),
  CHECK((attempt_id IS NULL)=(attempted_at IS NULL))
);
CREATE INDEX analysis_job_owner ON public.analysis_job(owner_id,created_at DESC,id);
CREATE INDEX analysis_job_pending ON public.analysis_job(created_at,id) WHERE state='queued';
CREATE INDEX analysis_job_expiry ON public.analysis_job(expires_at,owner_id) WHERE state<>'expired';
ALTER TABLE public.analysis_job ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analysis_job FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.analysis_job IS
  'Server-only jobs and transient-retention reports. Attempt committed before provider call; never auto-retry an ambiguous dispatch.';
