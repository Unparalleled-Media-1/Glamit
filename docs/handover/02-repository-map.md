# 02 — Repository map

Verified on 12 Nov 2026 at `f1fedc7`. Remote branches observed: `feat/platform-foundations` (default/base), `feat/native-analyze-capture-batch1`, `feat/native-reskin-v3`, `feat/subscription-pricing`, `dependabot/*`, plus this session's `claude/adoring-lamport-mfe70f`. Unmerged branches were **not** inspected in depth in Batch 0 (follow-up).

| Path | Role |
|---|---|
| `apps/glam_mobile` | **Canonical Flutter app** (analysis flow + Batch 1 shell) |
| `apps/mobile` | Expo 58 / React Native app (reference/rollback) |
| `apps/flutter_app` | Rejected Flutter F1 (reference) |
| `apps/web` | Next.js website and business/admin surfaces |
| `services/api`, `services/worker` | FastAPI backend, background worker |
| `db/migrations` | Sole canonical Alembic history (versions 0001–0017; releases 0010–0014 SQL) |
| `packages/{auth,contracts,product}` | Shared TypeScript packages; `contracts/openapi.json` is the API reference |
| `docs/launch` | Authoritative feature matrix (140 rows) and defect register |
| `docs/mobile-parity` | Design registries and parity evidence |
| `.github/workflows` | CI incl. `flutter-analyze-restart.yml`, `flutter-parity-batch1.yml` |

Environment variables and secrets: not inventoried in Batch 0; see `docs/environment-recovery` and `docs/launch/EXTERNAL_API_ACTIVATION_CHECKLIST.md`. No secret values are recorded in this repository package.
