# Private workspace entry candidate

The old `/business` and `/admin` routes exposed public planning layouts and role selectors without account entry. The candidate replaces those routes with access gates and preserves the existing cream/rose design.

- `/business/login` and `/business/register` reuse the existing Supabase passwordless component and identity. `/register` is the personal registration entry.
- `/admin/login` signs into an existing account; staff SMS requests cannot create a new user. There is no public staff registration route.
- Sign-in retains a validated same-origin destination. The in-memory SDK session survives the SPA handoff; no new browser token persistence or cookie authentication was introduced.
- Business tools require the existing verified account/workspace response. The selector lists only approved memberships. No URL parameter or selectable label grants privileges.
- An authenticated account without approved workspaces can submit an organization name to the canonical registration contract. Retries reuse the idempotency key. Registration remains pending verification and grants neither verified capabilities nor staff access.
- Staff tools require a successful server staff-context response and known server module keys. Errors, unavailable services and session expiry remove private content. The client gate is a UX boundary; existing JWT, capability, RLS and tenant checks remain the data-security boundary.
- Business tools remain explicitly labeled planning drafts. Publishing, booking, live reports and payment operations have not become operational through this repair.

## Evidence and deployment limit

[Actual guest desktop](evidence/guest-desktop.png) · [Actual guest mobile](evidence/guest-mobile.png). Registration imagery named `registration-transport-fixture.png` uses explicit test transport doubles, not a live account.

Local verification: 12 conditional UI checks, 11 actual Next guest checks, four isolated review-layout groups, 268 real disposable-PostgreSQL regressions, Auth contracts, hosted-account UI contracts, TypeScript, Next build, static-host packaging, branding and keyboard checks. See `evidence/validation-*.log` and the named JSON results. Tests record no production messages, organizations, staff grants or financial writes.

The current deployed Supabase Edge revision does not support the required staff-context operation; staff access therefore remains denied there. Web build readiness is now200; this is not backend/provider readiness. Phone/social providers and CORS remain blocked in the earlier configuration observation; live sign-in remains unqualified. Exact new routes and real OTP/OAuth, approval and staff journeys must be verified after an approved deployment. No public deployment was performed.

The source inventory records candidate code commit `b9f0843` after the tested overlay was committed; it is not deployed-commit certification. Review the PR diff and candidate evidence manifest for candidate file hashes. The latest audit is [NO-GO](PUBLIC_LAUNCH_GO_NO_GO.md); the fifteen QA reviews supplement the original twelve-gate lock.
