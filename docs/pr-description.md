# Foundation API, canonical migrations and approved shoppable-look baseline

The repository had no commits or development workflow. This change establishes the approved GLAM AI/Complete the Look design as a baseline, a locked Expo/Next.js/FastAPI workspace, one PostgreSQL migration chain, and CI checks.

The implemented backend slice verifies RS256 identities, enforces private resource ownership and organization membership, records consent, stores immutable user-authored look revisions, deletes private looks on withdrawal, and provides an internal balanced credit reservation/capture/release kernel. Separate Decimal ranking primitives encode organic weights and evidence-gated first-price candidate ordering. Typed OpenAPI/TypeScript contracts describe actual implemented endpoints.

Validation: 29 PostgreSQL-backed/domain/security tests passed; migrations from empty and repeated upgrades passed; Ruff, contract checks, TypeScript, Next.js build and both Expo JS exports passed. Local HTTP checks confirmed liveness, truthful development-shell content and fail-closed behavior without OIDC. Patched Expo transitive tooling passed clean installation, bundling, fingerprinting and production-only npm audit.

This is a partial foundation PR, not the complete Phase 1 or Complete the Look release. AI/catalog/payment/identity-provider integrations, object storage, full RBAC/MFA, credit lots, money settlement, transactional auction budgets and production operations remain open. No mock data is represented as a live integration. See implementation-status.md, validation.md and dependency-overrides.md for precise evidence and limits. Production deployment and destructive database changes require separate explicit approval.
