# Font substitution (Georgia → Gelasio, Arial → Arimo)

The design specifies `Georgia` (display) and `Arial` (body). Both are proprietary and cannot be redistributed in an app. The previous Flutter fonts (Cormorant Garamond, Manrope) must not be used because they change the reference appearance.

| Reference | Substitute | Licence | Why |
|---|---|---|---|
| Georgia | **Gelasio** (variable) | SIL OFL 1.1 (`assets/fonts/Gelasio-OFL.txt`) | Designed by Eben Sorkin as a metric-compatible Georgia replacement |
| Arial | **Arimo** (variable) | SIL OFL 1.1 (`assets/fonts/Arimo-OFL.txt`) | Metric-compatible with Arial (Liberation Sans lineage) |

Sources: the `google/fonts` repository (`ofl/gelasio`, `ofl/arimo`). The variable font files are bundled unmodified.

**Parity evidence.** The CI reference renderer (`scripts/mobile-parity/render_reference.js`) forces the design's `--font-display`/`--font-body` to the same two files, so reference and native use identical glyph outlines and line wrapping. This removes font choice as a variable in the comparison; it does not show that Gelasio looks identical to Georgia. A side-by-side with real Georgia/Arial (licensed screenshots from the designer) is still needed for the final visual approval — recorded as defect PARITY-B1-001.

Icons in the design are Unicode glyphs rendered by OS fallback fonts (PARITY-B1-006).
