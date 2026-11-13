# Batch 3 — Analyze results and history (GL-026 to GL-034)

The real report/history logic in `apps/glam_mobile` is unchanged; only presentation moved to the design.

| Design id | Flutter | Notes |
|---|---|---|
| GL-026 Analysis overview | `ReportScreen` | Photo hero + draggable results sheet; one card per real finding with certainty and "you can correct this" |
| GL-027 Face shape & features | `FindingDetailScreen` | Real finding, its uncertainty, correct/reset controls |
| GL-028 Skin, GL-029 Hair, GL-031 Hairstyles, GL-032 Routine | `UnavailableModeScreen` | The service returns face-feature/undertone observations only; these screens say so and show no invented results |
| GL-030 Makeup recommendations | `DirectionsScreen` | Shows the report's real style directions; the mock's shade swatches are reference data and are not shown as results |
| GL-033 History | `HistoryScreen` | Real server jobs, refresh, resume |
| GL-034 Save/share/continue | `SaveShareScreen` | Save to Style Passport is real; Share says it is unavailable; Studio and Shop open honest placeholders |

Verification: `flutter analyze` no errors/warnings; `flutter test` 46 pass (includes the existing 2× text-scale results-sheet test). Native screenshots and pixel comparison still come from CI artifacts.
