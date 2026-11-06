# Consolidate GLAM consumer platform and test-only service foundations

Prepared PR body. The API rejected creation with Forbidden; this file is not evidence that a PR exists. Target: `feat/platform-foundations`; head: `chore/consolidate-foundations-secrets`.

GLAM's consumer and business work currently lives on a sequence of feature branches while the default branch still exposes the foundation shell. This consolidates that application history into `feat/platform-foundations`, the designated main branch, through one reviewable change.

The change includes the approved dark Home/Analysis/Studio and light Shop/Product Detail direction, the sixth personalized-results surface, goal-led styling and independent look components, contextual catalog/Snap & List foundations, responsive preview and regression evidence, server-side provider contracts, and the isolated Stripe Connect test service. Unconfigured services remain explicitly unavailable; editorial references and test doubles are not presented as personal results or live inventory.

The final preparation adds the correct default-branch CI push trigger, a server-only `GLAM_OPENAI_API_KEY` fallback for the managed environment's reserved `OPENAI_*` namespace, and secure service configuration instructions. Only confirmed Stripe-test settings are requested; credential values must be supplied separately through secure runtime settings. Supabase and live payments remain disconnected.

Financial review: existing 10% eligible completed physical-item policy, authentication and original migrations are unchanged. Canonical0009 is strictly sandbox-only and cannot run against a normal Supabase `postgres` database; retain that guard and resolve migration isolation separately before any Supabase approval. No production data or financial records were modified.

Validation:158 backend tests, Ruff/format, OpenAPI/runtime checks and web/mobile TypeScript checks pass;13 shared product tests pass; frozen uv/npm installation passes. Earlier application evidence covers13 browser groups, explicit-double connected contracts,28 capture dimensions and20 unchanged approved-screen comparisons. Actual native device execution, provider accuracy and real Stripe fees/transfers/reconciliation remain unverified. Full audit and current blockers are in `docs/audits/pre-supabase/CURRENT_STATUS.md` and `docs/integrations/SECRET_CONFIGURATION.md`.

G0 remains NO-GO for a live release or Supabase connection. Merge only after required reviews and green CI. Keep `gh-pages` as separate generated publishing history; all observed application branches and nine fetched PR heads are included by ancestry, without asserting their GitHub state or approval.
