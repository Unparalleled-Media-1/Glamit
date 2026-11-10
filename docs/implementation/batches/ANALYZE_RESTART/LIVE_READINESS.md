# Analyze slice — live readiness is BLOCKED

Update, 10 November 2026 at 18:28 SAST: under the user's subsequent “Create the backend tables” instruction, canonical0014–0017 were applied and independently verified against the original production project. The four previously absent tables and private bucket now exist; all 19 new tables have RLS and matching tested catalog metadata. See [production schema results](../../../database/analysis-schema/RESULT.md). Schema absence is no longer a live blocker. Canonical API deployment/runtime permissions, approved policies/eligibility/retention, worker/provider qualification, public mobile build configuration and actual authenticated device journeys remain unverified. The observations below are preserved as the pre-deployment record, not the current table state.

Read-only observations on10November2026 (Africa/Johannesburg), original Supabase bkkmsbxrxkqaveymcrgi:

| Dependency | Actual observation | Consequence |
| --- | --- | --- |
| Supabase Management access | Project function/config/schema metadata requests succeed | Management access only; not an app login or provider proof |
| Edge API | glam-api is ACTIVE; its repository handler lacks the FastAPI media/analysis routes | The Supabase project URL cannot stand in for the canonical analysis API |
| Auth activation | Email enabled; phone/Google/Apple/Facebook disabled | Existing-email client only; no provider activation or user creation performed |
| New app public settings | No qualified GLAM_API_ORIGIN or SUPABASE_PUBLIC_KEY supplied to this build | Native CI deliberately reaches an honest unavailable sign-in gate; no live credential journey passes |
| Test identity | No authorized eligible test account supplied | No authenticated live upload or stored result is claimed |
| Private-media schema | SELECT to_regclass('public.private_media') returned NULL | Required canonical schema is absent |
| Analysis schema | analysis_job, analysis_correction, style_passport_analysis each returned NULL | Actual jobs/corrections/Passport association cannot operate against this deployment |
| Provider/storage qualification | Not established by these metadata reads | API keys/Management access cannot imply private bucket, policy, eligibility, dispatch or provider readiness |
| Physical devices | No physical Android/iPhone runner available | Hardware usability and full parity NOT TESTED |

The schema inspection used a read-only query and returned relation names/nulls only; it did not read user photos/reports or write data. No production migration, policy insertion, role grant, provider activation, user creation or upload occurred.

Reuse the existing canonical private-media/analysis/Passport migrations (0015–0017 and required predecessors); do not generate a competing migration history or stamp them as applied. Production execution still needs the exact reviewed SQL, local validation, recoverable backup and separate deployment approval. No Supabase branch/project is recreated. The current backend report also lacks dedicated skin/hair findings; this is a capability gap, not a key issue.

To demonstrate the real slice: qualify/deploy the existing canonical backend against the approved schema; configure storage/policy/eligibility/provider guards; supply only public build settings and an authorized test identity securely; run actual photo upload→job→real report→correction→Passport save→fresh-session reopen separately on Android/iOS. Retain actual IDs/status/owner checks and recordings without credentials. No fixture/provider double is acceptable as that evidence.

The branch stops at Analyze. Design approval is requested only after the first real feature has been demonstrated, as the latest user directive requires. The present live blockers mean the first-feature gate remains OPEN.
