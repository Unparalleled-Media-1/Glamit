-- GENERATED from canonical Alembic application@head; do not edit.
-- Starting revision: 0017_analysis_passport; excludes Stripe sandbox0009.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Candidate only. Never execute in production without exact-SQL/recovery approval.
-- Virtual try-on: server-only jobs, privately stored results, configurable price
-- rules and provider cost events. GLAM AI credits only; no other credit system exists here.
ALTER TABLE public.credit_account
  ADD COLUMN credit_kind text NOT NULL DEFAULT 'glam_ai_credit'
  CHECK(credit_kind='glam_ai_credit');

CREATE TABLE public.generation_price_rule (
  id uuid PRIMARY KEY,
  feature text NOT NULL CHECK(feature IN ('tryon_full_body','tryon_torso','tryon_face_hair_makeup')),
  version integer NOT NULL CHECK(version>0),
  credit_units bigint NOT NULL CHECK(credit_units>0),
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(feature,version)
);

CREATE TABLE public.tryon_job (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.app_user,
  media_id uuid NOT NULL,
  FOREIGN KEY(media_id,owner_id) REFERENCES public.private_media(id,owner_id),
  request_key uuid NOT NULL,
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  policy_id uuid NOT NULL REFERENCES public.policy_document,
  consent_sequence bigint NOT NULL REFERENCES public.consent_event(sequence),
  scope text NOT NULL CHECK(scope IN ('full_body','torso','face_hair_makeup')),
  outfit_brief jsonb NOT NULL CHECK(jsonb_typeof(outfit_brief)='object'),
  garment_refs jsonb NOT NULL CHECK(jsonb_typeof(garment_refs)='array' AND jsonb_array_length(garment_refs) BETWEEN 1 AND 6),
  provider text NOT NULL CHECK(provider ~ '^[a-z0-9_]{1,40}$'),
  provider_model_version text CHECK(provider_model_version IS NULL OR length(provider_model_version) BETWEEN 1 AND 128),
  state text NOT NULL DEFAULT 'queued'
    CHECK(state IN ('queued','running','completed','failed','cancelled','expired')),
  price_rule_id uuid NOT NULL REFERENCES public.generation_price_rule,
  credit_reservation_id uuid NOT NULL,
  FOREIGN KEY(credit_reservation_id,owner_id) REFERENCES public.credit_reservation(id,user_id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK(expires_at>created_at),
  attempt_id uuid,
  attempted_at timestamptz,
  provider_job_id text CHECK(provider_job_id IS NULL OR length(provider_job_id) BETWEEN 1 AND 200),
  finished_at timestamptz,
  error_code text CHECK(error_code IS NULL OR error_code ~ '^[a-z_]{1,100}$'),
  UNIQUE(owner_id,request_key),
  UNIQUE(id,owner_id),
  CHECK(state<>'running' OR (attempt_id IS NOT NULL AND attempted_at IS NOT NULL)),
  CHECK(state<>'completed' OR (finished_at IS NOT NULL AND attempt_id IS NOT NULL)),
  CHECK((attempt_id IS NULL)=(attempted_at IS NULL))
);
CREATE INDEX tryon_job_owner ON public.tryon_job(owner_id,created_at DESC,id);
CREATE INDEX tryon_job_pending ON public.tryon_job(created_at,id) WHERE state='queued';
CREATE INDEX tryon_job_expiry ON public.tryon_job(expires_at,owner_id) WHERE state<>'expired';

CREATE TABLE public.tryon_result (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  FOREIGN KEY(job_id,owner_id) REFERENCES public.tryon_job(id,owner_id),
  object_key text NOT NULL UNIQUE,
  stored_sha256 text NOT NULL CHECK(stored_sha256 ~ '^[0-9a-f]{64}$'),
  stored_size integer NOT NULL CHECK(stored_size BETWEEN 1 AND 10485760),
  width integer NOT NULL CHECK(width>0),
  height integer NOT NULL CHECK(height>0),
  label_version text NOT NULL CHECK(length(label_version) BETWEEN 1 AND 40),
  synthetic_test boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'stored' CHECK(state IN ('stored','deletion_pending','deleted')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK(expires_at>created_at),
  deleted_at timestamptz,
  purge_attempts integer NOT NULL DEFAULT 0 CHECK(purge_attempts>=0),
  next_purge_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(job_id),
  CHECK(object_key=owner_id::text||'/'||id::text||'.png'),
  CHECK((state='deleted')=(deleted_at IS NOT NULL))
);
CREATE INDEX tryon_result_owner ON public.tryon_result(owner_id,created_at DESC);
CREATE INDEX tryon_result_purge ON public.tryon_result(next_purge_at) WHERE state<>'deleted';

CREATE TABLE public.generation_cost_event (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.tryon_job(id),
  attempt_id uuid NOT NULL,
  provider text NOT NULL CHECK(provider ~ '^[a-z0-9_]{1,40}$'),
  outcome text NOT NULL
    CHECK(outcome IN ('success','provider_failure','moderation_reject','cancelled','ambiguous')),
  billed_cost_micros bigint CHECK(billed_cost_micros IS NULL OR billed_cost_micros>=0),
  currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  credit_units bigint NOT NULL CHECK(credit_units>=0),
  credits_captured boolean NOT NULL,
  synthetic_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(job_id,attempt_id)
);

CREATE VIEW public.generation_cost_summary AS
  SELECT provider,outcome,synthetic_test,count(*) AS events,
         sum(billed_cost_micros) AS billed_cost_micros,sum(credit_units) AS credit_units
  FROM public.generation_cost_event GROUP BY provider,outcome,synthetic_test;

ALTER TABLE public.generation_price_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryon_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryon_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_cost_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generation_price_rule,public.tryon_job,public.tryon_result,
  public.generation_cost_event,public.generation_cost_summary FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.tryon_job IS
  'Server-only try-on jobs. Attempt committed before provider call; ambiguous dispatch is never re-dispatched.';
COMMENT ON TABLE public.generation_price_rule IS
  'Configurable GLAM AI credit prices, independent of provider cost. No price is seeded.';

UPDATE alembic_version SET version_num='0018_tryon' WHERE alembic_version.version_num = '0017_analysis_passport';
COMMIT;
