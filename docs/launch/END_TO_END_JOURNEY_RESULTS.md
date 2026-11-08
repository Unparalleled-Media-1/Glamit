# End-to-end journey results

Observed 2026-11-08T15:00:58.123916+00:00. Source base `d38cf1667a50d5ae240dc75da6c683a770363fd9` plus the uncommitted/committed audit patch. Exact tested file hashes are in evidence/final/source-hashes.json. This is a failed acceptance audit, not a certificate of completion.

| Step | WEB | iOS | ANDROID |
| --- | --- | --- | --- |
| Choose/capture image with consent | PASS local preview; synthetic browser camera only | NOT TESTED native permission/camera | NOT TESTED native permission/camera |
| Private upload + retention/deletion | FAIL missing canonical upload/storage lifecycle | FAIL missing lifecycle | FAIL missing lifecycle |
| Receive user-specific analysis | FAIL endpoint returns 503 | FAIL missing connected workflow | FAIL missing connected workflow |
| Correct and persist analysis | FAIL canonical corrected report versions missing | FAIL | FAIL |
| Explore looks and real virtual try-on | FAIL production adapter dispatch disconnected | FAIL | FAIL |
| Find verified local products/professionals | FAIL live catalog/availability transport incomplete | FAIL | FAIL |
| Add cart → server-priced checkout | FAIL durable hosted checkout workflow missing | FAIL | FAIL |
| Paid order confirmation → merchant fulfillment | FAIL operational order/fulfillment workflow missing | FAIL | FAIL |

No complete real journey passed. Contract doubles are isolated tests, not operational analysis, verified commerce or settlement. No external photo upload, live charge, payout or unsolicited notification was attempted.
