# Route and control coverage

**NO-GO.** Current local candidate evidence is distinct from actual deployed/service/device evidence. No production deployment, migration, account creation, messages or financial mutation was performed by this audit.

[Control inventory](COMPLETE_CONTROL_INVENTORY.csv) · [Results](CONTROL_CLICKTHROUGH_RESULTS.csv) · [Feature matrix](../audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Evidence summary](evidence/qa-summary.json).

| Metric | Observed |
| --- | --- |
| observed_at | 2026-11-08T07:11:23.552114+00:00 |
| source_routes | 43 |
| source_declarations | 467 |
| runtime_occurrences | 2244 |
| inventory_rows_including_explicit_assertions | 2734 |
| qualified_actionable_control_passes | 338 |
| local_guest_assertion_passes | 11 |
| local_transport_assertions | 12 |
| latest_role_journeys | 71 |
| qualified_role_journeys_passed | 0 |
| legacy_critical_aggregates_passed | 0 |
| legacy_critical_aggregates_required | 31 |
| decision | NO-GO |

| Route | Viewport | Rendered controls | Overflow |
| --- | --- | --- | --- |
| / | desktop | 35 | False |
| /offer | desktop | 16 | False |
| /results | desktop | 33 | False |
| /destination | desktop | 28 | False |
| /cart | desktop | 20 | False |
| /checkout | desktop | 19 | False |
| /orders | desktop | 19 | False |
| /shop | desktop | 25 | False |
| /product | desktop | 25 | False |
| /event | desktop | 38 | False |
| /builder | desktop | 29 | False |
| /analyze | desktop | 24 | False |
| /hair | desktop | 29 | False |
| /skin | desktop | 29 | False |
| /body-fit | desktop | 29 | False |
| /consent | desktop | 17 | False |
| /quality | desktop | 16 | False |
| /goals | desktop | 22 | False |
| /report | desktop | 29 | False |
| /color | desktop | 36 | False |
| /guide | desktop | 30 | False |
| /studio | desktop | 51 | False |
| /advisor | desktop | 38 | False |
| /profile | desktop | 45 | False |
| /history | desktop | 16 | False |
| /privacy | desktop | 17 | False |
| /explore | desktop | 21 | False |
| /complete | desktop | 31 | False |
| /screenshot | desktop | 38 | False |
| /budget | desktop | 21 | False |
| /booking | desktop | 20 | False |
| /wardrobe | desktop | 17 | False |
| /calendar | desktop | 19 | False |
| /groups | desktop | 19 | False |
| /agent | desktop | 19 | False |
| /business | desktop | 5 | False |
| /admin | desktop | 4 | False |
| /login | desktop | 7 | False |
| /auth/callback | desktop | 7 | False |
| /admin/login | desktop | 6 | False |
| /business/login | desktop | 7 | False |
| /business/register | desktop | 7 | False |
| /register | desktop | 7 | False |
| / | iphone-web | 34 | False |
| /offer | iphone-web | 15 | False |
| /results | iphone-web | 32 | False |
| /destination | iphone-web | 27 | False |
| /cart | iphone-web | 19 | False |
| /checkout | iphone-web | 18 | False |
| /orders | iphone-web | 18 | False |
| /shop | iphone-web | 24 | False |
| /product | iphone-web | 24 | False |
| /event | iphone-web | 37 | False |
| /builder | iphone-web | 28 | False |
| /analyze | iphone-web | 23 | False |
| /hair | iphone-web | 28 | False |
| /skin | iphone-web | 28 | False |
| /body-fit | iphone-web | 28 | False |
| /consent | iphone-web | 16 | False |
| /quality | iphone-web | 15 | False |
| /goals | iphone-web | 21 | False |
| /report | iphone-web | 28 | False |
| /color | iphone-web | 35 | False |
| /guide | iphone-web | 29 | False |
| /studio | iphone-web | 50 | False |
| /advisor | iphone-web | 37 | False |
| /profile | iphone-web | 44 | False |
| /history | iphone-web | 15 | False |
| /privacy | iphone-web | 16 | False |
| /explore | iphone-web | 20 | False |
| /complete | iphone-web | 30 | False |
| /screenshot | iphone-web | 37 | False |
| /budget | iphone-web | 20 | False |
| /booking | iphone-web | 19 | False |
| /wardrobe | iphone-web | 16 | False |
| /calendar | iphone-web | 18 | False |
| /groups | iphone-web | 18 | False |
| /agent | iphone-web | 18 | False |
| /business | iphone-web | 5 | False |
| /admin | iphone-web | 4 | False |
| /login | iphone-web | 7 | False |
| /auth/callback | iphone-web | 7 | False |
| /admin/login | iphone-web | 6 | False |
| /business/login | iphone-web | 7 | False |
| /business/register | iphone-web | 7 | False |
| /register | iphone-web | 7 | False |
| / | tablet | 34 | False |
| /analyze | tablet | 23 | False |
| /results | tablet | 32 | False |
| /studio | tablet | 50 | False |
| /shop | tablet | 24 | False |
| /product | tablet | 24 | False |
| /login | tablet | 7 | False |
| /profile | tablet | 44 | False |
| /event | tablet | 37 | False |
| /destination | tablet | 27 | False |
| /builder | tablet | 28 | False |
| /business | tablet | 5 | False |
| /admin | tablet | 4 | False |

Source and DOM rows are separate inventories, not deduplicated unique logical controls. Explicit assertion rows are not actionable controls. A safe click changing state does not prove the intended API/database effect; such rows remain NOT TESTED/BLOCKED until semantic qualification. SKIPPED observations are NOT TESTED, never PASS. Conditional native and authenticated controls are recorded from source and separately blocked; no device/role is impersonated in a production environment.
