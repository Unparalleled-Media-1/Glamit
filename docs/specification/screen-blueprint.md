# Mobile and web design blueprint

5 November 2026. Design proposal derived from the [uploaded master](sources/2026-11-master-product-specification.txt), reconciled by [master alignment](master-alignment.md). The [visual preview](../design-preview/index.html) illustrates the direction; it is not an implemented app journey or admin service.

Current direction: [Master PRD v2](master-prd-v2.md) and the [12-opportunity companion extension](style-companion-extension.md). Globally inclusive beauty/grooming/fashion, user-controlled Style DNA, occasion/budget planning and a confirmation-based Shopping Agent supersede an exclusively African/adults-only target product. African categories retain full support. Restricted teen/guardian-managed child flows are planned under the [age matrix](global-policy-architecture.md#age-specific-permission-matrix); no new age/country/capability is enabled. Expanded production architecture/criteria await approval.

## Product surfaces

Public web `/` explains the product and directs visitors to real app-store listings once available. It has privacy/support/legal links and truthful download availability. No public consumer web app or web checkout is planned. `/admin` is a responsive web control panel for the entire platform, including all mobile operations; it is not an admin dashboard limited to website content. All non-admin roles operate inside the iOS/Android apps, with authorized role-specific workspaces.

Mobile's five persistent destinations are **Home · Analyze · Studio · AI Advisor · Profile**. Commerce enters through Home recommendations or Complete the Look; saved looks are reachable through Studio and Profile. An active capture/job/payment flow can temporarily hide bottom navigation to protect confirmation/state; leaving must not silently submit or charge.

## Visual tokens and components

| Token | Value / use |
|---|---|
| Rose | `#F46F98`, brand highlight and primary background with Plum text |
| Blush | `#FBE7ED`, secondary panels and selected backgrounds |
| Ivory | `#FFF9F6`, page background |
| Plum | `#382633`, primary text and high-contrast surfaces |
| Bronze | `#B48A64`, decoration; not small text on Ivory |
| Action Rose | `#9F3457`, accessible dark action background with white text |
| Typography | System sans-serif for controls/body; optional editorial display face for headings after licensing/availability review |
| Layout | 8-point spacing system, 20–24 px mobile gutters, 16–24 px card radius; large portrait/results area only after consent or using clearly licensed inspiration |
| Interaction | At least 44 pt iOS / 48 dp Android targets; visible keyboard focus; reduced-motion behavior; no undisclosed automatic camera start |

Computed WCAG sRGB contrast: Plum/Ivory 13.48:1; Plum/Rose 5.07:1; white/Action Rose 6.77:1; white/Rose 2.77:1 and Bronze/Ivory 2.98:1 fail normal-text AA. Use the accessible pairs for body text/buttons. This arithmetic does not replace rendered screen-reader, text-scaling, focus and device testing.

Core components: safe-area shell, bottom tabs, feature/inspiration card, purpose-specific consent sheet, capture guide/countdown/cancel, quality warning/retake, expiring server quote, job progress/cancel, original-versus-simulation comparison, editable uncertainty explanation, owned saved-look card, organic versus Sponsored offer groups, unavailable/empty/error panels and verified purchase/restore state. No sliders or scores implying numerical attractiveness.

V2 components add verified age/guardian context and safe blocked states, locale/RTL/units/size-chart controls, Exact/Similar evidence cards, itemized delivered-cost proposals, professional feasibility/quote states, editable memory provenance/reset, private wardrobe/twin expiry/revoke, occasion checklist/reminders and group invite/share permissions. Any actual simulation keeps identity/complexion/body proportions/visible features; style choices never infer or restrict ethnicity, religion, gender identity or disability. The visual preview remains an LTR concept; RTL, large-text and assistive-technology qualification is future work.

## Consumer screen families

The source says **47 screens**, but its category counts sum to **50**: 13 + 6 + 7 + 7 + 12 + 5. Use the 50 screen-family IDs below for planning (45 core + 5 expansion). This is a proposed normalization, not a claim that the source specified every missing title. Combined families can contain nested screens; final route count follows wireframe review. Guest/account-recovery families retain the selected Google-first constraint instead of introducing local credentials.

V2 extends this retained v1 inventory with M51–M71 below, for **71 proposed consumer screen families**, plus B01–B03 explicit business-workspace additions and the existing business-role inventory. These are planning families across stages, not 71 implemented routes or an all-at-once MVP promise. Website remains informational/download-only; admin stays on web.

| ID | Family | Entry / gate |
|---|---|---|
| M01 | Initialization and service availability | Start; no private processing |
| M02 | Welcome/value proposition | First visit |
| M03 | Feature introduction | Honest capability/availability labels |
| M04 | Country/language and age-appropriate eligibility | Jurisdiction-specific assurance/guardian capabilities; missing policy does not grant adult access |
| M05 | Beauty goals | Optional preferences, not processing consent |
| M06 | Style/hair preferences | Inclusive natural/braid/loc/wig/protective choices; user corrections |
| M07 | Capture guidance | After sign-in, purpose disclosure first |
| M08 | Camera/manual capture or supported upload alternative | Explicit permission and Start scan; cancel/countdown/retake |
| M09 | Quality review | Blur/light/occlusion uncertainty; do not retain rejected frames |
| M10 | Privacy and processing consent | Separate camera, processor, storage and marketing purposes |
| M11 | Guest results introduction | Deferred alternate flow; no guest photo processing in selected baseline |
| M12 | Google sign-in/account entry | Supabase browser/PKCE callback; no Google password collection |
| M13 | Account-access help/recovery | Provider-owned recovery; no parallel password system |
| M14 | Home | Goals, inspiration, honest unavailable/empty states |
| M15 | Analysis confirmation/quote | Exact server price, purpose and expiry before submission |
| M16 | Analysis progress/cancel | Provider-independent job lifecycle and reconnect |
| M17 | Beauty report | Cosmetic guidance, confidence and limits; no diagnosis/attractiveness score |
| M18 | Personal color palette | Lighting uncertainty and user correction |
| M19 | Analysis feedback | Owner-scoped correction; separate evaluation consent |
| M20 | Studio overview | Original input remains accessible |
| M21 | Makeup/cosmetic style/intensity | Qualified purpose/age/market parameters; no complexion normalization |
| M22 | Hair/grooming/beard/color selection | Straight/wavy/curly/coily/thinning/absent hair, natural/protective/wig/barber and localized coverage |
| M23 | Complete makeover configuration | Explicit components and complexion-preservation disclosure |
| M24 | Generation quote/progress | Confirm first; success-only consumption; failure/cancel release |
| M25 | Before/after comparison | Mark output as simulation, retain original access |
| M26 | Saved looks/detail | Consent, retention and deletion; no automatic public sharing |
| M27 | Advisor conversation list | Owned history and purpose controls |
| M28 | Advisor chat | Policy-checked recommendations, no invented products/medical advice |
| M29 | Routine/beauty plan | Clear steps and sources/limitations |
| M30 | Routine progress | Optional tracking and deletable history |
| M31 | Product recommendations | Actual eligible catalog only; separate organic/Sponsored |
| M32 | Product details/offer comparison | Fresh stock/price/region and disclosed external destination |
| M33 | Saved products/shopping list | Owned list; totals estimates until quote |
| M34 | Profile overview | Account state and owned shortcuts |
| M35 | Edit goals/preferences | No role/entitlement edits |
| M36 | Plans/benefit comparison | Approved localized store price; no hardcoded commercial promises |
| M37 | Store purchase confirmation/result | User consent; server verification before entitlement |
| M38 | Subscription status/manage/restore | Renewal/grace/refund/cancellation and verified restore |
| M39 | Credit balance/lots | Purchased versus included units, disclosed expiry/priority |
| M40 | Credit history/receipts | Server-derived ledger and per-job lineage |
| M41 | Notifications/settings | Consent and platform permission controls |
| M42 | Privacy/consent center | Purpose withdrawal and consequences |
| M43 | Data export/status | Verified owner; auditable request |
| M44 | Account deletion/status | Confirm, revoke sessions, track object/provider completion |
| M45 | Help/support/security | Redacted support, session/device controls |
| M46 | Complete Look checklist | Immutable decomposition, confirmed quantities/requirements |
| M47 | Shop/compare/within-budget assembly | Actual offers, unfilled components visible; no imaginary price fits |
| M48 | Book the Look/professionals | Real availability/quote/deposit and regional rules |
| M49 | Creator looks/collections | Licensing, moderation and sponsorship/affiliate disclosures |
| M50 | Fashion/wardrobe stylist | Qualified garment preservation, fit limitations and rights |

### V2 global and companion additions

| ID | Family | Entry / gate |
|---|---|---|
| M51 | Screenshot upload/rights and component confirmation | Safe private upload, explicit permitted source/purpose; no arbitrary social scraping |
| M52 | Visual search Exact/Similar/Unknown results | Independent identity evidence for Exact; real offer freshness/eligibility |
| M53 | Global occasion discovery | Voluntary event/cultural/coverage/preferences; no sensitive identity inference |
| M54 | Full delivered-cost budget builder | Item/merchant shipping/tax/duty/full service obligations and explicit unknowns |
| M55 | Book the Exact Look feasibility/quote | Scoped reference sharing, verified skill, materials/duration/terms; request is not booking |
| M56 | Guardian/family hub | Verified limited authority; no sibling/other-household access |
| M57 | Managed child context/permissions | Curated restricted styling; no adult session inheritance, child public profile or launch photorealistic twin |
| M58 | Teen eligibility/privacy/consent and access help | Approved jurisdiction route; no appearance profiling/pressure or initial ads |
| M59 | Size/fit/adaptive/modest preferences | Optional declared measurements/units/size charts; no guaranteed fit or inferred identity |
| M60 | Share/try a style template and rights preview | Private by default, explicit asset allowlist, revocable tokens, no youth publication initially |
| M61 | Optional loyalty/referral controls | Verified eligible events, reversible accounting and no coercive appearance streaks |
| M62 | Style DNA/memory review/edit/reset | Explicit choices versus permitted learned suggestions; inspect/delete provenance and consent |
| M63 | Private Digital Wardrobe | User-confirmed owned items, editable attributes, face/background minimization and deletion |
| M64 | Private Style Twin setup/reuse/revoke | Separately qualified purpose/model/age/region/retention; no persistent photorealistic child twin at launch |
| M65 | Occasion Concierge itinerary/checklist | Source-backed arrival/service evidence, reminders opt-in and local timezone |
| M66 | Group styling organizer/invites | Theme/palette only; no authority over others' private media or transactions |
| M67 | Group participant choice/leave/revoke | Per-member rights/age/guardian and explicit sharing controls |
| M68 | AI Shopping Agent proposal/review/confirm | Read-only planning; exact current total/obligations require human confirmation before side effects |
| M69 | Resale/rental/refurbished offer and terms | Condition/authenticity, rental period/deposit/damage/return/full-cost evidence; later stage |
| M70 | Creator challenge participation/privacy | Rights/moderation, no appearance-ranking contests, no implicit image reuse or unqualified youth publication |
| M71 | Daily outfit/product-use/maintenance planning | Optional useful non-shopping guidance, correction/reminders/deletion; no medical claims |

Screen order does not authorize anonymous capture: M12 or the reviewed restricted guardian route, plus age/market/purpose/rights/quote gates, precede any permitted M08 submission. Unknown or unqualified age mode cannot submit. Denied camera, expired quotes, lost network, no matches, refusal/abstention, provider failure, cancellation and deletion-in-progress are designed states, not separate count inflation.

### Non-admin mobile business workspaces

| Audience | Workspace / screens beyond consumer count | Permission boundary |
|---|---|---|
| Merchant | Verification, catalog/feed errors/freshness, variants/stock, orders/returns, payout/reconciliation, team | Verified organization membership and action scope |
| Professional | Portfolio/services, availability/resources, booking holds/calendar, cancellations/completion, earnings/team | Professional organization/resource scope; no automatic facial-image access |
| Creator | Profile/rights/licensed posts, shoppable collections, affiliate agreements, verified commissions and payout statements | Published content separated from private consumer inputs |
| Advertiser | Verification/catalog linkage, campaigns/ad groups/creative/bids, budget/frequency/schedule, click/conversion reports, invoices/appeals | Organization/billing authority, privacy-filtered aggregates only |

These workflows stay in mobile; they are additional planned role routes, not hidden inside the source's consumer count. Admin can control eligibility and review them without impersonating their users or bypassing commerce rules.

| V2 business ID | Added mobile workspace family | Gate |
|---|---|---|
| B01 | AI-assisted catalog drafts/review | Merchant rights/verification and approval before canonical publication; no generated price/stock/claims |
| B02 | Merchant/advertiser aggregate intelligence | Approved dimensions, consent/suppression/anti-differencing, no private profiles/lists or youth commercial events |
| B03 | Later B2B API clients/scopes/usage | Verified organization/contracts/vendor rights, tenant/region/age scope, quotas/rotation and reconciled billing |

## Sixteen web admin modules

The upload names six modules, then an unexpanded “Show all 16 modules” control. A01–A06 preserve the named modules; A07–A16 are proposed completions derived from the remaining platform requirements, not recovered hidden source content.

| ID | Module / representative route | Controls and safeguards |
|---|---|---|
| A01 | Executive overview `/admin` | Actual DAU/MAU/revenue/retention/cost/incident aggregates with freshness; disconnected is not zero |
| A02 | Users `/admin/users` | Search/state/scoped support; redacted metadata, no default selfie access |
| A03 | Subscriptions `/admin/subscriptions` | Verified billing events, entitlement/restore/refund/reconciliation evidence |
| A04 | Credits `/admin/credits` | Ledger inspection; reasoned compensating adjustments; thresholded dual approval |
| A05 | AI operations `/admin/ai` | Registry/model versions, latency/cost/timeouts, evaluated fallback/kill switches |
| A06 | Analysis quality `/admin/quality` | Consented global cohort/model evaluation, disparity/uncertainty/fidelity/cost; no inferred protected identity or beauty ranking |
| A07 | Catalog `/admin/catalog` | Rights/ingestion/freshness/duplicate/stock review; no fake availability |
| A08 | Merchants `/admin/merchants` | Verification/team/fulfillment/returns and settlement exceptions |
| A09 | Professionals/bookings `/admin/professionals` | Verification/services/resources, booking disputes and limited support |
| A10 | Creators/content `/admin/content` | Licensed collections, moderation/report/block/appeal and sponsorship disclosure |
| A11 | Advertising `/admin/advertising` | Campaign/creative approval, caps/fraud, CPC/attribution/invoice reconciliation |
| A12 | Mobile app controls `/admin/app-controls` | Versioned country/age/capability/provider configuration, minimum app version, release/API scopes and kill switches; unmet prerequisites cannot be toggled away |
| A13 | Support `/admin/support` | Cases, redacted access, reasoned short-lived exceptional grants; no blanket impersonation |
| A14 | Privacy/compliance `/admin/privacy` | Jurisdiction/age/guardian/consent policy and private memory/wardrobe/twin/group rights, deletion/vendor evidence and lawful holds; no default child media access |
| A15 | Roles/access `/admin/access` | Server assignments, expiries, access review and mandatory privileged MFA |
| A16 | Audit/security `/admin/audit` | Append-only events, incident/security evidence and scoped exports |

Roles: Super Admin, Finance, Customer Support, Content Editor, AI Operations, Compliance and Read-Only Analyst. Explicit backend permissions govern every action; UI hiding and the `/admin` URL do not authorize anyone. Privileged financial/private-data actions require assurance/step-up, reason/audit, and dual control where specified. Financial/media access is never implied by a broad dashboard role.

## Preview and acceptance boundary

The standalone preview has public web, five mobile-tab layouts and admin-module navigation with disconnected/empty states. It makes no API requests, activates no camera, accepts no payments, seeds no approved consent and displays no fabricated business metrics/catalog. It uses abstract brand artwork rather than private selfies or unlicensed portraits. Backend/auth, actual native navigation, provider outputs, store downloads and measured product quality remain implementation/integration work.

Review checks: five tab labels and clear selection, keyboard/focus behavior, screen-family traceability, visible preview state, disabled downloads/processing while unavailable, admin control coverage including mobile, responsive layouts, contrast and reduced-motion behavior. Live device, VoiceOver/TalkBack and full WCAG testing remain release gates.
