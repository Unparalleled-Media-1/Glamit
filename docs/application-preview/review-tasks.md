# Review the nine journeys

The latest [beauty-led visual pass](../specification/beauty-led-visual-pass.md) replaces Home/Analyze/Studio layouts. Also test Makeup/Hair/Skincare/Clothing category routing; reference thumbnail selection; Rose/Bronze/Berry swatches; makeup versus hair/outfit direction choices; correct Look Builder component handoff; reference palettes without personal-season claims. An editorial reference or swatch choice does not alter a user's original photograph.


Run the actual app with `npm run dev:web`, using the local URL printed by Next. Review each task at a phone viewport (320/390px) and desktop (1440px). The Expo app supplies native versions of the same journeys; compatible physical devices remain required. These are interactive, user-authored previews, with no invented AI or merchant results.

| Journey | Start / task | Expected completion and boundary |
|---|---|---|
| First visitor | `/` → choose one of six goals or Set up my GLAM Profile | Face Analysis and Personal Stylist visible immediately; photo not required to explore |
| First face analysis | `/analyze` → Start → local-preview permission → select valid photo → technical review → goals/report | Original stays local, errors are recoverable, uncomputed analysis never presented as a result |
| Returning user | Build/save a look, opt into Remember in Profile, reload → Home | Returning dashboard and saved plan restored; edit/delete or opt out; no conversation/photo persists |
| Event styling | `/event` → occasion/theme/date/deadline/budget/preferences/destination; add a message and local invitation | Brief survives internal navigation; themes remain user input and no AI reply/extraction/official verification is invented |
| AI makeover | `/studio` → tool/direction/intensity → original/compare/reset | Original unchanged; generation requires a connected qualified provider; explicitly carry direction to Look Builder |
| Live Look Builder | `/builder` → choose hair/makeup/clothing, replace hair, clear one component, save/edit look | Unrelated selections remain; snapshot updates only on Save; keyboard arrows move component tabs |
| Get This Look | Builder → Get This Look, set shopping country/city/currency | Same selected components, cost honestly unknown, separated organic/sponsored empty states; professional brief is not a confirmed quote/booking |
| Merchant Snap & List | `/business` → Merchant → Snap & List → rights/local originals → optional AI/manual facts → review/session draft | No altered original or fabricated enhancement; facts/duplicate validation; publication unavailable without qualified connections |
| Workspace switching | `/profile` → Switch workspace; inspect business tool inventory | Personal remains active; no role privilege from a selector; native lists all five business review roles; server revalidates real scoped memberships/capabilities |

Automated completion checks are in `tests/client/application.cjs` and recorded in `test-results.json`; these do not replace a human task study. For human review, record participant/cohort, device/browser, task completion, time, wrong turns, clarity of primary action, confidence in saved state, errors/loading and keyboard/screen-reader behavior. Do not capture private images or sensitive user text in study analytics. Test notches/home indicators, keyboard open/closed, zoom/reflow, portrait/landscape, text scaling and offline recovery on actual iOS/Android hardware.

Real-product matching accuracy needs licensed current supply and consented evaluation requirements, a relevance ground truth, variant/size/shade checks, freshness, fulfillment/deadline/total-cost evidence and measured exact/similar precision across diverse cohorts. The current fixture-based eligibility suite is not that benchmark.
