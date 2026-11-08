"Evidence-scoped QA export: source declarations and UI changes never imply operational passes."

import csv
import hashlib
import json
import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs/qa"
E = DOC / "evidence"
STATUS = {"PASS", "FAIL", "BLOCKED", "NOT TESTED", "NOT APPLICABLE"}


def read(path, fallback=None):
    p = ROOT / path
    return json.loads(p.read_text()) if p.exists() else fallback


def write_csv(name, rows, fields=None):
    if not rows:
        raise ValueError("Empty QA inventory")
    with (DOC / name).open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields or list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def table(headers, rows):
    def clean(v):
        return str(v).replace("|", "/").replace("\n", " ")

    return "\n".join(
        ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
        + ["| " + " | ".join(clean(v) for v in row) + " |" for row in rows]
    )


def main():
    source = read("docs/qa/evidence/source-inventory.json")
    crawl = read("docs/qa/evidence/clickthrough.json")
    actions = read("docs/qa/evidence/interactions.json", {"results": [], "counts": {}})
    remote = read("docs/audit/evidence/remote-readiness.json")
    deployed = read(
        "docs/qa/evidence/railway-ci-receipt.json",
        read("docs/audit/evidence/railway-ci-receipt.json"),
    )
    guest = read("docs/qa/evidence/production-results.json", {"checks": []})
    fixture = read("docs/qa/evidence/workspace-results.json", {"checks": []})
    indexed = {(r["route"], r["viewport"], str(r["control_id"])): r for r in actions["results"]}
    inventory = []
    common = {
        "Expected API Call": "UNRESOLVED; no qualified service effect inferred",
        "Expected Database Effect": "UNVERIFIED; no production write attempted",
        "Expected Navigation": "Depends on selected state; see source/route evidence",
        "Test ID": "NONE qualified",
        "Status": "NOT TESTED",
        "Defect ID": "QA-SEMANTICS",
        "Evidence": "docs/qa/evidence/source-inventory.json",
        "Scope": "Source discovery only",
    }
    for i, c in enumerate(source["source_controls"], 1):
        native = c["file"].startswith("apps/mobile/")
        inventory.append(
            {
                "Control ID": f"SRC-{i:04d}",
                "Platform": "iOS/Android source" if native else "web source",
                "Role": "Conditional account/workspace/staff state; not granted by UI",
                "Route/Screen": "Conditional component screen; source declaration",
                "Component": f"{c['file']}:{c['line']}",
                "Control Label": c["label"] or "DYNAMIC/UNRESOLVED",
                "Control Type": c["tag"],
                "Expected Action": str(
                    c.get("handler_source") or c.get("handler") or "Inspect link/input semantics"
                )[:1200],
                "Required Preconditions": "Real native build/device and correct role"
                if native
                else "Confirm rendered branch and semantic result with correct role",
                **common,
                "Observed Result": (
                    "Declaration discovered; no runtime or feature acceptance inferred"
                ),
                "Status": "BLOCKED" if native else "NOT TESTED",
            }
        )
    for route in crawl["routes"]:
        for c in route.get("controls", []):
            key = (route["route"], route["viewport"], str(c["id"]))
            action = indexed.get(key)
            uid = hashlib.sha256("|".join(key).encode()).hexdigest()[:16]
            parent = (
                "WorkspaceAccess"
                if route["route"] in ["/business", "/admin"]
                else "WebLogin"
                if route["route"]
                in [
                    "/login",
                    "/register",
                    "/business/login",
                    "/business/register",
                    "/admin/login",
                    "/auth/callback",
                ]
                else "GlamApp / rendered child (exact child unresolved)"
            )
            status = "BLOCKED" if c["disabled"] else "NOT TESTED"
            observation = f"Rendered {'disabled' if c['disabled'] else 'enabled'}; " + (
                str(action) if action else "no safe action attempted"
            )
            inventory.append(
                {
                    "Control ID": "DOM-" + uid,
                    "Platform": "web browser " + route["viewport"],
                    "Role": "guest / unconfigured connections",
                    "Route/Screen": route["route"],
                    "Component": parent,
                    "Control Label": c["name"] or "UNNAMED",
                    "Control Type": c["tag"],
                    "Expected Action": "Navigate/focus " + c["href"]
                    if c.get("href")
                    else "Semantic outcome requires handler/state qualification",
                    "Required Preconditions": (
                        "Fresh anonymous local Next page; providers blocked; no real role assumed"
                    ),
                    **common,
                    "Expected Navigation": c.get("href") or "UNRESOLVED",
                    "Test ID": "SAFE-" + uid if action else "NONE qualified",
                    "Observed Result": observation,
                    "Evidence": "docs/qa/evidence/clickthrough.json; interactions.json; /work"
                    "space/artifacts/glam-qa",
                    "Status": status,
                    "Scope": "Current local rendered occurrence; change alone is not semantic PASS",
                }
            )
    # Explicit outcomes are limited to tests that assert the named result.
    for i, check in enumerate(guest["checks"], 1):
        inventory.append(
            {
                "Control ID": f"ASSERT-GUEST-{i:02d}",
                "Platform": "web Next SSR/browser",
                "Role": "guest",
                "Route/Screen": "Private entry routes; see production-results.json",
                "Component": "AccountRoutes / WorkspaceAccess / WebLogin",
                "Control Label": check,
                "Control Type": "route/absence/layout assertion",
                "Expected Action": check,
                "Required Preconditions": (
                    "Local Next build; no Auth session; outbound providers blocked"
                ),
                "Expected API Call": "NONE required for guest route/denial checks",
                "Expected Database Effect": "NONE",
                "Expected Navigation": "Named local entry route / no private modules",
                "Test ID": f"WS-GUEST-{i:02d}",
                "Observed Result": "Assertion passed on actual local Next application",
                "Evidence": "docs/qa/evidence/production-results.json; guest screenshots;"
                " actual-guest-trace.zip",
                "Status": "PASS",
                "Defect ID": "QA001 (candidate only; deployed correction pending)",
                "Scope": "Local guest-route assertion; not an actionable-control or li"
                "ve-auth acceptance count",
            }
        )
    for i, check in enumerate(fixture["checks"], 1):
        inventory.append(
            {
                "Control ID": f"ASSERT-AUTH-{i:02d}",
                "Platform": "web UI transport harness",
                "Role": "Simulated account/grants; not real authorization",
                "Route/Screen": "/business; /admin; login/register",
                "Component": "AccountRoutes / WorkspaceAccess / BusinessPortal",
                "Control Label": check,
                "Control Type": "conditional flow assertion",
                "Expected Action": check,
                "Required Preconditions": "Synthetic Auth and role transport fixtures",
                "Expected API Call": "Auth/Edge contracts intercepted; see recorded calls",
                "Expected Database Effect": (
                    "No real write from this UI harness; local PostgreSQL tested separately"
                ),
                "Expected Navigation": "Business return / restricted staff context / sign-out",
                "Test ID": f"WS-UI-{i:02d}",
                "Observed Result": "Local regression PASS; actual provider/role acceptance BLOCKED",
                "Evidence": "docs/qa/evidence/workspace-results.json; ui-transport-trace.zip",
                "Status": "BLOCKED",
                "Defect ID": "QA001/QA002",
                "Scope": "Conditional UI regression only; cannot count as live OTP/sta"
                "ff/organization acceptance",
            }
        )
    # Qualify only exact navigation outcomes; state changes do not prove operations.
    for row in inventory:
        if not row["Control ID"].startswith("DOM-"):
            continue
        target = row["Expected Navigation"]
        key_route = row["Route/Screen"]
        key_viewport = row["Platform"].removeprefix("web browser ")
        matching = [
            a
            for a in actions["results"]
            if a["route"] == key_route
            and a["viewport"] == key_viewport
            and a.get("name") == row["Control Label"]
        ]
        if (
            row["Control Type"] == "a"
            and target.startswith("/")
            and not target.startswith("//")
            and "?" not in target
            and "#" not in target
            and any(
                a.get("status") in {"PASSED", "PASSED_IDEMPOTENT"} and a.get("path") == target
                for a in matching
            )
        ):
            row.update(
                {
                    "Status": "PASS",
                    "Expected API Call": "NONE; navigation only",
                    "Expected Database Effect": "NONE",
                    "Defect ID": "",
                    "Observed Result": "Clicked link; exact expected path observed: " + target,
                    "Scope": "Local anonymous link navigation only; not destination operations",
                }
            )
    assert all(r["Status"] in STATUS for r in inventory)
    assert len({r["Control ID"] for r in inventory}) == len(inventory)
    write_csv("COMPLETE_CONTROL_INVENTORY.csv", inventory)
    write_csv("CONTROL_CLICKTHROUGH_RESULTS.csv", inventory)
    text = (ROOT / "docs/specification/sources/2026-11-functional-qa-directive.txt").read_text()
    phase = text.split("### Consumer", 1)[1].split("## PHASE 5", 1)[0]
    phase = "### Consumer" + phase
    journeys = []
    for role, body in re.findall(r"^### (.+?)\n(.*?)(?=^### |\Z)", phase, re.M | re.S):
        for name in re.findall(r"^[*-] (.+)$", body, re.M):
            journeys.append(
                {
                    "id": f"JQA-{len(journeys) + 1:03d}",
                    "role": role,
                    "journey": name,
                    "status": "NOT TESTED" if name == "Browse without signing in" else "BLOCKED",
                    "expected": "Complete the actual deployed role journey with permissions, "
                    "service and persistence proof",
                    "actual": "No qualified live role/session/provider/transaction acceptan"
                    "ce. See feature matrix for missing code as well as credentia"
                    "ls.",
                    "deployed_sha": deployed["deployed_commit"],
                    "evidence": deployed["run_url"],
                }
            )
    (E / "role-journeys.json").write_text(json.dumps(journeys, indent=2) + "\n")
    definitions = [
        ("Complete feature inventory", "PASS", "docs/audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv"),
        ("Complete actionable-control testing", "BLOCKED", "COMPLETE_CONTROL_INVENTORY.csv"),
        ("Critical consumer journeys", "BLOCKED", "ROLE_JOURNEY_RESULTS.md"),
        ("Merchant and professional journeys", "BLOCKED", "ROLE_JOURNEY_RESULTS.md"),
        ("Creator and advertiser journeys", "BLOCKED", "ROLE_JOURNEY_RESULTS.md"),
        ("AI provider integration", "BLOCKED", "AI_INTEGRATION_RESULTS.md"),
        ("Authentication and session security", "BLOCKED", "ROLE_JOURNEY_RESULTS.md"),
        ("Supabase and access control", "FAIL", "SUPABASE_SECURITY_RESULTS.md"),
        ("Stripe financial correctness", "BLOCKED", "STRIPE_FINANCIAL_RESULTS.md"),
        ("Railway deployment and API health", "FAIL", "RAILWAY_DEPLOYMENT_RESULTS.md"),
        ("Native mobile device testing", "BLOCKED", "MOBILE_DEVICE_RESULTS.md"),
        ("Performance monitoring and recovery", "BLOCKED", "PERFORMANCE_RELIABILITY_RESULTS.md"),
        (
            "Legal privacy support and operations",
            "BLOCKED",
            "docs/audit/MISSING_FEATURE_IMPLEMENTATION_PLAN.md",
        ),
        ("Pilot user acceptance", "NOT TESTED", "No controlled pilot performed"),
        ("Final owner approval", "BLOCKED", "No final launch approval received"),
    ]
    gates = [
        {
            "id": f"G{i}",
            "name": n,
            "status": s,
            "evidence": e,
            "tested_commit": source["source_commit"],
        }
        for i, (n, s, e) in enumerate(definitions, 1)
    ]
    (E / "qa-release-gates.json").write_text(json.dumps(gates, indent=2) + "\n")
    canonical = ROOT / "docs/launch/evidence/launch-summary.json"
    summary = json.loads(canonical.read_text())
    summary["qa_release_gates"] = gates
    summary["decision"] = "NO-GO"
    canonical.write_text(json.dumps(summary, indent=2) + "\n")
    defects = [
        {
            "Defect ID": d["id"],
            "Severity": d["severity"],
            "Status": "HISTORICAL FIX" if d["status"] == "FIXED" else "BLOCKED",
            "Problem": d["title"],
            "Evidence": "docs/launch/DEFECT_REGISTER.md",
            "Next action": d.get("resolution", "Qualification pending"),
        }
        for d in summary["defects"]
    ]
    defects += [
        {
            "Defect ID": "QA001",
            "Severity": "P1",
            "Status": "LOCAL FIX; DEPLOYED NOT TESTED",
            "Problem": "Business/admin routes expose public planning inventory witho"
            "ut private login/registration entry",
            "Evidence": "Baseline source ff62f64; before transcript; source repair an"
            "d local guest checks",
            "Next action": "Configure actual Auth/build/CORS and deploy approved candida"
            "te; verify real account/grants",
        },
        {
            "Defect ID": "QA002",
            "Severity": "P1",
            "Status": "LOCAL FIX; DEPLOYED NOT TESTED",
            "Problem": "Sign-in/callback loses business destination; no organization"
            "-registration handoff",
            "Evidence": "WebLogin old always-home callback; new Auth transport regression",
            "Next action": "Verify actual OTP/OAuth return, idempotent organization regi"
            "stration and role denial in qualified environment",
        },
        {
            "Defect ID": "QA003",
            "Severity": "P2",
            "Status": "LOCAL FIX; DEPLOYED NOT TESTED",
            "Problem": "Analyst review layout showed every admin module instead of Analytics",
            "Evidence": "Component-only regression; actual private view separately li"
            "mited by server module list",
            "Next action": "Verify deployed scoped staff contexts; prototype layout is n"
            "ot operational authorization",
        },
    ]
    write_csv("DEFECT_REGISTER.csv", defects)
    stats = {
        "observed_at": datetime.now(UTC).isoformat(),
        "source_routes": len(source["routes"]),
        "source_declarations": len(source["source_controls"]),
        "runtime_occurrences": crawl["counts"]["rendered_control_occurrences"],
        "inventory_rows_including_explicit_assertions": len(inventory),
        "status_counts": dict(Counter(r["Status"] for r in inventory)),
        "safe_action_observations": actions.get("counts", {}),
        "qualified_actionable_control_passes": sum(
            r["Status"] == "PASS" and r["Control ID"].startswith("DOM-") for r in inventory
        ),
        "local_guest_assertion_passes": len(guest["checks"]),
        "local_transport_assertions": len(fixture["checks"]),
        "latest_role_journeys": len(journeys),
        "qualified_role_journeys_passed": 0,
        "legacy_critical_aggregates_passed": 0,
        "legacy_critical_aggregates_required": 31,
        "qa_gate_counts": dict(Counter(g["status"] for g in gates)),
        "decision": "NO-GO",
    }
    (E / "qa-summary.json").write_text(json.dumps(stats, indent=2) + "\n")
    intro = (
        "**NO-GO.** Current local candidate evidence is distinct from"
        " actual deployed/service/device evidence. "
        "No production deployment, migration, account creation, messa"
        "ges or financial mutation was performed by this audit.\n\n"
    )
    links = (
        "[Control inventory](COMPLETE_CONTROL_INVENTORY.csv) · [Resul"
        "ts](CONTROL_CLICKTHROUGH_RESULTS.csv) · "
        "[Feature matrix](../audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX."
        "csv) · [Evidence summary](evidence/qa-summary.json).\n\n"
    )

    def doc(name, title, body):
        (DOC / name).write_text("# " + title + "\n\n" + intro + links + body + "\n")

    doc(
        "ROUTE_COVERAGE_REPORT.md",
        "Route and control coverage",
        table(["Metric", "Observed"], [(k, v) for k, v in stats.items() if not isinstance(v, dict)])
        + "\n\n"
        + table(
            ["Route", "Viewport", "Rendered controls", "Overflow"],
            [
                (r["route"], r["viewport"], len(r.get("controls", [])), r.get("overflow"))
                for r in crawl["routes"]
            ],
        )
        + "\n\nSource and DOM rows are separate inventories, not deduplic"
        "ated unique logical controls. Explicit assertion rows are no"
        "t actionable controls. A safe click changing state does not "
        "prove the intended API/database effect; such rows remain NOT"
        " TESTED/BLOCKED until semantic qualification. SKIPPED observ"
        "ations are NOT TESTED, never PASS. Conditional native and au"
        "thenticated controls are recorded from source and separately"
        " blocked; no device/role is impersonated in a production env"
        "ironment.",
    )
    doc(
        "ROLE_JOURNEY_RESULTS.md",
        "Role journey qualification",
        f"The latest instruction expands role cases to {len(journeys)} named journeys; "
        f"**0/{len(journeys)} qualified**. Existing31 aggregate critical workflows "
        "remain0/31; the new list does not replace or inflate them.\n\n"
        + table(
            ["ID", "Role", "Journey", "Status"],
            [(j["id"], j["role"], j["journey"], j["status"]) for j in journeys],
        )
        + "\n\nThe local access tests use explicit Auth/grant doubles; or"
        "ganization-creation negative permissions were independently "
        "verified on disposable real PostgreSQL. No actual OTP, OAuth"
        ", staff assignment or production record was created. Full bu"
        "siness/admin operations remain drafts or unavailable service"
        "s; private entry is a candidate repair, not complete busines"
        "s functionality.",
    )
    doc(
        "WEB_MOBILE_PARITY.md",
        "Web and native parity",
        "The web now has /business/login, /business/register, /admin/"
        "login and /register. /business and /admin render only a gate"
        " until verified access. Native Auth and business quick tools"
        " remain separate code; this web patch does not certify nativ"
        "e role access or hardware.\n\nWeb profile/routine CRUD, accoun"
        "t linking and phone-change controls still lack equivalent na"
        "tive editing flows. The native picker is not proof web captu"
        "re works; PR28 remains separate.\n\nSee [detailed parity](../a"
        "udit/WEB_VS_MOBILE_PARITY_REPORT.md). Local browser widths32"
        "0/375/390/430/768/1024/1440/1920 are checked for guest entry"
        "; actual OS keyboard/safe areas/VoiceOver/TalkBack remain un"
        "verified.",
    )
    doc(
        "AI_INTEGRATION_RESULTS.md",
        "AI integration results",
        "**BLOCKED.** Real provider calls0; OPENAI_API_KEY/REPLICATE_"
        "API_TOKEN/FASHN_API_KEY/GOOGLE_MAPS_API_KEY absent in the ob"
        "served environment. Candidate provider adapters are unmounte"
        "d and default consumers have no CompanionConnection. Analysi"
        "s503 and honest empty/denied states are not generated result"
        "s. Image Storage, retention, canonical reports/corrections a"
        "nd real usage/provider orchestration remain missing.\n\n"
        + "[Detailed AI audit](../audit/AI_FEATURE_AUDIT.md). No protec"
        "ted-demographic inference, medical diagnosis or private-phot"
        "o provider upload performed.",
    )
    doc(
        "SUPABASE_SECURITY_RESULTS.md",
        "Supabase security results",
        f"Read-only production observation `{remote['observed_at']}`: "
        "original project only, schema0013,41 tables with RLS enabled,77 indexes,"
        "54 validated foreign keys,21 policies,0 Storage buckets.\n\n"
        + "Current real local PostgreSQL regression268 passed, includin"
        "g five registration-authority cases: creation grants neither"
        " verified capability nor staff status; client workspace/role"
        "/verification/owner overrides are rejected. These are local "
        "fixture users; no production tenant write qualification. The"
        " client gate is a UX boundary; existing server JWT/RLS/capab"
        "ility checks remain the data-security boundary. No new cooki"
        "es, role store or authentication backend was introduced.\n\nCo"
        "dex still has an administrative database credential and no R"
        "ailway token; actual hosted application credentials uninspec"
        "ted. Storage/retention/deletion and production role/service "
        "authorization remain incomplete. [Raw metadata](../audit/evi"
        "dence/production-catalog.json), [configuration](../audit/evi"
        "dence/configuration.json).",
    )
    doc(
        "STRIPE_FINANCIAL_RESULTS.md",
        "Financial qualification",
        "**BLOCKED.** Current read-only balance check reports livemod"
        "e=true. No live mutation was executed. Actual test payment/t"
        "ransfer IDs, processing fees and reconciled commission recei"
        "pts remain absent.10% eligible physical-item policy and isol"
        "ated sandbox ledger/idempotency/refund tests are preserved, "
        "not treated as actual Stripe acceptance.\n\nNo professional/cr"
        "eator fee percentage was invented. Separate real test key/we"
        "bhook/eligible connected accounts and isolated ledger are re"
        "quired. [Financial audit](../audit/MARKETPLACE_AND_PAYMENTS_"
        "AUDIT.md).",
    )
    doc(
        "RAILWAY_DEPLOYMENT_RESULTS.md",
        "Actual deployed evidence",
        f"Observed deployed SHA `{deployed['deployed_commit']}` "
        f"at `{deployed['observed_at']}` via [authorized CI]({deployed['run_url']}).\n\n"
        + table(
            ["Endpoint", "HTTP", "State"],
            [(h["endpoint"], h.get("http_status"), h.get("status")) for h in deployed["health"]],
        )
        + "\n\nThe existing site is reachable through CI; this workspace "
        "proxy still denies direct access. Readiness503 is a real con"
        "figuration failure; proxy tunnel denial is a runner-access p"
        "roblem, not evidence all routes are broken. New business acc"
        "ess code is not deployed. Provider config/CORS/actual Railwa"
        "y logs/settings/rollback remain blocked. New read-only probe"
        "s include candidate entry routes and anonymous role-picker/s"
        "ign-in visibility; receipt scope is exact. No service/domain"
        "/source setting changed.",
    )
    doc(
        "MOBILE_DEVICE_RESULTS.md",
        "Native mobile certification",
        "**BLOCKED.** No registered EAS/store project, signed IPA/AAB"
        " or real-device execution was supplied. Existing iOS/Android"
        " JavaScript exports and native Auth/PKCE/biometric doubles d"
        "o not establish installation, camera, biometrics, notificati"
        "on delivery, background lifecycle or store readiness. Native"
        " source controls are inventoried but never counted as runtim"
        "e passes. No device was fabricated or provider credentials r"
        "equested in chat.",
    )
    doc(
        "PERFORMANCE_RELIABILITY_RESULTS.md",
        "Performance and reliability",
        "Acceptance thresholds used for the checked local UI: HTTP200"
        " on expected guest entry routes; zero private navigation for"
        " guests; zero page/runtime/HTTP/overflow/automated-AX errors"
        "; exact asserted navigation within test timeout; no unapprov"
        "ed outbound mutations. Eight entry widths tested. These are "
        "correctness thresholds, not production load SLOs.\n\nProductio"
        "n p75 LCP/INP/CLS, backend latency/concurrency, upload relia"
        "bility, AI latency, queues, worker recovery and notification"
        " latency budgets are NOT QUALIFIED. Agree operational budget"
        "s and representative load before PASS. Backup metadata is no"
        "t a restore rehearsal; rollback/monitoring/alerts/incident t"
        "ests are not run. No outage or load attack was injected into"
        " production.",
    )
    doc(
        "RELEASE_READINESS_CHECKLIST.md",
        "Fifteen additional QA review gates",
        table(
            ["Gate", "Required review", "Status", "Evidence"],
            [(g["id"], g["name"], g["status"], g["evidence"]) for g in gates],
        )
        + "\n\nThese15 review gates are additional to the existing versio"
        "n2 twelve-gate validator. The validator now requires all15 P"
        "ASS plus nonempty evidence and the same candidate commit; le"
        "gacy green labels cannot omit this review. Structural fixtur"
        "es are explicitly synthetic and never production evidence. N"
        "o optional exclusions, pilot acceptance or final owner appro"
        "val was inferred.",
    )
    doc(
        "PUBLIC_LAUNCH_GO_NO_GO.md",
        "Public launch decision",
        "**NO-GO.** "
        + table(
            ["Metric", "Count"],
            [
                ("Required role journeys verified", f"0/{len(journeys)}"),
                ("Legacy critical aggregates verified", "0/31"),
                ("Operational feature acceptance", "0/140"),
                (
                    "Qualified local navigation occurrences",
                    stats["qualified_actionable_control_passes"],
                ),
                ("Local guest assertions only", len(guest["checks"])),
            ],
        )
        + "\n\nPrivate entry and return routing are locally repaired with"
        " regression evidence, not deployed closed defects. Missing c"
        "ode remains missing; credentials alone do not create the abs"
        "ent operations. No live auth/provider/payment/device/restore"
        "/pilot/owner approval was substituted with a fixture.\n\nNext "
        "dependencies: review the concrete candidate; configure exist"
        "ing Railway project access/public build key and original Sup"
        "abase Auth/CORS; qualify real providers and private data lif"
        "ecycle; complete catalog/commerce/booking/admin implementati"
        "ons; verify the approved deployed SHA, full roles, real devi"
        "ces, reconciliation/recovery and final owner approval. [Defe"
        "cts](DEFECT_REGISTER.csv).",
    )
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
