# 20 — Decisions and assumptions

| Decision | Source | Status |
|---|---|---|
| Flutter in `apps/glam_mobile` is the single mobile target | Owner, 12 Nov 2026 | CONFIRMED |
| Old Expo app and rejected Flutter F1 are preserved | Owner | CONFIRMED |
| Design atlas is authoritative; typography via OFL substitutes for Georgia/Arial | Owner + `mobile-parity/FONT_SUBSTITUTION.md` | CONFIRMED (substitution evidence pending) |
| No Batch 2 before the owner approves actual native screenshots | Owner | CONFIRMED |
| Production DB, payments, deployment untouched | Owner/AGENTS.md | CONFIRMED |
| Sample design content stays behind a fixtures flag until backend contracts exist | This batch | ASSUMPTION — release builds must disable it |
| Design glyph icons kept for parity; vector replacement only if native capture shows gaps | This batch | ASSUMPTION |
