# Click-through results

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

| Metric | Observed |
|---|---|
| routes | 39 |
| route_viewport_visits | 117 |
| rendered_control_occurrences | 3108 |
| console_errors | 0 |
| page_errors | 0 |
| http_errors | 0 |
| overflow | 0 |
| broken_images | 0 |
| accessibility_violations | 0 |

| Action disposition | Occurrences |
|---|---|
| PASSED | 1413 |
| PASSED_IDEMPOTENT | 41 |
| SKIPPED | 430 |
| BLOCKED | 86 |
| SKIPPED_ALREADY_CURRENT | 10 |

A passed generic action means an observable local state/navigation response or verified idempotent selection. It does not prove AI output, persistence, stock, checkout or booking. Disabled and skipped controls are not passes. The finite allowlist blocks all external/mutating network requests and starts fresh pages for each action. Inputs, irreversible controls and inaccessible authenticated states are not blindly clicked.

The initial harness incorrectly pointer-clicked keyboard-only skip links and omitted textarea values from state comparisons. Its initial results are preserved; corrected keyboard/form-state rechecks are separate. A real focus failure on business/admin was repaired. Already-current links without a new observable response are documented separately rather than counted as extra successes.

Screenshots, per-viewport traces, recordings and the local dashboard are in `/workspace/artifacts/glam-launch`. [Evidence](evidence/interactions.json); [initial pass](evidence/interactions-initial.json); [recheck](evidence/interactions-recheck.json).
