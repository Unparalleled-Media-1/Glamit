# Batch 1 shells vs design pack 9 (`GLAM-Pack-2-Source`, `GLAM-Diff-Files`)

Scope: `home`, GL-017, GL-035, GL-069, GL-117 and the persistent chrome. Method: source-level comparison only (design `s1/s3/s4/chrome.jsx` vs `apps/glam_mobile/lib`), plus one offline render of the design's Home. No Flutter build was rendered side by side, and no native run was made.

## Result: no drift, no code change needed
- Design sources `s1.jsx`, `s3.jsx`, `s4.jsx`, `chrome.jsx`, `ui.jsx`, `theme.css`, `styles.css`, `be.js`, `d3.jsx`, `p6.jsx`, `p9.jsx`, `p14.jsx` are byte-identical to the bundle the app was built from. Pack 9's CHANGES.md lists some of them as edited; for these five screens the files did not change.
- Every navigation target used by the five design screens exists in `lib` (5, 2, 5, 8 and 14 targets; none missing). Every literal string exists in `lib` apart from the design's hard-coded "✧ 12 credits", which the app renders from its (fixture-scoped) credits value.
- Route table: 232/232 IDs and paths equal the design `routes.js`.
- Home's `.top` bar (credits pill, notifications) is not visible in the design: `.g .vp .top{top:8px}` inside a hero shifted by `.g .vp .scr{top:-52px}` puts it off-screen. The design shows the persistent brand + messages bar instead, which `lib/shell/chrome.dart` implements. This is not a defect.

## Already documented deviations (unchanged)
DD-002 (Discover events strip kept below the action column), D2 (Studio title uses the on-photo colour in light theme), see `DEVIATIONS_FOR_APPROVAL.md`.

## Still not evidenced (from BATCH_1_EVIDENCE_STATE.md)
Native scroll/carousel gestures, iOS swipe-back on device, loading/empty/error states natively, release-binary capture, physical devices, real Georgia/Arial typography. GitHub Actions is billing-locked, so no new native captures can be produced now.

## Next
ADS-04 to ADS-10 and the GL-211/GL-212 advertiser flows.
