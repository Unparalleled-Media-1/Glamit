# GLAM AI engineering rules

- Read docs/approvals.md, docs/specification/README.md and docs/implementation-status.md.
- Use the existing checkout; do not create Git worktrees unless explicitly requested.
- Work on isolated feature branches and use reviewable PRs. Update requirement/backlog status with evidence.
- Keep db/migrations the sole canonical migration history. No alternate ORM migration system.
- Server-side commercial calculations only. Private face data cannot enter advertising or analytics.
- Every completed feature requires meaningful automated tests. Use real PostgreSQL for transaction tests.
- Never call fixtures real provider/catalog/payment integrations or mark unmeasured features production-ready.
- No production deployment or destructive database operation without explicit user approval.
- Standard validation: uv run ruff check .; uv run pytest; npm run typecheck; npm run build:web.
- Integration tests require a dedicated database whose name ends in _test; see docs/development.md.
