# Batch 1 deviations and decisions

**Owner decisions (12 Nov 2026):** D1 accepted as implemented. D2 corrected (on-photo title colour in both themes, layout unchanged). Typography kept provisionally (D3). The five-screen visual direction is approved; the Android captures were reviewed. D4 and D5 remain open. Regression baselines in `apps/glam_mobile/test/goldens` now protect the approved appearance; update them only for an intentional change.

Nothing below is treated as approved 1:1 parity. Each is a *documented deviation* until the owner chooses an option.

## D1 — Discover: Try on / Shop buttons covered by the events strip (PARITY-B1-002)
**Design as supplied:** the Featured-events strip (absolute, top 166) is painted over the right action column, so Try on and Shop are visually dimmed and cannot be tapped.
**Implemented now:** the action column is layered *above* the strip so every control is tappable. Visible difference: the buttons are not dimmed by the strip's translucent cards.
**Options** — (A) keep the implemented layering; (B) reproduce the design exactly (two controls unusable — not recommended); (C) move the events strip below the action column's bottom edge or into the feed. Needs your decision; GL-069 scores include this deviation.

## D2 — Studio landing: title invisible in light theme (PARITY-B1-003)
**Design as supplied:** the `STUDIO` title uses `#17151a` over a dark portrait, so it is effectively invisible.
**Implemented now:** reproduced exactly as designed (so it is the supplied behaviour, not a correction).
**Options** — (A) approve as designed; (B) use the on-photo colour `#fff4f0` for photo landings in both themes (also affects the `ANALYZE` title, which is currently legible only because of the portrait behind it); (C) another colour you specify.

## D3 — Typography substitution (PARITY-B1-001)
Gelasio replaces Georgia and Arimo replaces Arial because the originals cannot be redistributed. CI now compares native captures with **two** reference sets: one rendered with the same substitutes (engineering consistency) and one rendered with the design's own font stack as resolved on the CI host. Georgia and Arial are **not installed on CI runners** (`fc-match` output is saved with the artifact), so the second set shows fallback fonts, not true Georgia/Arial. A true original comparison needs screenshots from a machine that has the fonts; please supply them if the substitution is to be approved on visual grounds.

## D4 — Text size cap on persistent chrome and photo landings (PARITY-B1-004)
Capped at 1.3×; scrolling screens scale freely. Needs an accessibility decision.

## D5 — Glyph icons (PARITY-B1-006)
The design uses Unicode glyphs; native rendering depends on OS fonts. Decision needed after the native captures are reviewed.
