# GLAM AI architecture approval package

Status: proposed; no implementation or production-readiness claim. Prepared 3 November 2026.

This package answers the master build instruction for a commercially deployable beauty, hair, fashion and social-commerce platform with African specialization. It proposes a bounded path to that objective, not a claim that integrations or features exist.

| Read | Contents |
|---|---|
| [Architecture](architecture.md) | System boundaries, repository layout, AI orchestration, payments, subscriptions, credits, marketplace and advertising |
| [Data model](data-model.md) | Canonical entity catalogue, relationships, invariants and retention boundaries |
| [Product and delivery](product-delivery.md) | Screen inventory, requirements traceability, phased backlog, dependencies, tests and release gates |
| [Security and privacy](security-privacy.md) | Access controls, image protections, abuse prevention, compliance and operational requirements |
| [Providers and economics](providers-economics.md) | Provider evaluation, qualification plan, reproducible cost assumptions and scenarios |
| [Decisions](decisions.md) | Architecture decision records and explicit implementation approval scope |
| [Complete the Look](complete-the-look.md) | Integrated look requirements, seven domain services, catalog truth rules and shopping flows |
| [Look schema and APIs](look-schema-api.md) | Canonical schema extensions and endpoint/data contracts |
| [Look ranking and commerce](look-ranking-commerce.md) | Organic scoring, CPC auction, caps, attribution, billing and advertiser dashboard |
| [Look delivery and economics](look-delivery-economics.md) | Incremental operating model, backlog and measurable acceptance gates |

## Context and scope

The requested `Unparalleled-Media-1/Glamit` remote currently advertises no refs; fetching `main` returned `couldn't find remote ref main`. The local checkout has no commits, source, manifests or tests. No application files were changed, no dependencies were selected or installed, and no production integrations were exercised. These documents are outside the checkout to preserve the onboarding constraint against source changes. They can enter an initial documentation pull request after repository initialization is authorized. No PR exists yet.

The referenced ChatGPT conversation could not be read because no conversation-reading tool is available in this session. The supplied master instruction is the authoritative product input. Pricing below is scenario modelling with explicitly hypothetical rates, not current vendor quotations. No prototype data or test substitute is proposed as a completed integration.

## Proposed first commercial release

Use South Africa as the planning launch market, adults only, with English and ZAR first, while designing currencies, localization and country rules for expansion. These are approval decisions. Launch consumer analysis and try-on, curated product discovery, subscriptions/credits and a bounded set of verified professionals. Introduce creator commerce and advertising only after consent, commercial reconciliation and attribution controls pass their gates. Keep the full product in the requirements matrix throughout.

Consumer analysis is cosmetic guidance, not diagnosis. Avoid identity recognition and persistent facial identity templates. Skin tone/color suitability data may itself be sensitive: retain only with consent, limit its purpose and exclude it from advertising. Realism, African hair coverage, lawful processing and positive unit economics must be demonstrated before commercial claims.

## Approval requested

Review [decisions.md](decisions.md). Approve or amend launch scope, image consent/retention, launch jurisdictions, provider/payment qualification budgets and phased delivery. Approval should authorize Phase 0 and Phase 1 only; later commercial integrations and production deployment have separate release gates. No implementation will begin before that approval. Production deployment and destructive database changes always require explicit approval.

Complete the Look adds R13–R27 and CTL-00–CTL-10 to that baseline. Its architecture, commercial rules and AC-01–AC-12 acceptance criteria require review/approval before production implementation. The extension is specification work only; numbers are illustrative and no partner inventory is asserted.
