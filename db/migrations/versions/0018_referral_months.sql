-- Candidate only. No production execution or activation from application startup.
CREATE TABLE public.subscription_referral_award (
  id uuid PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES public.app_user,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.app_user,
  source_event_id text NOT NULL UNIQUE CHECK(length(btrim(source_event_id)) BETWEEN 1 AND 240),
  qualification_kind text NOT NULL
    CHECK(qualification_kind='first_subscription_payment'),
  policy_version text NOT NULL CHECK(length(policy_version) BETWEEN 1 AND 100),
  reward_months integer NOT NULL CHECK(reward_months=1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(referrer_id<>referred_id)
);
CREATE INDEX subscription_referral_award_owner ON public.subscription_referral_award(referrer_id,created_at,id);
CREATE FUNCTION public.guard_referral_award() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  RAISE EXCEPTION 'Referral awards are immutable; corrections require reviewed compensating records';
END $$;
CREATE TRIGGER subscription_referral_award_immutable BEFORE UPDATE OR DELETE
ON public.subscription_referral_award FOR EACH ROW EXECUTE FUNCTION public.guard_referral_award();
ALTER TABLE public.subscription_referral_award ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_referral_award FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.subscription_referral_award IS
  'Server-verified consumer referral month awards; not creator commissions or paid subscription entitlement.';
