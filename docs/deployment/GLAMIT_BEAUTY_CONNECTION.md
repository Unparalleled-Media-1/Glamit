# GLAM AI — production domain connection

7 November 2026. User-confirmed website: `https://www.glamit.beauty`, GoDaddy cPanel / Web Hosting.

## Completed

Supabase Auth's site URL was changed from its localhost default to the supplied canonical website. The original project's Edge origin configuration now permits that exact origin while preserving the existing GitHub Pages origin. Actual browser preflight responses were verified: canonical website HTTP204 with an exact allow-origin header; unrelated origin HTTP403. Auth providers, verification requirements, financial logic and database schema were not changed by this configuration stage. No messages or payments were sent.

A static-host build of the approved application is prepared for cPanel. It reuses the existing components and visual system, connects account details/routines to the hosted API, includes direct routes and Apache security/routing configuration, and keeps unavailable AI/commerce workflows clearly labeled. Public-key validation rejects service-role, secret and wrong-project legacy keys before bundling. A privileged-credential scan passed. Local Chromium checks passed on six routes, account fields, mobile scrolling and fixed-navigation clearance, with no unexpected external requests. The account UI regression and static entry-point typecheck passed. These local tests do not establish public website deployment.

## Pending

- Public website inspection: this environment's current network policy does not yet permit the supplied website. A narrowly scoped draft adds `www.glamit.beauty` and its apex host. It requires review/save/publication through environment settings before the grant is applied. No network-policy bypass was attempted.
- cPanel upload: the server URL and secure deployment credentials have not been supplied. The domain's document root must be verified and existing website files backed up before upload. No GoDaddy files or DNS were changed.
- Stripe: despite the reported update, the runtime's authenticated `/v1/balance` response still returned `livemode=true`; `STRIPE_WEBHOOK_SECRET` is absent from this runtime and the original project's Edge secret inventory. Only the Stripe publishable key is currently listed in Edge secrets. The settings location/propagation is unresolved. The missing webhook requirement has been added to the environment draft. No live financial mutation was attempted.
- Full product acceptance: remaining AI, media, commerce, booking, team/admin and notification implementations/integrations remain as listed in the database deployment report.

## Evidence and source

- [Actual Supabase configuration and CORS responses](evidence/glamit-beauty-origin.json)
- [cPanel build and upload runbook](../../deploy/godaddy/README.md)
- [Complete backend deployment status](../database/DATABASE_DEPLOYMENT_REPORT.md)

Frontend publication remains **PENDING**. Backend origin configuration is **VERIFIED**. Stripe test processing remains **BLOCKED**.
