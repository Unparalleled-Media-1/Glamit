-- Candidate only. Never execute in production without exact-SQL/recovery approval.
-- Professional services, weekly availability and bookings. Server-only tables.
-- A database exclusion constraint makes double-booking an accepted slot impossible.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.professional_service (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 480),
  price_minor bigint NOT NULL CHECK(price_minor>=0),
  currency text NOT NULL CHECK(currency IN ('ZAR','USD','EUR','GBP')),
  state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(id,organization_id)
);
CREATE INDEX professional_service_org ON public.professional_service(organization_id,state);

CREATE TABLE public.availability_rule (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  start_minute smallint NOT NULL CHECK(start_minute BETWEEN 0 AND 1439),
  end_minute smallint NOT NULL CHECK(end_minute BETWEEN 1 AND 1440),
  timezone text NOT NULL CHECK(length(timezone) BETWEEN 1 AND 64),
  CHECK(end_minute>start_minute)
);
CREATE INDEX availability_rule_org ON public.availability_rule(organization_id);

CREATE TABLE public.booking (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  service_id uuid NOT NULL,
  FOREIGN KEY(service_id,organization_id)
    REFERENCES public.professional_service(id,organization_id),
  client_id uuid NOT NULL REFERENCES public.app_user,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  note text NOT NULL DEFAULT '' CHECK(length(note)<=500),
  state text NOT NULL DEFAULT 'requested'
    CHECK(state IN ('requested','accepted','declined','cancelled','completed')),
  decided_by uuid REFERENCES public.app_user,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(ends_at>starts_at),
  CONSTRAINT booking_no_overlap_when_held EXCLUDE USING gist (
    organization_id WITH =, tstzrange(starts_at,ends_at) WITH &&
  ) WHERE (state IN ('accepted','completed'))
);
CREATE INDEX booking_org_state ON public.booking(organization_id,state,starts_at);
CREATE INDEX booking_client ON public.booking(client_id,starts_at);

ALTER TABLE public.professional_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_service,public.availability_rule,public.booking
  FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.booking IS
  'Server-only. A request holds no slot; accepting does, and the exclusion constraint forbids overlaps.';
