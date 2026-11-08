"Generate the requested feature audit deliverables from curated traceability and observations."

import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = Path("docs/audit")


def table(headers, rows):
    def safe(value):
        return str(value).replace("|", "/").replace("\n", " ")

    return "\n".join(
        ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
        + ["| " + " | ".join(safe(v) for v in row) + " |" for row in rows]
    )


def main():
    rows = list(csv.DictReader((BASE / "GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv").open()))
    source = json.loads((BASE / "requirements.json").read_text())
    summary = json.loads((BASE / "evidence/feature-summary.json").read_text())
    assert summary["total_atomic_requirements"] == len(rows)
    remote = json.loads((BASE / "evidence/remote-readiness.json").read_text())
    catalog = json.loads((BASE / "evidence/production-catalog.json").read_text())
    ci = json.loads((BASE / "evidence/railway-ci-receipt.json").read_text())
    cors = json.loads((BASE / "evidence/cors.json").read_text())
    counts = Counter(r["implementation_status"] for r in rows)
    now = datetime.now(ZoneInfo("Africa/Johannesburg")).strftime("%d %B %Y %H:%M SAST")
    prefix = (
        f"{now}. **NO-GO. Audit plus one tested P0 candidate repair; "
        "no agent-initiated production deployment, schema write, login message "
        "or financial mutation.**\n\n"
    )
    links = (
        "[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · "
        "[Fresh remote metadata](evidence/remote-readiness.json) · "
        "[Production catalog](evidence/production-catalog.json) · "
        "[Deployed receipt](evidence/railway-ci-receipt.json).\n\n"
    )

    def write(name, title, body):
        (BASE / name).write_text("# " + title + "\n\n" + prefix + links + body + "\n")

    def feature_rows(profile):
        return [
            (
                r["feature_id"],
                r["approved_requirement"],
                r["implementation_status"],
                r["remaining_blockers"],
            )
            for r in rows
            if r["audit_area"] == source["profiles"][profile]["group"]
        ]

    write(
        "GLAM_BEAUTY_FEATURE_COVERAGE_REPORT.md",
        "GLAM Beauty feature coverage",
        f"{len(rows)} atomic approved requirements reconciled; **0 VERIFIED COMPLETE** "
        "under the six-layer acceptance rule (UI, backend/permissions, secured persistence, "
        "real provider, E2E failure/recovery, exact deployed/native verification). "
        f"Operational verification coverage is **0/{len(rows)} = 0%**. "
        "This is not a claim that no code exists.\n\n"
        + table(["Status", "Count"], [(k, counts[k]) for k in sorted(counts)])
        + "\n\n"
        + source["methodology"]
        + "\n\nNo feature has been silently deferred; no row is APPROVED "
        "FOR LATER PHASE. Priority classifications guide dependency "
        "order and do not authorize scope reduction. Missing and "
        "placeholder code remains implementation work even after "
        "credentials arrive. Six credential-blocked rows and two "
        "platform-approval-blocked rows are exclusive primary "
        "statuses, not all integration-dependent features.\n\n"
        + table(["Area", "Atomic requirements"], Counter(r["audit_area"] for r in rows).items())
        + "\n\n## Evidence limits\n\n"
        "Fresh8Nov system catalogs confirm41 public tables at0013, "
        "with RLS enabled on all41; no Storage buckets. The actual "
        "deployed SHA is ff62f64;78 anonymous HTTP responses "
        "succeeded, readiness503,0/31 qualified journeys. Current260 "
        "local PostgreSQL tests pass after a stopped local container "
        "was restarted and recovered. Those tests include "
        "provider/Stripe doubles and do not prove live services. "
        "Native code is separate React Native/Expo, not inferred "
        "from responsive web.\n\n"
        "Every CSV row identifies source context, route/screen, "
        "service/port, tables/migrations, provider/config names, "
        "related tests, Git evidence, security/device limits, "
        "blocker and remediation. Source references on MISSING rows "
        "are inspected surrounding context, not claims of "
        "implementation. Actual AST-discovered standalone endpoints "
        "are in evidence/api-inventory.json.\n\n"
        "## Candidate remediation\n\nP0 production web build guard now "
        "refuses an absent public Supabase key, rejects privileged "
        "keys without echoing values, and preserves offline frontend "
        "builds. A new regression fails before the repair and passes "
        "after. The Docker build stage invokes the guard. This is "
        "not a fix to current Railway variables; deployed readiness "
        "remains BROKEN. See evidence/validation.json for final "
        "command results.",
    )

    write(
        "WEB_VS_MOBILE_PARITY_REPORT.md",
        "Web versus native parity",
        "Both web and native sources were inspected. No signed "
        "IPA/AAB, OS camera/biometric/screen-reader run or native "
        "installation was available.\n\n"
        + table(
            ["Area", "Actual web", "Actual React Native", "Qualification gap"],
            [(p["group"], p["web"], p["native"], p["note"]) for p in source["profiles"].values()],
        )
        + "\n\n## Confirmed parity gaps\n\n"
        "1. Web HostedAccount.tsx implements profile editing and "
        "authenticated routine CRUD. Native NativeAccount.tsx shows "
        "an account summary, biometric enable/disable and logout; "
        "native App.tsx routines use the local reducer. Shared "
        "session/account helpers do not establish synced native "
        "routine editing.\n"
        "2. Web AccountSecurity.tsx implements link-provider and "
        "phone-change/OTP forms; the signed-in native account panel "
        "has no equivalent account-security controls. Actual "
        "providers are disabled on both.\n"
        "3. Native App.tsx and MerchantSnapList.tsx invoke Expo "
        "camera/gallery and cache cleanup. Default web has no camera "
        "action; the separate reviewed/tested repair remains PR28, "
        "unmerged. No physical-device behavior is inferred.\n"
        "4. Web business/admin has broad desktop module layouts; "
        "native has role quick tools/planning, not an equivalent "
        "operational admin console. Admin may intentionally remain "
        "web-only; no native admin completion is required by a "
        "generic responsive pass.\n\n"
        "AI/provider generation, durable wardrobe, visual search, "
        "real checkout and bookings are missing/disconnected across "
        "both clients; matching empty states are not operational "
        "parity. Exact source references are in the CSV, notably "
        "apps/mobile/App.tsx, apps/mobile/auth/NativeAccount.tsx, "
        "apps/web/components/HostedAccount.tsx and "
        "AccountSecurity.tsx.",
    )

    write(
        "AI_FEATURE_AUDIT.md",
        "AI feature audit",
        table(
            ["ID", "Requirement", "Status", "Gap"],
            feature_rows("analysis") + feature_rows("studio") + feature_rows("style"),
        )
        + "\n\n## Invocation and privacy findings\n\n"
        "`services/api/src/glam_api/workspaces.py::analysis_unavailab"
        "le` deliberately returns503; it accepts no raw media. "
        "`integrations/providers.py` contains internal "
        "OpenAI/Replicate/Fashn/GoogleMaps/OpenMeteo candidates, "
        "explicitly unmounted. `packages/product/companion.ts` "
        "defines optional ports, but web/native defaults supply no "
        "CompanionConnection. No actual analysis/try-on/advisor "
        "output was obtained. OPENAI_API_KEY, REPLICATE_API_TOKEN, "
        "FASHN_API_KEY and GOOGLE_MAPS_API_KEY are absent. "
        "Open-Meteo needs no API key, but its adapter is still not "
        "connected.\n\n"
        "PersonalResults uncertainty validation, correction revision "
        "invalidation, cancellation, strict image-origin checks and "
        "retry UI exist. They are safety/contract tests, not "
        "provider quality, identity-preservation or user-specific "
        "result evidence. Skin/hair/body sections must not be "
        "relabeled operational from editorial imagery. No "
        "medical/protected-attribute inference, beauty scoring or "
        "personal image provider call was performed. No production "
        "image bucket/upload/retention/delete orchestration exists.\n\n"
        "Required next chain: qualified user consent/eligibility → "
        "private object lifecycle → authenticated provider "
        "orchestration and usage reservation → genuine output "
        "validation → result/correction persistence → "
        "reopen/erase/failure tests → controlled deployed and "
        "diverse-cohort evaluation. Saved preference fields are not "
        "approved AI report history.",
    )

    write(
        "AUTHENTICATION_AUDIT.md",
        "Authentication and identity audit",
        table(["ID", "Requirement", "Status", "Gap"], feature_rows("auth"))
        + "\n\n"
        + table(
            ["Production setting", "Observed value"], [(k, v) for k, v in remote["auth"].items()]
        )
        + "\n\n"
        + table(
            ["Origin", "Edge preflight", "Allow-origin"],
            [(r["origin"], r["status"], r["allow_origin"]) for r in cors["results"]],
        )
        + "\n\nAll four named providers are disabled and their "
        "configured-credential presence flags are false. No OTP was "
        "sent, user created, identity linked, session revoked or "
        "account deleted in production. Supabase Auth settings still "
        "reference www.glamit.beauty/glamai callback rather than the "
        "intended new web origin.\n\n"
        "Native biometric code uses OS enrollment, "
        "expo-local-authentication and authenticated SecureStore "
        "refresh secrets; it is session unlock after real "
        "authentication, not server-side facial recognition. "
        "Invalidation, background/restart/reinstall and lost-device "
        "cases need signed real devices. Account deletion lacks a "
        "complete server orchestrator; local preview clear/logout "
        "must not be presented as account erasure. Raw biological "
        "templates are not uploaded by this code.",
    )

    write(
        "MARKETPLACE_AND_PAYMENTS_AUDIT.md",
        "Marketplace and payments audit",
        table(
            ["ID", "Requirement", "Status", "Gap"],
            feature_rows("market") + feature_rows("merchant") + feature_rows("pay"),
        )
        + "\n\n## Production versus sandbox\n\n"
        "Canonical catalog/review/matching code is in standalone "
        "FastAPI. Production clients do not instantiate GlamApi and "
        "instead use selected direct Edge account/creator "
        "operations. The Edge dispatcher at0013 delegates to SQL/RPC "
        "and raises BACKEND_OPERATION_NOT_IMPLEMENTED for "
        "unsupported catalog/order/booking paths. Candidate consumer "
        "quote/offer/order ports are unbound. No operational durable "
        "cart, stock hold, consumer order, merchant fulfillment or "
        "appointment service was found.\n\n"
        "StripeTestConfig refuses live keys and nonlocal/non_test "
        "databases. The isolated0009 migration is a sibling, absent "
        "from production. Do not merge it into application "
        "deployment. Server commerce_policy.py preserves10% eligible "
        "physical-item policy; local sandbox verifies "
        "allocation/refund/idempotency/double-entry behavior with "
        "transport doubles. No additional professional/creator "
        "percentage is approved.\n\n"
        + table(
            ["Actual financial observation", "Result"],
            [
                ("GET /v1/balance mode", remote["stripe"]["livemode"]),
                ("Actual payment IDs", "NONE"),
                ("Actual transfer IDs", "NONE"),
                ("Actual processing fees/reconciliation", "NOT EXECUTED"),
                ("Financial mutations", 0),
            ],
        )
        + "\n\nUse distinct Stripe test keys, signed test webhook, "
        "eligible connected test accounts and isolated ledger. "
        "Qualify platform country/settlement capabilities, real test "
        "success/failure/refund/dispute/duplicates/partial "
        "fulfillment, actual balance transactions and transfers "
        "before financial acceptance. An existing test balance is "
        "not commission proof.",
    )

    write(
        "CREATOR_SOCIAL_INTEGRATION_AUDIT.md",
        "Creator and official social API audit",
        table(["ID", "Requirement", "Status", "Gap"], feature_rows("creator"))
        + "\n\nCreatorStudio web/native and owner-scoped0014 draft RPCs "
        "are source candidates; production remains0013. Candidate "
        "connected_social_accounts/profile URL records store "
        "declared references, not authenticated provider links. "
        "Authorize/sync/publish paths deliberately return503. No "
        "TikTok/Instagram/YouTube/Pinterest/Facebook API was called, "
        "audience metric fabricated, media scraped or payout made.\n\n"
        "Secure provider OAuth state/callback/PKCE where supported, "
        "approved official scopes, encrypted credential lifecycle, "
        "actual media rights/permissions, disconnect/revocation, "
        "rate limits and abuse/deletion tests are missing. Shoppable "
        "publication requires real verified "
        "catalog/rights/moderation; creator earnings need executed "
        "contracts and actual attributable commerce. Do not infer "
        "operational campaign applications or payouts merely from "
        "schema tables.0014 requires separate validated production "
        "deployment approval; no migration was applied here.",
    )

    write(
        "SUPABASE_BACKEND_AUDIT.md",
        "Supabase and backend verification",
        f"Original project `{remote['project_ref']}`, "
        f"status `{remote['target']['status']}`, observed `{remote['observed_at']}`. "
        f"Actual revision `{catalog['revision'][0]['version_num']}`.\n\n"
        + table(
            ["Production metadata", "Result"],
            [
                ("Public tables", len(catalog["tables"])),
                ("Tables without RLS", sum(not t["rowsecurity"] for t in catalog["tables"])),
                ("Indexes", len(catalog["indexes"])),
                ("Policies", len(catalog["policies"])),
                ("Foreign keys", sum(c["contype"] == "f" for c in catalog["constraints"])),
                (
                    "Unvalidated constraints",
                    sum(not c["convalidated"] for c in catalog["constraints"]),
                ),
                ("Storage buckets", remote["storage"]["bucket_count"]),
            ],
        )
        + "\n\n"
        + table(
            ["Actual public table", "RLS flag"],
            [(t["tablename"], t["rowsecurity"]) for t in catalog["tables"]],
        )
        + "\n\nFull columns, constraints/index definitions, grants, "
        "function security metadata and policy expressions are "
        "retained in evidence/production-catalog.json. All41 RLS "
        "flags are enabled; some internal tables intentionally have "
        "no client policy/grant. Policy presence is not proof of "
        "complete feature-specific or production multi-user "
        "authorization. Local PostgreSQL tests cover RLS, "
        "staff/membership/grant revocation, migrations and "
        "cross-session data. No customer rows were read or written.\n\n"
        "Production lacks actual wardrobe, trip, booking, commerce "
        "order/subscription/campaign/media lifecycle models. "
        "style_passports currently stores approved preferences, not "
        "complete analyzed report versions.0014 creator schema is "
        "source-only.0009 is a separate sandbox graph. Do not run "
        "application@head against production without reviewing0014 "
        "and the deployment gate; do not stamp revisions, create "
        "duplicate tables, reset production or recreate the deleted "
        "branch.\n\n"
        "Anonymous hosted profile access returned401 and health200. "
        "These do not prove authenticated production read/write. "
        "Storage upload/access/retention/deletion is missing;0 "
        "buckets means no signed binary lifecycle was demonstrated. "
        "Completed physical backup metadata exists; restore and "
        "rollback rehearsals do not.",
    )

    backend_report = BASE / "SUPABASE_BACKEND_AUDIT.md"
    backend_report.write_text(
        backend_report.read_text()
        + "\nThe value-safe evidence/configuration.json probe confirms this Codex "
        "database credential targets the original project but uses a privileged "
        "database role. It must not be used as the deployed application role. "
        "Actual Railway credentials are not inspected. No password or full URL "
        "is included in the evidence.\n"
    )

    write(
        "RAILWAY_DEPLOYMENT_AUDIT.md",
        "Actual Railway deployment audit",
        f"Fresh read-only [CI run]({ci['run_url']}) observed `{ci['observed_at']}`. "
        f"Served SHA `{ci['deployed_commit']}` matches the newly merged default at observation. "
        "Agent did not deploy or change source/domain/service settings.\n\n"
        + table(
            ["Endpoint", "HTTP", "State"],
            [(h["endpoint"], h.get("http_status"), h.get("status")) for h in ci["health"]],
        )
        + "\n\n78/78 desktop/mobile anonymous route responses "
        "succeeded;0/31 qualified business journeys. Route existence "
        "does not verify functionality or native parity. No favicon "
        "link or logo image was found by the home-page DOM probe. "
        "Exact artwork is still only inline; source files were not "
        "available in attachments. PR28 is open and not part of the "
        "observed deployment.\n\n"
        "Readiness checks NEXT_PUBLIC_SUPABASE_ANON_KEY and "
        "returns503 not_configured. A tested candidate guard now "
        "makes the production Docker build refuse missing public "
        "configuration. Local/offline builds remain allowed, and "
        "server-role keys remain forbidden. This only prevents "
        "another invalid candidate; runtime settings/logs and actual "
        "build mechanism are not inspected without RAILWAY_TOKEN.\n\n"
        "The Codex managed proxy blocks Railway tunnels and GitHub "
        "artifact/log CDN download hosts. External CI is authorized "
        "and succeeded; screenshots, trace and full report are "
        "retained in its artifact (metadata/hash in "
        "evidence/railway-ci-artifacts.json). The receipt was "
        "inspected through GitHub annotations; the full artifact was "
        "not downloaded or visually reviewed here. Runtime/build "
        "logs, restart stability and rollback remain blocked by "
        "credentials/access. No new services or domains were created.",
    )

    write(
        "MISSING_FEATURE_IMPLEMENTATION_PLAN.md",
        "Dependency-ordered implementation plan",
        "No speculative features or silent launch deferrals. Only "
        "the production-build guard was repaired in this batch; the "
        "broader implementation remains incomplete. Credentials "
        "alone will not implement the28 missing operations or19 "
        "placeholders.\n\n"
        "1. **P0 release/security:** review this candidate; provide "
        "project-scoped Railway access; set the original public "
        "Supabase key at web build/runtime through the approved "
        "workflow; verify readiness/CORS/callbacks; keep live Stripe "
        "blocked; replace administrative app DB credentials; approve "
        "lawful retention/guardian boundaries and verify rollback.\n"
        "2. **P1 identity and media:** configure actual SMS/OAuth "
        "providers; complete web/native profile/routine/security "
        "parity and account deletion; design/version and locally "
        "test owner-scoped private image/report storage/retention "
        "before separately approved production migration/bucket "
        "setup.\n"
        "3. **P1 core AI:** connect real authenticated "
        "analysis/provider jobs and credits, grounded "
        "results/corrections/Style Passport history, then try-on and "
        "measured image/model quality. Keys/models/rights/consent "
        "and genuine provider tests are required.\n"
        "4. **P1 commerce:** connect canonical catalog transport and "
        "verified inventory; implement real cart/order/stock "
        "reservation/fulfillment services and server quotes; run the "
        "real Stripe test acceptance/reconciliation matrix; connect "
        "essential admin/support/return flows.\n"
        "5. **P2 approved specialist modules:** atomic "
        "professional/tailor bookings, wardrobe/search, Creator0014 "
        "official OAuth/media, shoppable attribution, "
        "campaigns/advertising, subscriptions and notifications, in "
        "separate reviewable batches with schemas/RLS/tests. "
        "Optional status does not grant permission to defer "
        "advertised functionality.\n"
        "6. **Qualification:** real authenticated deployed role "
        "journeys, physical iOS/Android "
        "builds/camera/biometrics/accessibility, load/performance, "
        "legal/pilot acceptance and all12 gates before final "
        "public-launch approval.\n\n"
        + table(
            ["ID", "Unimplemented operation", "Status", "Specific next dependency"],
            [
                (
                    r["feature_id"],
                    r["approved_requirement"],
                    r["implementation_status"],
                    r["remaining_blockers"],
                )
                for r in rows
                if r["implementation_status"] in {"MISSING", "PLACEHOLDER", "BROKEN"}
            ],
        ),
    )

    write(
        "DEFECT_AND_REGRESSION_REGISTER.md",
        "Feature defects and regression evidence",
        "Each F-GB ID maps one-to-one to the CSV; none of these "
        "incomplete operational features is closed. Existing launch "
        "defect IDs and release locks are preserved. Feature "
        "numbering is stable in requirements.json rather than "
        "inferred from route counts.\n\n"
        + table(
            ["Defect", "Feature", "Status", "Remaining failure/blocker"],
            [
                (
                    r["defect_id"],
                    r["approved_requirement"],
                    r["implementation_status"],
                    r["remaining_blockers"],
                )
                for r in rows
            ],
        )
        + "\n\nP0-build-configuration candidate: before test failed "
        "because production guard accepted no key; after test passed "
        "with absent/offline/valid public/privileged-secret cases. "
        "Docker stage now invokes the required-key flag. It remains "
        "a deployed defect until readiness200 is demonstrated.\n\n"
        "Current evidence/validation.json distinguishes passed "
        "checks from blocked provider/payment/device tests. The "
        "first local database attempts failed because the container "
        "was stopped/starting after environment recovery; the final "
        "readiness-checked run passed260. These environment failures "
        "are not168 demonstrated product defects. No failed provider "
        "test was hidden behind a double.",
    )

    write(
        "PUBLIC_LAUNCH_GO_NO_GO.md",
        "Product completeness release decision",
        "**NO-GO.**0/140 fully verified atomic features under the "
        "requested six-layer standard;0/31 completed deployed "
        "critical journeys. The product contains substantial partial "
        "code and validated foundations, but28 features are missing "
        "and19 are placeholders.2 known deployed/configuration "
        "defects remain.\n\n"
        "The version2 twelve-gate release validator remains "
        "unchanged. A green CI evidence-collection job is not "
        "release approval. The locally fixed production-build guard "
        "does not make the existing Railway readiness503, failed "
        "new-domain CORS, disabled Auth, absent image "
        "storage/provider dispatch, unconnected commerce or "
        "live-mode Stripe acceptable.\n\n"
        "Required external inputs: RAILWAY_TOKEN in this Codex "
        "secure environment and appropriate network access; actual "
        "activated SMS/OAuth/AI/location/notification credentials; "
        "separate Stripe test key/webhook/eligible accounts; "
        "registered EAS/store IDs and signing credentials; "
        "downloadable original logo/favicon/app-icon files. Names "
        "only, never values in chat/Git. Required implementation "
        "work remains separately listed in the matrix and dependency "
        "plan; these inputs alone do not close it.\n\n"
        "Required approvals: production schema/bucket/config release "
        "when the concrete candidate is tested, lawful "
        "data/retention/minor policies, optional-feature deferral if "
        "desired, payment readiness separately, and explicit final "
        "public launch only after all gates, qualified journeys and "
        "real-device evidence pass. No production deployment, live "
        "payment activation or destructive data change was performed "
        "in this audit.",
    )
    print(json.dumps({"reports": 11, "matrix_rows": len(rows), "decision": "NO-GO"}))


if __name__ == "__main__":
    main()
