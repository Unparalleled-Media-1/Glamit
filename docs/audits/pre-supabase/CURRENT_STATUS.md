# Current release target and consolidation status

6 November 2026. **Latest user clarification: `feat/platform-foundations` is main.** A literal branch named `main` is not required. The earlier12-document audit is an immutable historical assessment; its missing-main-name finding is superseded by this clarification. The remaining functional/privacy/financial/G0 findings are not waived.

## Authorized consolidation

The user explicitly requested all pull requests/merges target `feat/platform-foundations`. Before this operation its remote tip was `d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb`. This consolidation starts from audited source `b1621de4c62489f007eb0f83c8efccbc633bd9a9` plus the small changes recorded in this commit. All observed application/feature/docs/fix branches and all nine fetched PR heads are ancestors of the audited source. Ordinary fast-forward publication can include them without replaying duplicate commits or changing approved visuals. `gh-pages` is an unrelated generated publishing history and stays separate. No branches are deleted.

This document records the prepared change. The [publication receipt](evidence/consolidation-publication.json) records review-branch publication separately from main integration; preparation is not a main merge/push claim. GitHub PR state/review/check/protection API access still returns Forbidden. We do not claim GitHub PRs were individually closed or approved, and will not use force, admin-merge flags or protection bypasses. A normal protected push rejection must be respected.

## Changes included

- Existing application/history through the audit branch, including the intentionally isolated Stripe test service. No existing commission, authentication or original migration logic was modified.0009 remains guarded for `_test` databases; consolidating source does not make it deployable to Supabase.
- CI push trigger now includes the actual main branch, while retaining literal `main` compatibility. Pull-request checks remain enabled.
- OpenAI server configuration accepts `GLAM_OPENAI_API_KEY` when canonical `OPENAI_API_KEY` is absent. This is needed because the managed configuration reserves `OPENAI_*` names. Canonical deployment priority, redacted status and no-secret logging are tested. No provider is activated by this fallback.
- Secure service setup guide, verified frozen installer and corrected startup instructions. The old non-frozen install workaround and automatic migration to non-test `glam` were removed from the environment draft, not from application migrations.

## Credential requirements saved, values pending

Only Stripe test activation is confirmed. Nine Stripe configuration names are saved as direct runtime requirements in the environment draft, with no values; local signing/test-mode validation must receive actual securely injected runtime values. Other providers are documented and await activation confirmation before bindings are added. Supabase remains deferred. Saved network destinations retain `api.stripe.com`, `docs.stripe.com` and add `api.github.com`; the running environment has not applied the draft. No Supabase network permission was added.

Owner action: enter Stripe **test** credentials and account/URL settings in secure environment settings, review/save the draft and publish the environment. Saving requirements does not create credential values, apply them, establish authenticated connectivity or complete financial acceptance. See [secret configuration](../../integrations/SECRET_CONFIGURATION.md).

## Verification and release decision

Current full backend/core check: **158 tests passed** (including three secret-alias cases), Ruff/format, OpenAPI/runtime and both clients' TypeScript checks pass. Frozen uv/npm installer succeeds. All existing five approved patterns are untouched. Earlier155-test/browser/golden/native-export evidence remains historical and scoped; actual native-device execution, provider accuracy and Stripe reconciliation remain blocked.

**G0 remains NO-GO for a Supabase connection or live release.** Release-target naming is resolved. Baseline/tested SHA recording can proceed after normal publication, but no release tag is approved while other gates fail. The exposed database password still needs external rotation proof. Schema/RLS approval, retention/rate-limit remediation, real AI/marketplace/Stripe test evidence and native usability validation remain outstanding. Production Supabase/live payments remain prohibited.

## Automatic review gate

Automatic approval review rejected the direct commit/push/fast-forward sequence to the shared user-designated main because required approval/protection/green-CI evidence was unavailable. The rejected command did not execute. A separate review branch and a normal PR targeting `feat/platform-foundations` are the safe path; no retry by an indirect push or bypass is authorized. Application consolidation into main remains **BLOCKED** until that review path passes.
