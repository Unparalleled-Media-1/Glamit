# 01 — Executive handover

GLAM Beauty is a monorepo: Next.js web (`apps/web`, mainly landing, acquisition and business/admin), FastAPI services (`services/api`, `services/worker`), canonical Alembic migrations (`db/migrations`), shared packages, and three mobile apps. The product direction is mobile-first: the consumer experience is a native app, the website converts and redirects to the app while desktop business operations remain.

**Mobile decision (owner-approved, 12 Nov 2026):** Flutter in `apps/glam_mobile` is the only active mobile target. It already contains the privacy-first camera → consent → private upload → analysis → correction → history flow with typed authenticated backend calls. `apps/mobile` (Expo/React Native) and `apps/flutter_app` (rejected F1) are retained for reference and rollback.

**Design authority:** the supplied 232-screen atlas and handover (HOLD status in the handover itself: navigation verified in the prototype only; native parity, backend behaviour and journeys are not certified).

**What exists and is evidenced:** see `docs/launch/FINAL_MASTER_AUDIT.md`, `docs/implementation/batches/*` and CI runs. **What this takeover added:** design registries, Batch 1 five-tab Flutter shell, native-capture and comparison CI. No production deployment, migration, payment or provider change was made.

**Principal risks:** unconfirmed backend contracts for 142 of 232 screens; migrations 0014–0017 production status unverified here; credentials for SMS, Google/Facebook/Apple sign-in, Stripe live, OpenAI live-qualification not present in this workspace; no physical-device evidence.
