"""Generate launch reports from captured evidence, without converting blocked work into passes."""

import hashlib
import html
import json
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path.cwd()
DOC = ROOT / "docs/launch"
E = DOC / "evidence"
ART = Path("/workspace/artifacts/glam-launch")


def read(name):
    return json.loads((E / name).read_text())


def table(headers, rows):
    def cell(v):
        return str(v).replace("|", "\\|").replace("\n", " ")

    return (
        "| "
        + " | ".join(headers)
        + " |\n|"
        + "---|" * len(headers)
        + "\n"
        + "\n".join("| " + " | ".join(cell(v) for v in row) + " |" for row in rows)
        + "\n"
    )


def document(name, title, body):
    (DOC / name).write_text(
        "# " + title + "\n\n7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. "
        "**Public launch: NO-GO.**\n\n" + body + "\n"
    )


def main():
    source, crawl, actions = (
        read(n) for n in ["source-inventory.json", "clickthrough.json", "interactions.json"]
    )
    remote, git, regression = (
        read(n) for n in ["remote-readiness.json", "git-inventory.json", "regression-checks.json"]
    )
    workspace, postgres = read("workspace-layouts.json"), read("postgresql-regression.json")
    core, session = read("live-core-regression.json"), read("live-session-regression.json")
    workflows = json.loads(Path("tests/launch/acceptance.json").read_text())
    counts = Counter(w["status"] for w in workflows)
    repaired = [
        (
            "D001",
            "P2",
            "Login SSR hydration failed across browser sizes",
            "FIXED",
            "Host ICU produced different country labels. Versioned labels and "
            "deterministic sorting; login-hydration regression.",
        ),
        (
            "D002",
            "P2",
            "Low-contrast captions on Shop/Product/Report/Color",
            "FIXED",
            "Use existing mauve token for affected text; strict axe regression.",
        ),
        (
            "D003",
            "P2",
            "Conversation label on generic div",
            "FIXED",
            "Named role=log with polite live announcements; strict axe regression.",
        ),
        (
            "D004",
            "P2",
            "Business/admin skip links did not focus main",
            "FIXED",
            "Focusable main target; keyboard and focused interaction regressions.",
        ),
    ]
    blockers = [
        (
            "D101",
            "P1",
            "SMS and optional OAuth unavailable",
            "OPEN",
            "Configure approved providers and test actual signup/linking/delivery/abuse controls.",
        ),
        (
            "D102",
            "P1",
            "Real mobile biometrics unverified",
            "OPEN",
            "Signed app identifiers/builds and physical iOS/Android testing required.",
        ),
        (
            "D103",
            "P1",
            "Hosted AI operation unimplemented",
            "OPEN",
            "Authenticated analysis returned 501; model/media/history/matching "
            "integrations need implementation and qualification.",
        ),
        (
            "D104",
            "P1",
            "Private image/wardrobe persistence unavailable",
            "OPEN",
            "No Storage buckets; complete consent, retention, "
            "upload/access/deletion workflows before activation.",
        ),
        (
            "D105",
            "P1",
            "Verified marketplace and merchant execution unavailable",
            "OPEN",
            "Complete catalog publication, inventory, location matching and "
            "merchant qualification; layouts alone do not fulfill this.",
        ),
        (
            "D106",
            "P1",
            "Stripe configured in live mode",
            "OPEN",
            "Test secret/webhook, two eligible merchants and real "
            "reconciliation evidence required; no live mutation attempted.",
        ),
        (
            "D107",
            "P1",
            "Checkout/order/fulfillment workflows incomplete",
            "OPEN",
            "Connect authoritative pricing, order persistence and inventory/financial lifecycle.",
        ),
        (
            "D108",
            "P1",
            "Bookings workflow incomplete",
            "OPEN",
            "Implement/verify atomic availability, booking, changes and "
            "notifications; no booking rate invented.",
        ),
        (
            "D109",
            "P1",
            "Creator, ads and admin execution incomplete",
            "OPEN",
            "Qualified role-specific persistent operations and authorization tests required.",
        ),
        (
            "D110",
            "P1",
            "Notification delivery not configured",
            "OPEN",
            "Preferences save; actual SMS/email/push and order/booking delivery unverified.",
        ),
        (
            "D111",
            "P1",
            "Public hosting/monitoring/recovery unverified",
            "OPEN",
            "Website excluded by applied network policy, cPanel access absent, "
            "no restore/rollback drill or pilot UAT.",
        ),
        (
            "D112",
            "P1",
            "Legal and complete recovery/deletion gates incomplete",
            "OPEN",
            "Terms publication, legal/retention approval and lost-all-methods "
            "recovery/deletion workflow required.",
        ),
        (
            "D113",
            "P1",
            "Reviewed main consolidation incomplete",
            "OPEN",
            "Open feature PRs lack current-head approvals; no clean merged-main release candidate.",
        ),
    ]
    defects = [
        dict(zip(["id", "severity", "title", "status", "resolution"], row, strict=True))
        for row in repaired + blockers
    ]
    gates = [
        (
            "G1",
            "Repository/build integrity",
            "BLOCKED",
            "Local build/tests pass; reviewed consolidation and clean merged-main build pending.",
        ),
        (
            "G2",
            "Authentication/account security",
            "BLOCKED",
            "Real session core passes; SMS/OAuth/recovery and hardware gates incomplete.",
        ),
        (
            "G3",
            "Consumer AI functionality",
            "FAILED",
            "Analysis endpoint returned 501; actual inference/try-on/history not demonstrated.",
        ),
        (
            "G4",
            "Marketplace/merchant operations",
            "BLOCKED",
            "Verified live catalog, publication/inventory and merchant workflows missing.",
        ),
        (
            "G5",
            "Payments/financial correctness",
            "BLOCKED",
            "Live-mode configuration, missing test webhook and zero actual "
            "payment/transfer/reconciliation proof.",
        ),
        (
            "G6",
            "Bookings/professional operations",
            "BLOCKED",
            "Atomic hosted booking workflow unverified/unimplemented.",
        ),
        (
            "G7",
            "Privacy/security/access control",
            "BLOCKED",
            "Executed RLS/negative tests pass; private media, full role matrix "
            "and legal/deletion gates incomplete.",
        ),
        (
            "G8",
            "Responsive UX/accessibility",
            "BLOCKED",
            "Automated browser checks pass after repairs; manual screen "
            "readers and real devices pending.",
        ),
        (
            "G9",
            "Reliability/monitoring/recovery",
            "BLOCKED",
            "Completed backup exists; monitoring, restoration/rollback "
            "rehearsal and public smoke missing.",
        ),
        ("G10", "Pilot user acceptance", "BLOCKED", "Not executed."),
        (
            "G11",
            "Explicit final public launch approval",
            "BLOCKED",
            "Not requested or granted; prerequisites unmet.",
        ),
    ]
    gate_rows = [dict(zip(["id", "name", "status", "reason"], row, strict=True)) for row in gates]
    hashes = {}
    files = (
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"]
        )
        .decode()
        .split("\0")
    )
    for name in files:
        p = Path(name)
        if p.is_file() and (
            name.startswith(
                ("apps/", "packages/", "supabase/functions/", "db/migrations/versions/")
            )
            or name in {"package.json", "package-lock.json"}
        ):
            hashes[name] = hashlib.sha256(p.read_bytes()).hexdigest()
    summary = {
        "observed_at": datetime.now(UTC).isoformat(),
        "decision": "NO-GO",
        "candidate_base_commit": source["source_commit"],
        "candidate_branch": git["candidate_branch"],
        "input_hashes": hashes,
        "routes_discovered": len(source["routes"]),
        "source_control_declarations": len(source["source_controls"]),
        "python_endpoints": len(source["endpoints"]),
        "route_audit": crawl["counts"],
        "interaction_results": actions["counts"],
        "workspace_layout_visits": len(workspace["modules"]),
        "workflows": workflows,
        "workflow_counts": dict(counts),
        "gates": gate_rows,
        "defects": defects,
        "defects_fixed": len(repaired),
        "open_p0_p1": sum(d["status"] == "OPEN" and d["severity"] in {"P0", "P1"} for d in defects),
        "postgresql": postgres,
        "real_core_checks": len(core["checks"]),
        "real_session_checks": len(session["checks"]),
        "database": remote["catalog"][0],
        "stripe": remote["stripe"],
        "test_webhook_configured": remote["environment_presence"]["STRIPE_WEBHOOK_SECRET"],
        "actual_financial_acceptance": False,
        "final_launch_approved": False,
        "external_integrations_verified": ["Supabase hosted account/session core"],
        "native_hardware_verified": False,
        "public_frontend_deployed": False,
    }
    (E / "launch-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    (E / "workflow-results.json").write_text(json.dumps(workflows, indent=2) + "\n")
    document(
        "ROUTE_AND_BUTTON_INVENTORY.md",
        "Route and interaction inventory",
        f"Discovered **{len(source['routes'])} web routes**, "
        f"{len(source['source_controls'])} source control declarations "
        f"across web/mobile, and {len(source['endpoints'])} registered Python endpoints. "
        f"The browser recorded {crawl['counts']['rendered_control_occurrences']} "
        "control occurrences in "
        f"{crawl['counts']['route_viewport_visits']} visits. "
        "Occurrences repeat shared navigation and are not unique features.\n\n"
        + table(
            ["Route", "Desktop + iPhone web"],
            [(p, "Inventoried; see JSON for each control") for p in source["routes"]],
        )
        + "\nBusiness/admin traversal covered 99 role/module layout visits, "
        "including all five available business layouts and admin review "
        "roles. "
        "Salon/tailor and other requested business capabilities are not "
        "independently operational roles merely because labels exist.\n\n"
        "Complete per-control fields, disabled states, dimensions, names, "
        "inputs/options and action dispositions: "
        "[source](evidence/source-inventory.json), [runtime](evidence/clickthrough.json), "
        "[actions](evidence/interactions.json), [workspace "
        "controls](evidence/workspace-layouts.json). "
        "Controls appearing only after authentication/real data remain "
        "outside anonymous enumeration; named tests supplement this "
        "inventory.",
    )
    document(
        "CLICKTHROUGH_TEST_REPORT.md",
        "Click-through results",
        table(["Metric", "Observed"], list(crawl["counts"].items()))
        + "\n"
        + table(["Action disposition", "Occurrences"], list(actions["counts"].items()))
        + "\nA passed generic action means an observable local "
        "state/navigation response or verified idempotent selection. "
        "It does not prove AI output, persistence, stock, checkout or "
        "booking. Disabled and skipped controls are not passes. "
        "The finite allowlist blocks all external/mutating network "
        "requests and starts fresh pages for each action. "
        "Inputs, irreversible controls and inaccessible authenticated "
        "states are not blindly clicked.\n\n"
        "The initial harness incorrectly pointer-clicked keyboard-only "
        "skip links and omitted textarea values from state comparisons. "
        "Its initial results are preserved; corrected keyboard/form-state "
        "rechecks are separate. A real focus failure on business/admin was "
        "repaired. "
        "Already-current links without a new observable response are "
        "documented separately rather than counted as extra successes.\n\n"
        "Screenshots, per-viewport traces, recordings and the local "
        "dashboard are in `/workspace/artifacts/glam-launch`. "
        "[Evidence](evidence/interactions.json); [initial "
        "pass](evidence/interactions-initial.json); "
        "[recheck](evidence/interactions-recheck.json).",
    )

    def domain_report(filename, title, domains, extra):
        relevant = [w for w in workflows if w["domain"] in domains]
        document(
            filename,
            title,
            table(
                ["ID", "Journey", "Status", "Scope / blocker"],
                [
                    (w["id"], w["name"], w["status"], w.get("reason", w.get("scope", "")))
                    for w in relevant
                ],
            )
            + "\n"
            + extra
            + "\n\n[Complete machine-readable results](evidence/workflow-results.json).",
        )

    domain_report(
        "CONSUMER_E2E_REPORT.md",
        "Consumer end-to-end acceptance",
        {"Consumer", "Account", "AI", "Orders"},
        "The required upload → real analysis → try-on → genuine products → "
        "checkout → order journey has **zero completed real end-to-end "
        "demonstrations**. "
        "An authenticated analysis operation returned 501. No photo was "
        "uploaded or analyzed during the controlled remote tests. "
        "Existing UI tests exercise local consent, file rejection, briefs, "
        "independent look choices, routines and honest unavailable states. "
        ""
        "These do not replace a provider-backed consumer journey.",
    )
    domain_report(
        "AI_FUNCTIONALITY_REPORT.md",
        "AI functionality",
        {"AI"},
        "OpenAI, Replicate and FASHN credentials are absent. Hosted "
        "inference/media/job/history flows are incomplete; credentials "
        "alone will not finish them. "
        "Editorial portraits and reference products remain references. No "
        "personal result, weather forecast, analysis confidence, "
        "product-match accuracy, "
        "medical-safety benchmark or generated-image quality claim is "
        "made. Universal Look Search and Visual Product Search also lack "
        "real qualified execution evidence.",
    )
    domain_report(
        "AUTHENTICATION_REPORT.md",
        "Authentication",
        {"Authentication", "Account", "Mobile", "Workspaces"},
        f"Real controlled session checks: {len(session['checks'])}; "
        f"real core checks: {len(core['checks'])}. "
        "Revoked JWT RPC/direct Data API denial, cross-user isolation, "
        "idempotent profiles and preference updates passed. "
        "SMS/social transport tests use doubles and remain BLOCKED for "
        "actual login; native storage/gate doubles and JS exports are not "
        "hardware proof. "
        "[Detailed prior auth "
        "matrix](../authentication/PASSWORDLESS_AUTH_REPORT.md). Cleanup "
        "retains only internal references, zero-balance bootstrap accounts "
        "and audit evidence; "
        "[independent cleanup verification](evidence/controlled-cleanup.json).",
    )
    domain_report(
        "MERCHANT_MARKETPLACE_REPORT.md",
        "Merchant and marketplace",
        {"Marketplace", "Merchant", "Creator", "Advertising", "Administration", "Workspaces"},
        "99 public review-layout module visits passed without JavaScript "
        "exceptions. This did not create a real merchant, grant a verified "
        "capability, publish merchandise, "
        "launch advertising, generate attribution or activate admin "
        "privileges. Existing server tenant isolation passed; complete "
        "inventory/order/finance cross-merchant operations remain "
        "unverified.",
    )
    domain_report(
        "STRIPE_FINANCIAL_REPORT.md",
        "Stripe and financial correctness",
        {"Payments", "Orders"},
        "The read-only Stripe balance call returned livemode=true. "
        "No charge, transfer, refund, payout or onboarding mutation was attempted. "
        f"{postgres['financial_tests']} isolated PostgreSQL financial tests passed "
        "using synthetic provider objects/fees. "
        "Actual PaymentIntent IDs: **none**. Actual transfer IDs: "
        "**none**. Actual Stripe fees: **unverified**. Real "
        "reconciliation: **not executed**. "
        "The existing balance is not commission evidence. The server's "
        "approved 10% eligible physical-item policy, rounding and "
        "shipping/tax/fee separation were not changed. "
        "Live webhook delivery, success/failure, partial fulfillment, "
        "refunds, disputes, duplicate/out-of-order events, allocations, "
        "statements and provider reconciliation remain BLOCKED. "
        "No professional booking commission is assumed. [Fixture-only "
        "financial results](evidence/financial-fixture-report.json).",
    )
    domain_report(
        "BOOKING_REPORT.md",
        "Professional bookings",
        {"Bookings"},
        "Public professional layouts do not prove service availability, "
        "atomic double-booking prevention, confirmed appointments, "
        "rescheduling, cancellations, deposits or notifications. "
        "There is no verified booking ID or real appointment acceptance evidence.",
    )
    document(
        "SUPABASE_VERIFICATION.md",
        "Supabase verification",
        "Only `bkkmsbxrxkqaveymcrgi`, production main, was inspected. "
        "Project ACTIVE_HEALTHY, exact database host verified; no preview "
        "branch was recreated. "
        "Migration head `0013_passwordless_accounts`: 41 public tables, "
        "all RLS enabled, 77 indexes, 54 validated foreign keys, zero "
        "unvalidated foreign keys, 21 policies. "
        "No DDL or migration was applied in this audit.\n\n"
        + table(
            ["Real evidence", "Result"],
            [
                ("Account/routine/tenant checks", len(core["checks"])),
                ("Session/revocation checks", len(session["checks"])),
                ("Storage bucket count", remote["storage"].get("bucket_count", "unknown")),
                ("Public storage buckets", remote["storage"].get("public_bucket_count", "unknown")),
            ],
        )
        + "\nZero buckets is not proof that an image-storage workflow is "
        "secure; upload/access/retention/deletion remains unverified. "
        "A completed physical backup is visible; restore/PITR/rollback "
        "rehearsal is not claimed. The profile lookup plan uses the "
        "primary-key index. "
        "Single metadata round-trip timings are not load/performance "
        "certification.\n\n[Remote "
        "evidence](evidence/remote-readiness.json), "
        "[core](evidence/live-core-regression.json), "
        "[sessions](evidence/live-session-regression.json), "
        "[cleanup](evidence/controlled-cleanup.json).",
    )
    domain_report(
        "SECURITY_PRIVACY_REPORT.md",
        "Security and privacy",
        {"Security", "Account"},
        "Executed local PostgreSQL RLS/authorization, webhook replay and "
        "amount-tampering regressions passed. A real local FastAPI process "
        "denied anonymous protected requests across "
        "the 46 registered endpoints while public health/policy endpoints "
        "behaved as expected. No auth bypass was introduced. "
        "Current-source/prepared-bundle configured-secret-value scan "
        "passed; this is not a full Git-history scan or evidence of secret "
        "rotation. "
        "Dependency advisory audit reported zero production "
        "vulnerabilities. Real OTP abuse, full staff/merchant capability "
        "matrix, private uploads, minors/fairness review, "
        "legal approval and account lifecycle remain incomplete. [Endpoint "
        "checks](evidence/local-api.json), [secret "
        "scan](evidence/secret-scan.json).",
    )
    domain_report(
        "MOBILE_RESPONSIVE_REPORT.md",
        "Mobile, responsive and accessibility",
        {"Mobile", "UX"},
        "All routes were inspected at desktop 1440×1000 and iPhone-web "
        "390×844. Thirteen key routes were additionally checked at "
        "Android-web 412×915, tablet 768×1024 and landscape 844×390. "
        "Browser tests cover overflow, images, accessible labels/roles, "
        "automated WCAG rules, fixed-navigation clearance, "
        "keyboard/history, dialog focus, offline notices and file "
        "validation. "
        "Small-target inventory is a heuristic; inline-link exceptions and "
        "manual screen-reader evaluation require review. "
        "Automated axe success does not establish complete WCAG "
        "conformance. No physical device, native keyboard, Face ID/Touch "
        "ID, TalkBack or VoiceOver certification. "
        "Local LCP/CLS/FCP observations are in [performance "
        "evidence](evidence/local-performance.json); no production field "
        "CWV/INP or load claim.",
    )
    document(
        "DEFECT_REGISTER.md",
        "Defects and release blockers",
        table(
            ["ID", "Severity", "Finding", "Status", "Repair / next evidence"], repaired + blockers
        )
        + "\nFour implemented-product defects were repaired. Release blockers "
        "include missing implementations as well as missing external "
        "configuration. "
        "No P0 was found in executed checks; unexecuted areas are not certified defect-free. "
        "All blockers remain visible and prevent public certification; "
        "skipped tests are not waived. See raw initial/intermediate/final "
        "evidence for the repair sequence.",
    )
    document(
        "REGRESSION_TEST_RESULTS.md",
        "Regression results",
        f"PostgreSQL: **{postgres['tests']} tests**, {postgres['failures']} failures, "
        f"{postgres['errors']} errors, {postgres['skipped']} skipped. "
        f"This includes {postgres['financial_tests']} fixture-backed financial tests.\n\n"
        + table(
            ["Check", "Status", "Scope"],
            [(c["name"], c["status"], c["scope"]) for c in regression["checks"]],
        )
        + "\nAdditional targeted tests: real SSR hydration, axe "
        "contrast/ARIA, keyboard skip links, real hosted core/session "
        "checks and local API negative requests. "
        "Before/intermediate/final evidence is retained. The requested "
        "all-critical-tests target has not been reached: "
        + table(["Required journey status", "Count"], list(counts.items()))
        + "\nNo real consumer purchase or provider-backed AI journey "
        "completed. [Raw checks](evidence/regression-checks.json).",
    )
    document(
        "PUBLIC_LAUNCH_GO_NO_GO.md",
        "Public launch decision: NO-GO",
        f"**Stage A technical release candidate: NOT CERTIFIED. Stage B public launch: BLOCKED.** "
        f"There are {summary['open_p0_p1']} open P1 release blockers "
        "and incomplete critical journeys.\n\n"
        + table(["Gate", "Requirement", "Status", "Reason"], gates)
        + f"\nGitHub default branch is `{git['default_branch']}`, "
        f"observed main SHA `{git['main_sha']}`. "
        "48 local/remote refs were inventoried; 11 open PRs had zero "
        "current-head approvals at that observation. "
        "The candidate includes pending feature work; a production "
        "database deployment is not a reviewed Git merge. "
        "No release tag, staging/public deployment, pilot UAT, payment "
        "activation or final launch approval was issued. "
        "The former automatic-review credit failure was retried "
        "successfully for read-only cleanup; it is not the remaining "
        "launch blocker.\n\n"
        "Execution guard: `node scripts/launch/release-gates.cjs` must "
        "exit nonzero while any mandatory requirement is unmet. "
        "Once implementations/configuration are complete, repeat the "
        "actual provider/hardware/financial journeys, reviewed main build, "
        "protected staging smoke, "
        "restore/rollback drill and pilot UAT, then request final public-launch approval.\n\n"
        "[Dashboard summary](evidence/launch-summary.json), [workflow "
        "matrix](evidence/workflow-results.json), [branch "
        "inventory](evidence/git-inventory.json).",
    )
    metrics = [
        ("Routes", len(source["routes"])),
        ("Route/viewport visits", crawl["counts"]["route_viewport_visits"]),
        ("Controls observed", crawl["counts"]["rendered_control_occurrences"]),
        (
            "Safe UI attempts",
            sum(v for k, v in actions["counts"].items() if k not in {"SKIPPED", "BLOCKED"}),
        ),
        ("Workflows passed", counts["PASSED"]),
        ("Workflows failed", counts["FAILED"]),
        ("Workflows blocked", counts["BLOCKED"]),
        ("Disabled UI controls", actions["counts"].get("BLOCKED", 0)),
        ("Skipped UI controls", actions["counts"].get("SKIPPED", 0)),
        ("Verified service cores", 1),
        ("Product defects fixed", len(repaired)),
        ("Open P1 blockers", summary["open_p0_p1"]),
    ]
    rows = "".join(
        "<tr><td>"
        + "</td><td>".join(
            html.escape(str(w.get(k, ""))) for k in ["id", "domain", "name", "status"]
        )
        + "</td></tr>"
        for w in workflows
    )
    cards = "".join(
        f"<article><strong>{v}</strong><span>{html.escape(n)}</span></article>" for n, v in metrics
    )
    screenshots = "".join(
        f'<figure><a href="final/{name}.png"><img src="final/{name}.png" '
        f'alt="{label} browser audit screenshot" loading="lazy">'
        f"<figcaption>{label}</figcaption></a></figure>"
        for name, label in [
            ("desktop-home", "Home"),
            ("iphone-web-analyze", "Face Analysis"),
            ("iphone-web-results", "Results"),
            ("iphone-web-studio", "AI Studio"),
            ("iphone-web-shop", "Shop"),
            ("iphone-web-product", "Product"),
        ]
    )
    dashboard = (
        Path(__file__)
        .with_name("dashboard.html")
        .read_text()
        .replace("{{ CARDS }}", cards)
        .replace("{{ ROWS }}", rows)
        .replace("{{ SCREENSHOTS }}", screenshots)
    )
    if "{{" in dashboard:
        raise RuntimeError("unrendered_dashboard_template")
    (ART / "index.html").write_text(dashboard)
    (DOC / "README.md").write_text(
        "# GLAM Beauty launch audit\n\nStart with [NO-GO "
        "decision](PUBLIC_LAUNCH_GO_NO_GO.md), "
        "[defects](DEFECT_REGISTER.md) and [click-through "
        "results](CLICKTHROUGH_TEST_REPORT.md). "
        "The local interactive dashboard is `/workspace/artifacts/glam-launch/index.html`.\n\n"
        "Reproduce: locked installs; `npm run build:web`; `npm run audit:launch:discover`; "
        "`npm run audit:launch:routes`; `npm run audit:launch:actions`; "
        "`npm run audit:launch:workspaces`. "
        "Use `GLAM_AUDIT_AXE=1`, optional recording with a supported "
        "Playwright FFmpeg runtime, and `GLAM_AUDIT_STRICT=1`. "
        "Run `npm run test:login-hydration`, `npm run "
        "test:launch-accessibility`, `npm run test:launch-keyboard`. "
        "Remote scripts require secure authorized credentials and must "
        "never target another project. "
        "`scripts/launch/report.py` assembles measured evidence; the "
        "release guard intentionally fails for this candidate.\n"
    )
    print(
        json.dumps(
            {
                "decision": "NO-GO",
                "workflows": dict(counts),
                "fixed": len(repaired),
                "open_p1": summary["open_p0_p1"],
            }
        )
    )


if __name__ == "__main__":
    main()
