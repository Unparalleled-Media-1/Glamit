# Branch inventory

Remote refs and tags fetched without pruning. Snapshot: 2026-11-06T06:13:23.441713+00:00. ** 17 distinct branch names; 15 remote and 16 local at discovery**. Audit branch was local-only then; publication changes remote count, not discovery result. One worktree, no stash, no detached HEAD, no tags. No `main` exists. Ahead/behind below are against actual default `feat/platform-foundations`, not main. Full authors, dates, changed files and conflict assessments: [JSON](evidence/branch-inventory.json).

| Branch                                         | SHA                                      | Ahead / behind default | Disposition                                                                               |
| ---------------------------------------------- | ---------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| audit/pre-supabase-g0                          | 1060e34263f0a980ba8ef66a8c148077a4a1355e | 18 / 0                 | DEFER: Audit evidence branch; not a product-release approval.                             |
| design/editorial-ui-ux-brief                   | 80d21a7df361ff9c5331df6ff3da46cc53fde3f9 | 5 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| docs/global-master-prd-v2                      | f48f3e0659ed53852bf9e5c4ed1b70ac414425cb | 4 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| docs/master-specification-and-design-blueprint | d700a0d820926c88f63cc2c911b2efebeec346e7 | 3 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| docs/mobile-first-product-surfaces             | 51207db59e1ab5df6e2368e4ec9a0416e9c54a09 | 2 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/analysis-first-platform                   | 30804917b62f4a80ea3c400e7cb4535ddcc28258 | 6 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/contextual-catalog-snap-list              | 5c65ec350810ff63269143cb08090212d2646b37 | 7 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/goal-led-styling-experience               | c323190c143d37e1416c29aab3f5a7f0b186dbba | 8 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/golden-screen-recovery                    | 240de1acf676963276fd19599289bd3c2f74fb33 | 13 / 0                 | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/interactive-preview                       | 4fc0b3ad7a9bcd2e9d554d63d0f85ba2892cda0e | 12 / 0                 | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/personalized-results-journey              | b97f1d6db1ad96b78d62e451c88a7bffbd212da4 | 16 / 0                 | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/platform-foundations                      | d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb | 0 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| feat/stripe-connect-test                       | 1060e34263f0a980ba8ef66a8c148077a4a1355e | 18 / 0                 | DEFER: Sandbox candidate; 0009 refuses non-test DBs, including Supabase postgres.         |
| feat/visual-beauty-experience                  | 79c4afa530a30e6d0343847b043c8aa4a0ef8ea8 | 9 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| fix/reproducible-client-toolchain              | e5bddf5683db571b9d0d2b4e0dbc9e87678063ca | 1 / 0                  | BLOCKED: Contained in core candidate, not main; awaits bootstrap, PR review and green CI. |
| gh-pages                                       | fe0c513319ecddbda650f3de9bdcc189135b73b4 | 1 / 24                 | DEFER: Generated preview publishing tree; never merge artifacts into app history.         |
| work                                           | d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb | 0 / 0                  | ARCHIVE CANDIDATE: Local historical baseline; preserve; no deletion authorized.           |

## Visible PR heads

API access for PR metadata and repository rulesets returned Forbidden. Git PR-head refs were read successfully. All nine heads are ancestors of default and candidate; ancestry does **not** establish merge/approval/state. No reviewed PR merge was performed.

| PR                                                          | Head SHA                                 | Subject                                                                                      | State / approval / checks   |
| ----------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| [#1](https://github.com/Unparalleled-Media-1/Glamit/pull/1) | d4c3241b5a48f6c4c5d6a8e32ee9cf33b37b93fc | chore(deps): bump actions/checkout from 4 to 7                                               | UNKNOWN / UNKNOWN / UNKNOWN |
| [#2](https://github.com/Unparalleled-Media-1/Glamit/pull/2) | 84bd8026f985b4ef1cae4d8b06c0676064d8e6fe | chore(deps-dev): bump @types/node from 24.10.0 to 26.6.6                                     | UNKNOWN / UNKNOWN / UNKNOWN |
| [#3](https://github.com/Unparalleled-Media-1/Glamit/pull/3) | 173db46b8dabd9e75125e73faed4a2a5bfd7d5f8 | Merge branch 'feat/platform-foundations' into dependabot/github_actions/actions/setup-node-7 | UNKNOWN / UNKNOWN / UNKNOWN |
| [#4](https://github.com/Unparalleled-Media-1/Glamit/pull/4) | 267000a1735d9e69f01a6bcd4e6f183ed6cbda82 | chore(deps): update psycopg[binary] requirement                                              | UNKNOWN / UNKNOWN / UNKNOWN |
| [#5](https://github.com/Unparalleled-Media-1/Glamit/pull/5) | e9dcfd41e7c1e51b321cac8948988b3293fa0d39 | Merge branch 'feat/platform-foundations' into dependabot/npm_and_yarn/typescript-7.0.2       | UNKNOWN / UNKNOWN / UNKNOWN |
| [#6](https://github.com/Unparalleled-Media-1/Glamit/pull/6) | 40c1ba410ec9a2561b793f511b6fa495683d7895 | chore(deps): update pyjwt[crypto] requirement                                                | UNKNOWN / UNKNOWN / UNKNOWN |
| [#7](https://github.com/Unparalleled-Media-1/Glamit/pull/7) | 3c47cfd0beaf3a950cf2b5e61d81c1a698c92b02 | chore(deps): bump astral-sh/setup-uv from 6 to 7                                             | UNKNOWN / UNKNOWN / UNKNOWN |
| [#8](https://github.com/Unparalleled-Media-1/Glamit/pull/8) | 117ac8f496b20835657fb316de2515f3ccf43ef7 | chore(deps): bump react from 19.3.0 to 19.3.1                                                | UNKNOWN / UNKNOWN / UNKNOWN |
| [#9](https://github.com/Unparalleled-Media-1/Glamit/pull/9) | d73179355f2746790de6f3bb54101664b9c34d27 | chore(deps): bump react-dom and @types/react-dom                                             | UNKNOWN / UNKNOWN / UNKNOWN |

No branches were deleted. `gh-pages` is a separate publishing history, not application source. Local `work` duplicates the default and is only an archive candidate. Conflict-free ancestry is not functional approval.
