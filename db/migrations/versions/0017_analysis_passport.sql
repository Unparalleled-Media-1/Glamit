-- Candidate only: exact-SQL review/recovery/approval required before production.
CREATE UNIQUE INDEX analysis_job_id_owner_for_passport ON public.analysis_job(id,owner_id);
CREATE TABLE public.analysis_correction (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.app_user,
  FOREIGN KEY(job_id,owner_id) REFERENCES public.analysis_job(id,owner_id),
  revision integer NOT NULL CHECK(revision>0),
  request_key uuid NOT NULL,
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  corrections jsonb CHECK(corrections IS NULL OR jsonb_typeof(corrections)='object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  redacted_at timestamptz,
  UNIQUE(job_id,revision), UNIQUE(owner_id,request_key),
  CHECK((corrections IS NULL)=(redacted_at IS NOT NULL))
);
CREATE FUNCTION public.guard_analysis_correction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.redacted_at IS NULL AND NEW.corrections IS NULL
    AND NEW.redacted_at IS NOT NULL AND
    (to_jsonb(NEW)-ARRAY['corrections','redacted_at'])=
    (to_jsonb(OLD)-ARRAY['corrections','redacted_at']) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Correction revisions are immutable except for privacy redaction';
END $$;
CREATE TRIGGER analysis_correction_immutable BEFORE UPDATE OR DELETE ON public.analysis_correction
FOR EACH ROW EXECUTE FUNCTION public.guard_analysis_correction();

-- Association only: the canonical Style Passport and preferences remain in style_passports.
-- Private inferred/corrected traits never get copied into legacy publicly queryable columns.
CREATE TABLE public.style_passport_analysis (
  passport_id uuid PRIMARY KEY REFERENCES public.style_passports(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.app_user,
  job_id uuid NOT NULL,
  FOREIGN KEY(job_id,owner_id) REFERENCES public.analysis_job(id,owner_id),
  correction_revision integer NOT NULL CHECK(correction_revision>=0),
  selected_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE FUNCTION public.guard_analysis_passport_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.style_passports p JOIN public.app_user u
    ON u.id=NEW.owner_id AND u.subject=p.profile_id::text
    AND u.issuer='https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1'
    WHERE p.id=NEW.passport_id) THEN
    RAISE EXCEPTION 'Canonical passport owner mismatch';
  END IF;
  IF NEW.correction_revision>0 AND NOT EXISTS(SELECT 1 FROM public.analysis_correction c
    WHERE c.job_id=NEW.job_id AND c.owner_id=NEW.owner_id
      AND c.revision=NEW.correction_revision AND c.redacted_at IS NULL) THEN
    RAISE EXCEPTION 'Correction snapshot unavailable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER analysis_passport_owner BEFORE INSERT OR UPDATE ON public.style_passport_analysis
FOR EACH ROW EXECUTE FUNCTION public.guard_analysis_passport_owner();
ALTER TABLE public.analysis_correction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_passport_analysis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analysis_correction,public.style_passport_analysis FROM PUBLIC,anon,authenticated;
CREATE INDEX analysis_correction_owner ON public.analysis_correction(owner_id,job_id,revision DESC);
CREATE INDEX style_passport_analysis_job ON public.style_passport_analysis(job_id,owner_id);
