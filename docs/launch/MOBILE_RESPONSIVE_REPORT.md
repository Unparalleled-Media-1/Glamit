# Mobile, responsive and accessibility

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

| ID | Journey | Status | Scope / blocker |
|---|---|---|---|
| W04 | iOS and Android biometric reauthentication | BLOCKED | No signed app identifiers/builds or physical devices; OS doubles and Metro exports are insufficient |
| W30 | Responsive accessibility including real native and screen readers | BLOCKED | Browser viewport/axe/keyboard evidence is available; VoiceOver/TalkBack and real iOS/Android validation remain unexecuted |

All routes were inspected at desktop 1440×1000 and iPhone-web 390×844. Thirteen key routes were additionally checked at Android-web 412×915, tablet 768×1024 and landscape 844×390. Browser tests cover overflow, images, accessible labels/roles, automated WCAG rules, fixed-navigation clearance, keyboard/history, dialog focus, offline notices and file validation. Small-target inventory is a heuristic; inline-link exceptions and manual screen-reader evaluation require review. Automated axe success does not establish complete WCAG conformance. No physical device, native keyboard, Face ID/Touch ID, TalkBack or VoiceOver certification. Local LCP/CLS/FCP observations are in [performance evidence](evidence/local-performance.json); no production field CWV/INP or load claim.

[Complete machine-readable results](evidence/workflow-results.json).
