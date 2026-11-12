# Batch 2 — Analyze capture-to-processing path (GL-018, 019, 020, 023, 024, 025)

Reskin of the real private Analyze flow in `apps/glam_mobile`; the camera, consent, upload, recovery and server-analysis logic is unchanged.

| Design id | Flutter |
|---|---|
| GL-018 Choose analysis | `ChooseAnalysisScreen` — only Face is selectable (the backend returns face-feature/undertone observations only); Skin, Hair and Combined show "Not available yet" and are not simulated |
| GL-019 Before you start | `PrepareScreen` — "Open camera" starts the camera, "Choose from gallery" opens the library |
| GL-020 Camera | `CameraSurface` restyled: oval guide, glass controls, 76px shutter. Same semantics ids/labels as before |
| GL-023 Photo check | `PhotoReview` — the mock's "✓ Even / ✓ Level" checks are not computed anywhere, so the tray states that honestly. "Analyze this photo" label kept (Maestro) |
| GL-024 Consent | `ConsentScreen` — two design switches over the real server policy texts; both still required |
| GL-025 Processing | `_status` — scan line, oval, display title; every recovery action (resume, reload, cancel/remove, return) retained |

Not in this batch: GL-026–034 (report, detail, makeup/hair/routine, history, save/share), which still use the pre-redesign look.

Verification: `flutter analyze` no errors/warnings; `flutter test` 42 pass. Display text on the fixed photo canvases is capped at 1.3× system text scale (tests found real overflow at 2×). Native screenshots from CI (Maestro now also captures GL-018/019) are still the parity evidence to review; nothing here was compared pixel-wise.
