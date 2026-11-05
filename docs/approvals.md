# Approval record

On 3 November 2026, the user approved both scopes: the GLAM AI foundation scope and the Complete the Look architecture, commercial rules and acceptance baseline, saying **“both scopes above are approved.”**

The specification documents preserve their original proposal language as a design snapshot. This record supersedes their request to approve these two baselines. Development proceeds with the documented defaults, phased dependencies and evidence gates. Unselected vendors, unsupported countries, unmeasured quality and hypothetical economics remain unresolved facts, not completed integrations.

Authorized immediate work: Phase 0/1 foundations and dependency-appropriate Complete the Look foundation work, repository initialization, feature branches and reviewable PRs. Later commercial activation follows the phase gates. This is not approval to deploy production or make destructive database changes. No paid provider trial is run without the required account, finalized cap and secure credentials.

On 4 November 2026, the user selected Google sign-in and Supabase databases, explicitly deferring connection setup. The architecture uses Google through Supabase Auth and Supabase PostgreSQL; see [ADR 015](adr-015-supabase-google-capture.md). The user also confirmed that the facial step is **beauty-analysis scanning after Google sign-in**, not face recognition for account access. Camera/processing consent, capture quality, quote acceptance and private-image protections remain required.

On 5 November 2026, the user clarified the platform surfaces: the public website is an informational landing page that directs visitors to download the iOS/Android apps. Administrative control is on the web at `/admin`. All other product workflows, including consumer and non-admin business roles, belong in the mobile apps. This supersedes earlier consumer-web, web-checkout and non-admin web-dashboard proposals. It does not establish that store listings, the admin portal or mobile feature screens have been implemented.

The user further clarified that `/admin` manages the entire platform, including the mobile apps. The uploaded November master specification is preserved in `docs/specification/sources` and reconciled in `master-alignment.md`. Its historical proposals are subject to these explicit platform/identity decisions and the existing phase/release boundaries; the new visual blueprint is a design proposal, not a connected application or a production release authorization.
