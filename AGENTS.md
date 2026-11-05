# GLAM AI engineering rules

- Read docs/specification/beauty-led-visual-pass.md for the latest portrait-led Home/Analysis/Studio/color UX. Editorial portraits and reference swatches must never become fabricated personal results; tool-specific directions hand off only to the corresponding look component.

- Read docs/specification/goal-led-experience.md and goal-led-backlog.md for the latest goal-led UX, continuous brief, independent Look Builder, opt-in metadata memory and fixed server-only item commission. Never persist photos/conversations/tokens in that device profile or pretend disconnected AI/commerce is live.

- Read docs/specification/contextual-catalog-build.md for the permanent analysis-to-commerce requirement and Snap & List. Every relevant result/guide/Studio flow embeds organic and separately labeled sponsored matches or an honest no-match state. Commerce remains integrated, never hidden behind a mandatory Shop tab. Relevance, source facts, stock, freshness, market/age policy and rights precede bids; AI suggestions never publish without factual/version approval.

- Read docs/specification/analysis-first-build.md first. The latest explicit user instruction authorizes code/build now, with external tools and hosted databases connected afterward. Earlier design-wait instructions are superseded for this implementation; deployment, provider spend and commercial activation still require their own evidence/authorization. Consumer navigation is Home, Analyze, AI Studio, AI Advisor, Profile; commerce is secondary. One native app, unified web/business platform and restricted admin use canonical identities/RBAC/migrations.

- Read docs/approvals.md, docs/specification/README.md and docs/implementation-status.md.
- Master PRD v2 defines globally inclusive product scope and age-specific experiences; read its global policy/commerce plans before expanding implementation. The later explicit code/build instruction authorizes implementation of the corrected analysis-first architecture. No global/age mode is enabled by planning approval alone.
- Use the existing checkout; do not create Git worktrees unless explicitly requested.
- Work on isolated feature branches and use reviewable PRs. Update requirement/backlog status with evidence.
- Keep db/migrations the sole canonical migration history. No alternate ORM migration system.
- Server-side commercial calculations only. Private face data cannot enter advertising or analytics.
- Every completed feature requires meaningful automated tests. Use real PostgreSQL for transaction tests.
- Never call fixtures real provider/catalog/payment integrations or mark unmeasured features production-ready.
- No production deployment or destructive database operation without explicit user approval.
- Standard validation: uv run ruff check .; uv run pytest; npm run typecheck; npm run build:web.
- Integration tests require a dedicated database whose name ends in _test; see docs/development.md.
