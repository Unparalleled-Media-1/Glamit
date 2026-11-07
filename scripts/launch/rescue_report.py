"Railway-first audit report. Blocked deployed tests are never promoted from local evidence."

import csv
import hashlib
import json
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from report import table

DOC = Path("docs/launch")
E = DOC / "evidence/railway-rescue"
ART = Path("/workspace/artifacts/glam-railway-rescue")


def read(name):
    return json.loads((E / name).read_text())


def write(name, title, body):
    now = datetime.now(ZoneInfo("Africa/Johannesburg")).strftime("%d %B %Y %H:%M SAST")
    (DOC / name).write_text(
        f"# {title}\n\n{now}. **NO-GO — no public launch or service mutation.** "
        "Machine evidence uses UTC timestamps.\n\n" + body + "\n"
    )


def main():
    source, crawl, actions, roles, remote, git, deployed, configuration = (
        read(n)
        for n in [
            "source-inventory.json",
            "clickthrough.json",
            "interactions.json",
            "workspace-layouts.json",
            "remote-readiness.json",
            "git-inventory.json",
            "deployed-clickthrough.json",
            "configuration.json",
        ]
    )
    checks = read("default-branch-checks.json")
    regression = (ART / "pytest.log").read_text()
    matched = re.search(r"(\d+) passed", regression)
    passed = int(matched.group(1)) if matched else None
    defects = json.loads((DOC / "evidence/launch-summary.json").read_text())["defects"]
    # Regeneration is idempotent: keep original IDs and replace only the current audit finding.
    defects = [d for d in defects if d["id"] != "D201"]
    for d in defects:
        if d["id"] == "D113":
            d.update(
                status="FIXED",
                resolution=(
                    "Approved feature PRs21–26 merged into actual default; main absent. "
                    "Clean default CI passes. Dependency PRs remain separately reviewed."
                ),
            )
        if d["id"] == "D111":
            d["resolution"] = (
                "Railway token was configured in service settings, not this Codex "
                "environment. Agent token absent; proxy blocks deployed navigation. "
                "Actual Railway runtime/source/logs/rollback remain unverified."
            )
    defects.append(
        {
            "id": "D201",
            "severity": "P1",
            "title": "Release lock omitted G12 and deployed Railway evidence",
            "status": "FIXED",
            "resolution": (
                "Four new structural fixtures failed before repair; eight "
                "release-lock tests pass after repair. No synthetic receipt or "
                "provider fixture counts as live evidence."
            ),
        }
    )
    previous = json.loads(Path("tests/launch/acceptance.json").read_text())
    workflows = [
        {
            **w,
            "prior_or_local_status": w["status"],
            "status": "BLOCKED",
            "reason": (
                "Required deployed release-candidate journey not executed; Railway "
                "access unavailable. Prior/local evidence remains separately scoped."
            ),
        }
        for w in previous
    ]
    gates = [
        (
            "G1",
            "Railway deployment and service health",
            "BLOCKED",
            "No actual logs, deployed SHA, healthy readiness, recovery or live route proof.",
        ),
        (
            "G2",
            "Build and dependency integrity",
            "PASSED",
            (
                "Exact inspected default has successful backend/web/mobile/hosted-api"
                " CI; local regression/build proof remains distinct from deployment."
            ),
        ),
        (
            "G3",
            "Authentication and sessions",
            "BLOCKED",
            (
                "SMS and Google/Apple/Facebook disabled; real login, linking, "
                "recovery and native hardware not verified."
            ),
        ),
        (
            "G4",
            "Consumer AI workflows",
            "BLOCKED",
            "Provider credentials and operational inference/try-on/history evidence missing.",
        ),
        (
            "G5",
            "Marketplace and merchant workflows",
            "BLOCKED",
            ("Verified catalog, inventory, order and merchant execution incomplete or unverified."),
        ),
        (
            "G6",
            "Stripe financial correctness",
            "BLOCKED",
            (
                "Observed live mode; no actual test PaymentIntent/transfer/fee "
                "reconciliation evidence."
            ),
        ),
        (
            "G7",
            "Professional bookings",
            "BLOCKED",
            "Atomic availability/booking/cancellation and notifications not demonstrated.",
        ),
        (
            "G8",
            "Creator, social and advertising functions",
            "BLOCKED",
            (
                "Manual drafts tested locally; provider OAuth/import, shoppable "
                "attribution/campaigns/earnings not operational."
            ),
        ),
        (
            "G9",
            "Supabase security and RLS",
            "BLOCKED",
            (
                "41 public tables all RLS; full business/private media matrix and "
                "restricted application role still need verification."
            ),
        ),
        (
            "G10",
            "Responsive design and accessibility",
            "BLOCKED",
            (
                "117 local viewport visits pass automated checks; real devices/screen"
                " readers/deployed UI pending."
            ),
        ),
        (
            "G11",
            "Monitoring, backup and rollback",
            "BLOCKED",
            (
                "Backup metadata available; actual Railway "
                "monitoring/restart/restore/rollback drill not demonstrated."
            ),
        ),
        (
            "G12",
            "Pilot UAT and final release approval",
            "BLOCKED",
            "Pilot and explicit final approval not executed or granted.",
        ),
    ]
    required = {"backend", "web", "mobile", "hosted-api", "clients", "changes"}
    ci_passed = {
        c["name"]
        for c in checks
        if c["status"] == "completed"
        and c["conclusion"] == "success"
        and c["head_sha"] == git["main_sha"]
    }
    if not required <= ci_passed:
        gates[1] = (
            "G2",
            "Build and dependency integrity",
            "BLOCKED",
            "Exact default-branch required checks not all passed.",
        )
    hashes = {}
    for name in subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], text=True
    ).split("\0"):
        p = Path(name)
        if p.is_file() and (
            name.startswith(
                (
                    "apps/",
                    "packages/",
                    "services/api/",
                    "db/migrations/",
                    "supabase/functions/",
                    "scripts/launch/",
                    ".github/workflows/",
                )
            )
            or name
            in {"package.json", "package-lock.json", "pyproject.toml", "uv.lock", "alembic.ini"}
        ):
            hashes[name] = hashlib.sha256(p.read_bytes()).hexdigest()
    summary = {
        "release_evidence_version": 2,
        "observed_at": datetime.now(UTC).isoformat(),
        "decision": "NO-GO",
        "candidate_base_commit": source["source_commit"],
        "candidate_branch": git["candidate_branch"],
        "input_hashes": hashes,
        "workflows": workflows,
        "defects": defects,
        "gates": [dict(zip(["id", "name", "status", "reason"], g, strict=True)) for g in gates],
        "stripe": remote.get("stripe", {}),
        "test_webhook_configured": remote["environment_presence"].get(
            "STRIPE_WEBHOOK_SECRET", False
        ),
        "actual_financial_acceptance": False,
        "native_hardware_verified": False,
        "final_launch_approved": False,
        "route_audit": crawl["counts"],
        "interaction_results": actions["counts"],
        "workspace_layout_visits": len(roles["modules"]),
        "backend_tests_passed": passed,
        "railway": {
            "evidence_kind": "unverified",
            "url": deployed["origin"],
            "observed_at": deployed["observed_at"],
            "deployment_id": None,
            "deployed_commit": None,
            "live_status": None,
            "ready_status": None,
            "supabase_verified": False,
            "frontend_backend_verified": False,
            "oauth_cors_verified": False,
            "rollback_verified": False,
            "unhandled_runtime_errors": None,
            "clickthrough": {
                "scope": "deployed",
                "tested_commit": None,
                "critical_total": len(workflows),
                "critical_passed": 0,
                "failed": 0,
                "blocked": len(workflows),
                "skipped": 0,
            },
        },
    }
    for destination in [E / "launch-summary.json", DOC / "evidence/launch-summary.json"]:
        destination.write_text(json.dumps(summary, indent=2) + "\n")
    (E / "workflow-results.json").write_text(json.dumps(workflows, indent=2) + "\n")
    facts = (
        f"GitHub default **`{git['default_branch']}`**, SHA `{git['main_sha']}`. "
        "No `main` branch exists. PR21–26 are merged. "
        f"{len(git['branches'])} local/remote refs and "
        f"{sum(p['state'] == 'open' for p in git['pull_requests'])} open PRs inventoried. "
        "The reported Railway source matches the actual default; "
        "a branch-name mismatch is not established. No force push, branch deletion, "
        "repository disconnect or source switch occurred."
    )
    access = (
        "Railway project `elegant-dedication` "
        "(`3f490939-cffd-4468-8c25-d90146f1b308`), production environment "
        "`93eeefda-99b8-462b-9041-421f9f5903ca`, existing service "
        "`glamit-web` (`d2a011b7-929e-4302-809a-27ca7345621a`), reported URL "
        "`https://glamit-web-production.up.railway.app`. These service "
        "details were supplied by the user, not independently verified "
        "through Railway API. Actual deployed commit **unknown**."
    )
    blocked = (
        "The user confirmed the token was added to **Railway service "
        "settings**. That makes it available to the hosted application, not "
        "this Codex workspace. Neither token is loaded here; Railway hosts "
        "remain outside applied egress policy. A fresh Chrome attempt through"
        " the inherited proxy returned "
        "**`net::ERR_TUNNEL_CONNECTION_FAILED`**; all 39 deployed routes are "
        "BLOCKED, not passed or proven broken. No actual Railway "
        "build/runtime log or GitHub integration authorization evidence was "
        "obtained."
    )
    prerequisite = (
        "Required access: the existing project's environment-scoped "
        "`RAILWAY_TOKEN` in **this Codex environment's secure settings**, "
        "plus applied access for `backboard.railway.app`, "
        "`backboard.railway.com` and `glamit-web-production.up.railway.app`. "
        "Remove the unused unbound `RAILWAY_API_TOKEN` requirement; never "
        "configure both. The saved draft now includes the correct token entry"
        " but requires review/save/publication to load here. No token value "
        "belongs in chat or Git. Inspect deployment/source/build/runtime logs"
        " and Railway GitHub App permissions before changing settings; "
        "preserve the working service and previous release."
    )
    write(
        "RAILWAY_ROOT_CAUSE_REPORT.md",
        "Railway root-cause investigation",
        facts
        + "\n\n"
        + access
        + "\n\n"
        + blocked
        + (
            "\n\n**Root cause of the reported branch-loading/deployment failure "
            "remains UNDETERMINED.** GitHub branch availability is proven; the "
            "named source branch is valid. Missing agent access is the root cause"
            " of the blocked investigation, not proof of a Railway defect. A "
            "Python runtime is reported by the user but not inspected; do not "
            "assume it is erroneous without identifying what the service serves."
            "\n\n"
        )
        + prerequisite,
    )
    write(
        "RAILWAY_SERVICE_CONFIGURATION.md",
        "Existing service configuration and repair boundaries",
        access
        + "\n\n"
        + facts
        + (
            "\n\nActual root directory, builder, commands, runtime, source, Wait "
            "for CI, auto-deploy and restart settings remain **unverified**. The "
            "prior tested candidates under `deploy/railway` are not applied "
            "configuration or proof a second service is needed. `apps/web` is "
            "Next.js/React; `apps/mobile` is React Native/Expo; `services/api` is"
            " FastAPI. Existing clients use Supabase Edge/RPC and cannot be "
            "blindly switched to the incomplete FastAPI route set. Canonical "
            "migrations remain `db/migrations`, one original Supabase project "
            "only.\n\nInspect first. Create no additional service/project, recreate"
            " no Supabase dev branch, and do not switch domains or deploy "
            "publicly before verified impact and final approval. "
        )
        + prerequisite,
    )
    write(
        "DEPLOYMENT_VERIFICATION.md",
        "Deployed release verification",
        blocked
        + "\n\n"
        + table(
            ["Check", "Status"],
            [
                (
                    "Deployed SHA / branch",
                    "UNKNOWN; GitHub source SHA does not establish deployment",
                ),
                ("Build/startup/runtime logs", "BLOCKED — Railway access"),
                ("HTTP health / readiness / assets", "BLOCKED — proxy denied navigation"),
                ("Frontend→backend / hosted Supabase", "UNVERIFIED"),
                ("OAuth / live click-through / role journeys", "BLOCKED"),
                ("Restart / recovery / previous-release rollback", "NOT RUN"),
                ("Production mutations / domain changes / service creation", "NONE"),
            ],
        )
        + (
            "\n[Actual browser "
            "attempt](evidence/railway-rescue/deployed-clickthrough.json). Trace "
            "and screenshot: "
            "`/workspace/artifacts/glam-railway-rescue/deployed-access-trace.zip`,"
            " `deployed-access.png`. No local result is substituted for deployed "
            "proof."
        ),
    )
    indexed = {(r["route"], r["viewport"], r["control_id"]): r for r in actions["results"]}
    columns = [
        "route",
        "viewport",
        "control_id",
        "element_name",
        "tag",
        "expected_behavior",
        "actual_behavior",
        "backend_dependency",
        "test_status",
        "defect_id",
    ]
    with (E / "control-inventory.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        for screen in crawl["routes"]:
            for control in screen["controls"]:
                result = indexed.get((screen["route"], screen["viewport"], control["id"]))
                if control.get("href"):
                    expected = "Navigate/focus declared target " + control["href"]
                elif control.get("disabled"):
                    expected = "Remain unavailable; do not fabricate completion"
                else:
                    expected = (
                        "Exercise named control; business semantics require qualified journey"
                    )
                status = result["status"] if result else "NOT_EXERCISED"
                writer.writerow(
                    dict(
                        zip(
                            columns,
                            [
                                screen["route"],
                                screen["viewport"],
                                control["id"],
                                control["name"],
                                control["tag"],
                                expected,
                                result.get("reason", status)
                                if result
                                else "Rendered only in this viewport",
                                "Local UI check only; operational dependency unverified; "
                                "see workflow matrix",
                                status,
                                "" if status != "FAILED" else "TRIAGE_REQUIRED",
                            ],
                            strict=True,
                        )
                    )
                )
    write(
        "CLICKTHROUGH_INVENTORY.md",
        "Click-through inventory",
        table(
            ["Inventory", "Count / scope"],
            [
                ("Web routes", len(source["routes"])),
                ("Source controls", len(source["source_controls"])),
                ("Python endpoints", len(source["endpoints"])),
                (
                    "Local runtime control occurrences",
                    crawl["counts"]["rendered_control_occurrences"],
                ),
                ("Role/module layout visits", len(roles["modules"])),
            ],
        )
        + "\n"
        + table(
            ["Route", "Actual deployed status"],
            [(r, "BLOCKED — no network access") for r in source["routes"]],
        )
        + (
            "\nFull per-control source positions/names and runtime "
            "route/viewport/state fields: "
            "[source](evidence/railway-rescue/source-inventory.json), "
            "[runtime](evidence/railway-rescue/clickthrough.json), [action "
            "outcomes/reasons](evidence/railway-rescue/interactions.json), [role "
            "controls](evidence/railway-rescue/workspace-layouts.json). Repeated "
            "navigation controls are not unique features. Disabled, "
            "authenticated-only and unallowlisted actions are explicitly "
            "blocked/skipped."
        ),
    )
    inventory_doc = DOC / "CLICKTHROUGH_INVENTORY.md"
    inventory_doc.write_text(
        inventory_doc.read_text()
        + "\n[Per-control expected/actual/dependency/status/defect columns]"
        "(evidence/railway-rescue/control-inventory.csv). "
        "Unknown backend semantics are explicitly unverified; no business success is inferred.\n"
    )
    write(
        "CLICKTHROUGH_RESULTS.md",
        "Click-through results",
        table(["Local metric", "Observed"], crawl["counts"].items())
        + "\n"
        + table(["Local action disposition", "Occurrences"], actions["counts"].items())
        + (
            "\nLocal passes mean observed state/navigation responses or idempotent"
            " selection, not AI, storage, stock, orders, bookings or business "
            "success. All remote/mutating requests were blocked in local "
            "traversal. "
        )
        + str(len(roles["modules"]))
        + " public role/module layouts were visited with "
        + str(len(roles["errors"]))
        + (
            " recorded errors. Authenticated merchant/admin authority was not "
            "activated. Creator form tests use intercepted test transport; their "
            "screenshots are labeled simulations.\n\nActual Railway: **0 checked "
            "HTTP routes; 39 blocked routes; 0 completed critical deployed "
            "journeys**.\n\n"
        )
        + table(
            ["Role/domain journey", "Current deployed result"],
            [(w["name"], w["status"]) for w in workflows],
        )
        + (
            "\n[Machine workflow "
            "status](evidence/railway-rescue/workflow-results.json). Local "
            "screenshots and desktop/mobile traces are under "
            "`/workspace/artifacts/glam-railway-rescue`; browser viewport "
            "emulation is not native device testing."
        ),
    )
    write(
        "DEFECT_REGISTER.md",
        "Defect register",
        table(
            ["ID", "Severity", "Status", "Issue / evidence or next action"],
            [
                (d["id"], d["severity"], d["status"], d["title"] + ": " + d["resolution"])
                for d in defects
            ],
        )
        + (
            "\nD201 is an audit-tool fix only; four new negative cases failed "
            "before repair and eight validator cases passed afterward. "
            "`release-lock-before.log` / `release-lock-after.log` are under the "
            "artifact directory. Synthetic validation fixtures never become real "
            "Stripe or Railway evidence. All current production blockers remain "
            "unresolved; no disabled integration was turned into a mock success."
        ),
    )
    write(
        "REGRESSION_RESULTS.md",
        "Regression results",
        table(
            ["Suite", "Evidence / scope"],
            [
                ("Backend PostgreSQL", f"{passed} passed; isolated local _test DB only"),
                (
                    "Ruff / generated API / TypeScript",
                    "Local commands completed; no application contract changes",
                ),
                (
                    "Release lock",
                    "8 passed after repair; 4 new failures demonstrated before repair",
                ),
                ("CI routing", "6 cases; audit script changes select their validation jobs"),
                (
                    "Default-branch checks",
                    f"Successful checks recorded for {git['main_sha']}; "
                    "audit branch CI is separate",
                ),
                (
                    "Local Playwright",
                    f"{crawl['counts']['route_viewport_visits']} visits; "
                    "automatic accessibility/runtime checks only",
                ),
                (
                    "Native / OAuth / AI / Stripe",
                    "No new hardware/provider success or financial acceptance claimed",
                ),
                ("Railway deployed regression", "BLOCKED — no token/network access"),
            ],
        )
        + (
            "\nNo original schema, financial or authentication logic was changed. "
            "The approved 10% eligible physical-product commission remains "
            "unchanged. Input hashes bind runtime and audit source; "
            "missing/stale/mismatched deployed evidence, omitted G12, failed "
            "readiness, wrong SHA and blocked critical journeys now prevent "
            "certification."
        ),
    )
    presence = remote["environment_presence"]
    write(
        "INTEGRATION_STATUS.md",
        "Integration status",
        table(
            ["Integration", "Actual verification"],
            [
                ("Railway", "Not configured in agent; no build/runtime logs or served SHA"),
                (
                    "Supabase",
                    str(remote.get("catalog"))
                    + "; management/read-only SQL, not Railway connectivity",
                ),
                (
                    "SMS / Google / Apple / Facebook",
                    "All disabled in actual Supabase settings; no delivery/linking tests",
                ),
                (
                    "OpenAI / Replicate / FASHN",
                    "Credentials absent; inference/try-on implementations also incomplete",
                ),
                ("Maps / weather", "No current real location/forecast integration proof"),
                (
                    "Creator social providers",
                    "No real OAuth/refresh/sync; local manual-draft tests only",
                ),
                ("Stripe Connect", str(remote.get("stripe"))),
                ("Notifications / monitoring", "No real delivery/monitoring verification"),
            ],
        )
        + "\nCredential-presence booleans only: "
        + json.dumps(presence)
        + (
            ". Presence never means CONNECTED. [Read-only remote "
            "evidence](evidence/railway-rescue/remote-readiness.json). No live "
            "payment, transfer, refund, payout, social publication, SMS or email "
            "was executed."
        ),
    )
    write(
        "SECURITY_REPORT.md",
        "Security and release authorization",
        f"Current read-only catalog: `{json.dumps(remote.get('catalog'))}`. "
        "All 41 public tables have RLS; no invalid foreign key reported. "
        "This is metadata verification, not the complete tenant/role matrix. "
        f"Local PostgreSQL security tests are included in {passed} tests; "
        "prior controlled live core/session evidence remains historical and "
        "separately scoped. No new production users, transactions or private "
        "images were created.\n\n"
        + table(
            ["Control", "Actual result"],
            [
                ("Railway access", "Token placed in service, not agent; secrets never printed"),
                ("Private runtime configuration", str(configuration["runtime_database_url"])),
                ("New/old origin CORS", str(configuration["cors"])),
                ("Phone/social Auth", "Disabled; no fabricated OTP/OAuth success"),
                (
                    "Payments",
                    "GET mode check returned live mode; all financial mutations prohibited",
                ),
                (
                    "Gate enforcement",
                    (
                        "Version2, exactly G1–G12, source/deployed SHA, real public HTTPS "
                        "health/journeys/rollback, fresh evidence, finance, hardware and "
                        "final approval required"
                    ),
                ),
                (
                    "Unverified security areas",
                    (
                        "Private image retention/deletion, complete role matrix, legal and "
                        "physical-device checks remain blocked"
                    ),
                ),
            ],
        )
        + (
            "\nNo RLS bypass, database reset, credential overwrite, public launch "
            "or destructive migration occurred. Secret scans and "
            "provider/hardware tests must be repeated against the final "
            "authorized deployed candidate."
        ),
    )
    open_high = sum(d["severity"] in ["P0", "P1"] and d["status"] != "FIXED" for d in defects)
    write(
        "PUBLIC_LAUNCH_GO_NO_GO.md",
        "Public launch decision: NO-GO",
        f"**Technical release candidate NOT CERTIFIED; public launch BLOCKED.** "
        f"{open_high} unresolved P0/P1 items in the retained register. "
        f"0/{len(workflows)} required deployed journeys completed; "
        "missing tests are not passes.\n\n"
        + table(["Gate", "Requirement", "Status", "Reason"], gates)
        + "\n"
        + facts
        + "\n\n"
        + blocked
        + "\n\n"
        + prerequisite
        + (
            "\n\n`node scripts/launch/release-gates.cjs` must exit nonzero. No "
            "release tag, public deployment, service/source/domain switch, pilot "
            "or final approval was issued. [Version2 "
            "summary](evidence/railway-rescue/launch-summary.json), [Railway "
            "root-cause report](RAILWAY_ROOT_CAUSE_REPORT.md), [deployed "
            "verification](DEPLOYMENT_VERIFICATION.md)."
        ),
    )
    print(
        json.dumps(
            {
                "decision": "NO-GO",
                "gates": len(gates),
                "open_high": open_high,
                "backend_passed": passed,
                "local_visits": crawl["counts"]["route_viewport_visits"],
                "deployed_routes_blocked": len(source["routes"]),
            }
        )
    )


if __name__ == "__main__":
    main()
