# GLAM AI architecture approval package

Prepared 3 November 2026; reconciled with the uploaded master specification on 5 November. The foundation and Complete the Look planning baseline were approved on 3 November; provider integrations, commercial activation and production release keep their separate evidence gates. See [approval history](../approvals.md) and [actual implementation status](../implementation-status.md).

This package answers the master build instruction for a commercially deployable beauty, hair, fashion and social-commerce platform with African specialization. It proposes a bounded path to that objective, not a claim that integrations or features exist.

| Read | Contents |
|---|---|
| [Master alignment](master-alignment.md) | Uploaded-source traceability, decisions carried forward, API/model gaps, release targets and next work |
| [Screen/design blueprint](screen-blueprint.md) | Five mobile tabs, normalized screen families, 16 admin modules, palette/accessibility and platform boundaries |
| [Visual design preview](../design-preview/index.html) | Standalone, interactive website/mobile/admin layout proposals; no live integrations |
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

The repository now contains the approved planning package and a tested foundation implementation: locked workspaces, API/credit/privacy primitives and web/mobile shells. The earlier empty-remote observation was historical and no longer describes this checkout. Most product workflows and all real provider/catalog/payment integrations remain unimplemented. Current-instance results are recorded in [validation](../validation.md), with feature scope in [implementation status](../implementation-status.md).

The referenced ChatGPT conversation could not be read because no conversation-reading tool is available in this session. The user has now supplied a [verbatim master-specification upload](sources/2026-11-master-product-specification.txt); its proposals and earlier conversation excerpts are reconciled in [master alignment](master-alignment.md). Explicit decisions in the current conversation/approval history govern conflicting alternatives. Pricing remains scenario modelling with hypothetical rates, not current vendor quotations. Design previews do not constitute implemented integrations.

## Proposed first commercial release

Use South Africa as the planning launch market, adults only, with English and ZAR first, while designing currencies, localization and country rules for expansion. These are approval decisions. Launch consumer analysis and try-on, curated product discovery, subscriptions/credits and a bounded set of verified professionals. Introduce creator commerce and advertising only after consent, commercial reconciliation and attribution controls pass their gates. Keep the full product in the requirements matrix throughout.

Consumer analysis is cosmetic guidance, not diagnosis. Avoid identity recognition and persistent facial identity templates. Skin tone/color suitability data may itself be sensitive: retain only with consent, limit its purpose and exclude it from advertising. Realism, African hair coverage, lawful processing and positive unit economics must be demonstrated before commercial claims.

## Approval and release boundaries

The user already approved the planning baseline and Phase 0/1 foundation work; see [decisions](decisions.md) for remaining external/vendor/commercial choices. Work within that scope can continue without requesting the same approval again. Launch scope, final retention, qualification spend and paid releases still require their applicable decisions/evidence. Production deployment and destructive database changes always require explicit action-specific approval.

Complete the Look adds R13–R27 and CTL-00–CTL-10. Its architecture, commercial rules and AC-01–AC-12 baseline were included in the recorded approval. Actual rollout remains gated by qualified providers, verified catalogs, privacy/commercial tests and release authorization; numerical scenarios are illustrative and no partner inventory is asserted.
