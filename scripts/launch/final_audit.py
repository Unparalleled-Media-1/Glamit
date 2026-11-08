"Render evidence-scoped final platform reports; never promotes partial work to completion."

import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs/launch"
E = DOC / "evidence/final"


def read(name, default=None):
    p = E / name
    return json.loads(p.read_text()) if p.exists() else default


def write_csv(name, rows):
    if not rows:
        raise ValueError("An empty inventory cannot certify coverage")
    with (DOC / name).open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def table(headers, rows):
    def safe(x):
        return str(x).replace("|", "/").replace("\n", " ")

    return "\n".join(
        ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
        + ["| " + " | ".join(map(safe, row)) + " |" for row in rows]
    )


def main():
    manifest = json.loads((ROOT / "docs/audit/requirements.json").read_text())
    features = manifest["features"]
    source = read("source-inventory.json")
    crawl = read("clickthrough.json", {"routes": []})
    remote = read("remote-readiness.json", {})
    actions = read("interactions.json", {"results": []})
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    now = datetime.now(UTC).isoformat()
    stamp = (
        f"Observed {now}. Source base `{commit}` plus the uncommitted/committed audit patch. "
        "Exact tested file hashes are in evidence/final/source-hashes.json. "
        "This is a failed acceptance audit, not a certificate of completion.\n\n"
    )
    matrix = []
    defects = []
    credentials = {"GB-001", "GB-002", "GB-003", "GB-004", "GB-008", "GB-093", "GB-102", "GB-115"}
    uncertain = {"GB-005", "GB-010", "GB-117", "GB-119"}
    overrides = {
        "GB-022": (
            "Local web camera/file preview now passes synthetic-camera tests; priva"
            "te server upload, storage, retention and deletion remain unimplemented"
            "."
        ),
        "GB-111": (
            "Current deployed browser attempt is BLOCKED_ACCESS. Historical served "
            "ff62f64 receipt is not fresh evidence; no runtime Railway token/log ac"
            "cess."
        ),
        "GB-113": (
            "Exact original PNG artwork installed; 43 local artwork assertions pass"
            ". No native installed-binary verification or fresh deployed acceptance"
            "."
        ),
        "GB-114": (
            "Docker and frozen dependency source guards pass; actual native release"
            " binaries, signing and deployed served-SHA qualification missing."
        ),
    }
    for f in features:
        profile = manifest["profiles"][f["profile"]]
        reason = overrides.get(f["id"], f["blocker"])
        missing_code = re.search(
            r"missing|unimplemented|unconnected|unbound|unmounted|returns503|"
            r"no (?:completed|operational|canonical|persisted|full|complete|"
            r"visual|calendar|booking|wishlist|ad event|StoreKit|durable)|"
            r"not (?:operational|connected)",
            reason,
            flags=re.IGNORECASE,
        )
        status = (
            "BLOCKED"
            if f["id"] in credentials | {"GB-111"}
            else "NOT TESTED"
            if f["id"] in uncertain
            else "FAIL"
            if (
                f["status"] in {"MISSING", "PLACEHOLDER", "BROKEN"}
                or missing_code
                or f["profile"] in {"analysis", "studio"}
            )
            else "NOT TESTED"
        )
        web = "PASS" if f["id"] in {"GB-006", "GB-113"} else status
        native = "NOT TESTED" if f["id"] in {"GB-006", "GB-113"} else status
        if f["id"] == "GB-009":
            native = "FAIL"
        refs = "; ".join(profile["files"])
        matrix.append(
            {
                "feature_id": f["id"],
                "module": profile["module"],
                "requirement": f["requirement"],
                "WEB": web,
                "iOS": native,
                "ANDROID": native,
                "source_implementation": "COMPLETE_ARTWORK" if f["id"] == "GB-113" else f["status"],
                "web_local_evidence": "43 exact-artwork checks"
                if f["id"] == "GB-113"
                else "Anonymous guest navigation and application regression"
                if web == "PASS"
                else "Related test suites are not full feature acceptance",
                "ios_local_evidence": (
                    "Separate iOS JS export; shared contract doubles only; no installed iOS runtime"
                ),
                "android_local_evidence": (
                    "Separate Android JS export and native prebuild; actual compile attempt"
                    "ed; no installed runtime"
                ),
                "provider_status": "BLOCKED/NOT VERIFIED",
                "deployed_status": "BLOCKED_ACCESS",
                "real_device_status": "NOT TESTED",
                "web_routes": profile["web"],
                "native_context": profile["native"],
                "source_references": refs,
                "api": profile["api"],
                "tables_and_migrations": profile["tables"] + " | " + profile["migrations"],
                "existing_related_tests": "; ".join(profile["tests"]),
                "finding": reason,
                "defect_id": "FINAL-" + f["id"],
                "evidence_scope": (
                    "Source triage plus named local checks. Missing operation cannot be exc"
                    "used by credentials. Related tests do not imply completed feature."
                ),
            }
        )
        if web != "PASS" or native != "PASS":
            defects.append(
                {
                    "id": "FINAL-" + f["id"],
                    "severity": "P1" if f["priority"] == "launch-critical" else "P2",
                    "requirement": f["requirement"],
                    "reproduction": "Attempt complete journey at "
                    + profile["web"]
                    + "; native context: "
                    + profile["native"],
                    "expected": (
                        "Real authorized operation with persisted result, failure recovery and "
                        "independent platform tests"
                    ),
                    "actual": reason,
                    "root_cause": (
                        "See source implementation and named blocking dependency in COMPLETE_FE"
                        "ATURE_MATRIX.csv"
                    ),
                    "status": "OPEN",
                    "failing_before": (
                        "Source/API unavailable or incomplete operation; no invented failing de"
                        "vice run"
                    ),
                    "fix": (
                        "Pending approved implementation/qualification; no full feature closure"
                        " claimed"
                    ),
                    "passing_after": "NONE for complete requirement",
                    "deployed_closure": "NOT VERIFIED",
                }
            )
    defects.extend(
        [
            {
                "id": "FINAL-NATIVE-CI-ARTWORK",
                "severity": "P1",
                "requirement": "Native store candidate preflight",
                "reproduction": "Run native CI artifact checks against resolved production config",
                "expected": "CI checks existing canonical app icon and wordmark assets",
                "actual": "Before: nonexistent splash.png rejected; after: wordmark.png passes",
                "root_cause": "CI preflight retained obsolete splash filename",
                "status": "FIXED LOCALLY",
                "failing_before": "evidence/final/native-store-preflight-before.txt",
                "fix": "Use canonical wordmark asset; verify actual preflight files exist",
                "passing_after": "evidence/final/native-store-preflight-after.txt",
                "deployed_closure": "NOT VERIFIED; no store build or submission performed",
            },
            {
                "id": "FINAL-NATIVE-APPEARANCE",
                "severity": "P2",
                "requirement": "Declared native light appearance",
                "reproduction": "Expo Android prebuild using locked app manifest",
                "expected": "Declared appearance setting applied",
                "actual": "Before: Expo warns expo-system-ui missing; after: no warning",
                "root_cause": "Missing SDK-compatible native module",
                "status": "FIXED LOCALLY",
                "failing_before": "evidence/final/android-prebuild-before.txt",
                "fix": "Pin expo-system-ui 58.0.7, regenerate lockfile",
                "passing_after": (
                    "evidence/final/android-prebuild-after.txt; independent JS exports"
                ),
                "deployed_closure": "NOT VERIFIED; no native binary installed",
            },
            {
                "id": "FINAL-CERTIFICATION-GAP",
                "severity": "P1",
                "requirement": "Independent cross-platform certification",
                "reproduction": (
                    "Submit old green synthetic receipt without final twenty gates/platform records"
                ),
                "expected": "Reject missing independent Web/iOS/Android acceptance",
                "actual": "Before: old validator accepts; after: rejects",
                "root_cause": "Older twelve/fifteen locks lacked new final directive",
                "status": "FIXED LOCALLY",
                "failing_before": "evidence/final/final-gate-before.txt",
                "fix": (
                    "Supplement existing locks with twenty gates and independent platform r"
                    "equirements"
                ),
                "passing_after": "evidence/final/gates-after.txt",
                "deployed_closure": "NOT VERIFIED; certification guard does not deploy",
            },
        ]
    )
    write_csv("COMPLETE_FEATURE_MATRIX.csv", matrix)
    write_csv("DEFECT_REGISTER.csv", defects)

    route_rows = []
    for route in source["routes"]:
        visits = [r for r in crawl["routes"] if r.get("route", r.get("path")) == route]
        route_rows.append(
            {
                "id": "WEB-ROUTE-" + hashlib.sha256(route.encode()).hexdigest()[:12],
                "platform": "WEB",
                "route_or_screen": route,
                "evidence_kind": "Next production browser",
                "visits": len(visits),
                "status": "CHECKED_HTTP_LAYOUT_ONLY" if visits else "NOT TESTED",
                "feature_acceptance": "Not implied by route load",
            }
        )
    app_source = (ROOT / "apps/mobile/App.tsx").read_text()
    declarations = (ROOT / "packages/product/platform.ts").read_text()
    page_union = declarations.split("export type Page =", 1)[1].split(";", 1)[0]
    screens = sorted(set(re.findall(r'"([^"]+)"', page_union)))
    explicit_cases = set(re.findall(r'case "([^"]+)":', app_source))
    for p in ("iOS", "ANDROID"):
        for screen in screens:
            route_rows.append(
                {
                    "id": p + "-SCREEN-" + screen,
                    "platform": p,
                    "route_or_screen": screen,
                    "evidence_kind": (
                        "Page union plus explicit switch; source only"
                        if screen in explicit_cases
                        else "Page union; delegated view or generic planning fallback; source only"
                    ),
                    "visits": 0,
                    "status": "NOT TESTED",
                    "feature_acceptance": "Native runtime unavailable",
                }
            )
    write_csv("ALL_ROUTES_AND_SCREENS.csv", route_rows)
    controls = []
    for index, item in enumerate(source["source_controls"]):
        native = item["file"].startswith("apps/mobile/")
        for platform in ["iOS", "ANDROID"] if native else ["WEB"]:
            controls.append(
                {
                    "id": platform
                    + "-SRC-"
                    + hashlib.sha256(
                        f"{item['file']}:{item['line']}:{item.get('column', index)}".encode()
                    ).hexdigest()[:14],
                    "platform": platform,
                    "source": f"{item['file']}:{item['line']}",
                    "control": item["tag"],
                    "label": item.get("label") or "Dynamic/inspect runtime",
                    "scope": "SOURCE_ONLY",
                    "status": "NOT TESTED",
                    "evidence": "Inventory is not execution or semantic API/persistence proof",
                }
            )
    for i, item in enumerate(actions["results"]):
        controls.append(
            {
                "id": f"WEB-RUNTIME-{i:05}",
                "platform": "WEB",
                "source": item.get("route", "runtime"),
                "control": item.get("tag", "runtime action"),
                "label": item.get("name", ""),
                "scope": "LOCAL_UI_STATE_ONLY",
                "status": item.get("status", "NOT TESTED"),
                "evidence": (
                    "evidence/final/interactions.json; UI change is not feature persistence"
                ),
            }
        )
    for visit in crawl["routes"]:
        for item in visit.get("controls", []):
            address = f"{visit['viewport']}:{visit['route']}:{item['id']}"
            controls.append(
                {
                    "id": "WEB-OBS-" + hashlib.sha256(address.encode()).hexdigest()[:16],
                    "platform": "WEB",
                    "source": address,
                    "control": item["tag"],
                    "label": item.get("name", ""),
                    "scope": "RUNTIME_INVENTORY",
                    "status": "NOT TESTED",
                    "evidence": (
                        "Observed in clickthrough.json. Observation is not an executed action; "
                        "safe action results are separate rows, with no semantic success inferred."
                    ),
                }
            )
    write_csv("EVERY_CLICKABLE_CONTROL.csv", controls)
    write_csv(
        "BROKEN_AND_STALE_LINKS.csv",
        [
            {
                "id": "LINK-AUTH-CALLBACK",
                "source": "Supabase Auth configuration",
                "destination": remote.get("auth", {}).get("site_url", "unknown"),
                "http_result": "Management configuration read; no callback executed",
                "status": "FAIL",
                "finding": "Stale glamit.beauty origin differs from intended glam.beauty",
                "repair_evidence": "Pending approved deployed configuration validation",
            },
            {
                "id": "LINK-RAILWAY",
                "source": "Actual deployed browser probe",
                "destination": "https://glamit-web-production.up.railway.app",
                "http_result": "net::ERR_TUNNEL_CONNECTION_FAILED",
                "status": "BLOCKED",
                "finding": "Runner proxy access failure; not evidence site is broken",
                "repair_evidence": "evidence/final/deployed-clickthrough.json",
            },
            {
                "id": "LINK-INTERNAL",
                "source": "Local route crawl",
                "destination": "43 discovered routes, all eight required widths",
                "http_result": json.dumps(crawl.get("counts", {})),
                "status": "NOT TESTED" if not crawl["routes"] else "PASS",
                "finding": (
                    "Public loaded-route HTTP coverage only; conditional authenticated/inte"
                    "rnal links still require semantic coverage"
                ),
                "repair_evidence": "evidence/final/clickthrough.json",
            },
        ],
    )

    counts = {p: Counter(r[p] for r in matrix) for p in ["WEB", "iOS", "ANDROID"]}
    percentages = {p: round(100 * counts[p]["PASS"] / len(matrix), 2) for p in counts}
    overall = round(100 * sum(c["PASS"] for c in counts.values()) / (len(matrix) * 3), 2)
    summary = {
        "observed_at": now,
        "source_base": commit,
        "requirements_per_platform": len(matrix),
        "counts": counts,
        "verified_build_acceptance_percent": percentages,
        "overall_verified_build_acceptance_percent": overall,
        "methodology": (
            "PASS/applicable requirements. Lower bound of fully evidenced requireme"
            "nt acceptance, not estimated code-written percentage. Partial implemen"
            "tation counts zero. Native exports/prebuild do not certify native runt"
            "ime. No unapproved N/A exclusions."
        ),
        "decision": "NO-GO",
        "build_completeness_certification": "NOT CERTIFIED; no estimated code percentage",
        "entire_application_100_percent_built": False,
        "public_launch_ready": False,
    }
    (E / "platform-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    for title, key in [("WEB", "WEB"), ("IOS", "iOS"), ("ANDROID", "ANDROID")]:
        native = key != "WEB"
        qualification = (
            (
                "Native release binary: BLOCKED. Physical device, OS permission prompts"
                ", camera, biometrics, deep links, screen reader, keyboard and backgrou"
                "nd lifecycle: NOT TESTED. Separate platform JS export passes, but is n"
                "ot an installed native build. "
            )
            + (
                (
                    "No macOS/Xcode, EAS project, registered identifier, signing or connect"
                    "ed iOS device."
                )
                if key == "iOS"
                else (
                    "Actual native prebuild passes; actual Gradle APK compilation attempted"
                    ". See android-compile.txt for the observed result; no APK/device"
                    " pass is inferred."
                )
            )
            if native
            else (
                "Next production build and typecheck pass. All discovered public routes"
                " are audited at eight widths; this does not certify authenticated/prov"
                "ider operations. Deployed site verification is BLOCKED_ACCESS."
            )
        )
        body = f"# {title} final audit\n\n" + stamp + qualification + "\n\n"
        body += (
            f"Verified build acceptance: **{percentages[key]}% "
            f"({counts[key]['PASS']}/{len(matrix)})**. "
            "This is a conservative evidence lower bound, not a claim that the remaining code "
            "is absent. Build completion is not certified.\n\n"
        )
        body += table(["Status", "Requirements"], sorted(counts[key].items())) + "\n\n"
        body += (
            table(
                ["ID", "Requirement", key, "Finding"],
                [(r["feature_id"], r["requirement"], r[key], r["finding"]) for r in matrix],
            )
            + "\n"
        )
        (DOC / f"{title}_FINAL_AUDIT.md").write_text(body)
    parity = "# Cross-platform parity report\n\n" + stamp
    parity += table(
        [
            "Platform",
            "PASS/applicable",
            "Verified build acceptance",
            "Native/device/deployed qualification",
        ],
        [
            (p, f"{counts[p]['PASS']}/{len(matrix)}", f"{percentages[p]}%", "BLOCKED / NOT TESTED")
            for p in counts
        ],
    )
    parity += (
        f"\n\nOverall: **{overall}% "
        f"({sum(c['PASS'] for c in counts.values())}/{len(matrix) * 3})** "
        "with equal weighting per applicable platform requirement. Partial work is documented, "
        "never rounded to PASS. These percentages measure fully evidenced requirements, "
        "not lines of code or effort.\n\n"
    )
    parity += (
        "Native sources are shared but test results are not transferred between"
        " platforms. Native profile/routine editing, private organization/staff"
        " workspaces, product/order and social-provider operations do not have "
        "verified parity. A missing native operation is FAIL, not a credential "
        "excuse.\n\n"
    )
    parity += (
        table(
            ["Feature", "Requirement", "WEB", "iOS", "ANDROID"],
            [(r["feature_id"], r["requirement"], r["WEB"], r["iOS"], r["ANDROID"]) for r in matrix],
        )
        + "\n"
    )
    (DOC / "CROSS_PLATFORM_PARITY_REPORT.md").write_text(parity)
    (DOC / "WEB_MOBILE_PARITY.md").write_text(
        "# Web/mobile parity\n\nSee [the independent platform matrix](CROSS_PLATF"
        "ORM_PARITY_REPORT.md). No browser evidence is native evidence.\n"
    )

    journeys = [
        (
            "Choose/capture image with consent",
            "PASS local preview; synthetic browser camera only",
            "NOT TESTED native permission/camera",
            "NOT TESTED native permission/camera",
        ),
        (
            "Private upload + retention/deletion",
            "FAIL missing canonical upload/storage lifecycle",
            "FAIL missing lifecycle",
            "FAIL missing lifecycle",
        ),
        (
            "Receive user-specific analysis",
            "FAIL endpoint returns 503",
            "FAIL missing connected workflow",
            "FAIL missing connected workflow",
        ),
        (
            "Correct and persist analysis",
            "FAIL canonical corrected report versions missing",
            "FAIL",
            "FAIL",
        ),
        (
            "Explore looks and real virtual try-on",
            "FAIL production adapter dispatch disconnected",
            "FAIL",
            "FAIL",
        ),
        (
            "Find verified local products/professionals",
            "FAIL live catalog/availability transport incomplete",
            "FAIL",
            "FAIL",
        ),
        (
            "Add cart → server-priced checkout",
            "FAIL durable hosted checkout workflow missing",
            "FAIL",
            "FAIL",
        ),
        (
            "Paid order confirmation → merchant fulfillment",
            "FAIL operational order/fulfillment workflow missing",
            "FAIL",
            "FAIL",
        ),
    ]
    (DOC / "END_TO_END_JOURNEY_RESULTS.md").write_text(
        "# End-to-end journey results\n\n"
        + stamp
        + table(["Step", "WEB", "iOS", "ANDROID"], journeys)
        + (
            "\n\nNo complete real journey passed. Contract doubles are isolated tests"
            ", not operational analysis, verified commerce or settlement. No extern"
            "al photo upload, live charge, payout or unsolicited notification was a"
            "ttempted.\n"
        )
    )
    (DOC / "SUPABASE_AUTH_READINESS.md").write_text(
        "# Supabase/Auth readiness\n\n"
        + stamp
        + (
            "Original project only: `bkkmsbxrxkqaveymcrgi`, main production. Phone,"
            " Google, Apple and Facebook remain disabled in fresh Management API re"
            "ads. Site URL/callback allowlist still uses the old glamit.beauty orig"
            "in. Current guest protection and Auth contract doubles pass locally. N"
            "o real OTP, social callback, account linking or native biometric sessi"
            "on passed acceptance. Do not enable providers or migrate authenticatio"
            "n as an audit side effect.\n"
        )
    )
    (DOC / "SUPABASE_SCHEMA_SECURITY_AUDIT.md").write_text(
        "# Supabase schema/security audit\n\n"
        + stamp
        + (
            "Fresh production system-catalog evidence: 41 public tables, 77 indexes"
            ", 54 foreign keys (zero unvalidated), 21 policies, zero tables without"
            " RLS. Alembic revision `0013_passwordless_accounts`. Storage: zero buc"
            "kets. This verifies metadata, not complete effective tenant-role acces"
            "s, retention or private-upload acceptance. Full named tables/indexes/F"
            "Ks/policies: [production-catalog.json](evidence/final/production-catal"
            "og.json). Local regression applied existing heads only in the disposab"
            "le `_test` database. Production migration0014 was not applied. A compl"
            "eted physical backup exists; no restore rehearsal was performed.\n"
        )
    )
    (DOC / "STRIPE_FINANCIAL_AUDIT.md").write_text(
        "# Stripe financial audit\n\n"
        + stamp
        + (
            "Fresh authenticated Stripe read: HTTP200, `livemode=true`. **BLOCKED**"
            " for authorized test-only financial acceptance. Zero financial mutatio"
            "ns. Actual payment IDs: none. Transfer IDs: none. Actual fees: NOT MEA"
            "SURED. Reconciliation: NOT EXECUTED. Local PostgreSQL tests cover sand"
            "box signatures/idempotency, refunds/disputes/partial fulfillment and i"
            "mmutable journals with doubles. Synthetic fixture IDs/fees in financia"
            "l-fixture-report.json are explicitly not Stripe evidence. Preserve 10%"
            " on eligible discounted physical-product item amounts, with shipping, "
            "tax, fees and refunds separately accounted. Do not activate live payme"
            "nts.\n"
        )
    )
    (DOC / "RAILWAY_DEPLOYMENT_AUDIT.md").write_text(
        "# Railway deployment audit\n\n"
        + stamp
        + (
            "Existing elegant-dedication/glamit-web only; GitHub default `feat/plat"
            "form-foundations`, not a literal main branch. Source Docker/CA/config "
            "guards pass. Fresh deployed browser probe is BLOCKED_ACCESS (`net::ERR"
            "_TUNNEL_CONNECTION_FAILED`), with 0 deployed critical journeys. Runtim"
            "e Railway token and API access are absent. No new deploy, service crea"
            "tion, source switch, domain change or rollback occurred. Earlier ff62f"
            "64 served-SHA evidence remains historical; no fresh served SHA/log/roo"
            "t-cause closure is claimed. Build settings diagnosis requires actual R"
            "ailway source/build/runtime access.\n"
        )
    )
    activation = []
    for name, scope, blocker in [
        (
            "Supabase Auth/Twilio",
            "SMS OTP",
            "Activate provider, callbacks and complete real login lifecycle",
        ),
        (
            "Google/Apple/Facebook",
            "Social Auth",
            ("Official app IDs/scopes/secrets/callbacks; native deep links and linking acceptance"),
        ),
        (
            "OpenAI",
            "Analysis/advisor",
            (
                "Credentials plus missing orchestration, private media, persistence and"
                " evaluation code"
            ),
        ),
        (
            "Replicate/FASHN",
            "Transformation/try-on",
            (
                "Credentials plus missing job dispatch, callbacks/polling, output reten"
                "tion and genuine image acceptance"
            ),
        ),
        (
            "Google Maps/Open-Meteo",
            "Location/weather",
            (
                "No fabricated weather; complete production dispatch/refresh and foreca"
                "st-change persistence"
            ),
        ),
        (
            "Stripe Connect",
            "Physical products",
            (
                "Test-mode credentials/webhooks and eligibility; live key currently blo"
                "cks test acceptance"
            ),
        ),
        (
            "Peach",
            "Approved SA payments",
            "Missing adapter and contractually verified marketplace capability",
        ),
        (
            "TikTok/Instagram/YouTube/Pinterest/Facebook Page",
            "Creator social",
            ("Missing official OAuth/callback/token refresh/revoke/media sync implementations"),
        ),
        (
            "Resend/Twilio/push/Sentry",
            "Notifications/monitoring",
            "Configuration, missing delivery/registration workers and live proof",
        ),
        (
            "Google Calendar",
            "Optional calendar",
            "Missing OAuth/sync/conflict handling implementation",
        ),
    ]:
        activation.append((name, scope, "BLOCKED/INCOMPLETE", blocker))
    (DOC / "EXTERNAL_API_ACTIVATION_CHECKLIST.md").write_text(
        "# External API activation checklist\n\n"
        + stamp
        + table(["Service", "Purpose", "Status", "Required action"], activation)
        + (
            "\n\nCredentials belong only in secure environment settings. Missing adap"
            "ters, refresh, callback, persistence or orchestration remain code defe"
            "cts even without credentials. CONNECTED requires a successful authenti"
            "cated provider health check; no fabricated production fallback is perm"
            "itted.\n"
        )
    )
    gate_labels = [
        "All approved features implemented",
        "All routes/screens present",
        "All actionable controls tested",
        "Zero broken internal links",
        "Zero dead/placeholder controls",
        "Frontend/backend contracts",
        "Supabase schema/security",
        "AI credential-independent workflows",
        "Auth ready for provider activation",
        "Marketplace/financial isolated logic",
        "All role dashboards/journeys",
        "Web/native parity",
        "Accessibility/visual/responsive",
        "Security/performance",
        "Railway deployment/rollback",
        "Native release builds/device tests",
        "No P0/P1 defects",
        "Provider/approval blockers documented",
        "Deployed critical journeys",
        "Explicit public release authorization",
    ]
    gates = [
        (f"G{i + 1}", label, "PASS" if i == 17 else "BLOCKED" if i in {14, 15, 18, 19} else "FAIL")
        for i, label in enumerate(gate_labels)
    ]
    checklist = (
        "# Final public-release checklist\n\n"
        + stamp
        + table(["Gate", "Requirement", "Status"], gates)
    )
    checklist += (
        "\n\nThese twenty gates supplement the original version2 twelve gates and"
        " fifteen QA review gates. G1–G14/G17–G18 govern build completion; G15–"
        "G16/G19–G20 add deployment/device/owner requirements. A validator unit"
        "-test fixture is never real approval or release evidence. All older pr"
        "oduction locks remain active.\n"
    )
    (DOC / "FINAL_PUBLIC_RELEASE_CHECKLIST.md").write_text(checklist)
    (DOC / "FINAL_MASTER_AUDIT.md").write_text(
        "# Final master audit\n\n"
        + stamp
        + (
            "**Entire application 100% built: NO. Production verified: NO. Public l"
            "aunch: NO-GO.**\n\n"
        )
        + (
            f"{len(matrix)} atomic approved requirements tracked independently for each platform. "
            f"Verified build-acceptance percentages: Web {percentages['WEB']}%, "
            f"iOS {percentages['iOS']}%, Android {percentages['ANDROID']}%; "
            f"weighted overall {overall}%. These are fully evidenced acceptance lower bounds, "
            "not estimates of written code.\n\n"
        )
        + (
            "Passing foundations: Next build/typechecks; 273 local PostgreSQL regre"
            "ssions; separate iOS/Android JS bundles; Android native prebuild; loca"
            "l photo, exact artwork, private workspace and Auth contract checks. No"
            "ne establishes native devices, real AI, hosted checkout or live-provid"
            "er completion.\n\n"
        )
        + (
            "Critical blockers: private media lifecycle, real analysis and report p"
            "ersistence, connected try-on/catalog/checkout/orders, operational busi"
            "ness/social/booking/growth workflows, independent native runtime verif"
            "ication and actual deployed release reconciliation. Each appears in CO"
            "MPLETE_FEATURE_MATRIX.csv and DEFECT_REGISTER.csv.\n\n"
        )
        + (
            "The required complete upload → analysis → looks → try-on → local produ"
            "cts → checkout → confirmation journey has zero qualified passes. Missi"
            "ng code cannot be counted as merely credential-blocked.\n\n"
        )
        + (
            "Audit completeness: source inventory and anonymous browser breadth are"
            " measured. Authenticated conditional semantic actions, native controls"
            "/devices, production role matrices, provider latency/load, and rollbac"
            "k remain unverified. The existence of this report does not claim every"
            " control has passed.\n\n"
        )
        + (
            "No production migrations, authentication configuration changes, financ"
            "ial records, live charges, domain switches or public deployments were "
            "performed. Approval of migration0014/exact SQL and public launch remai"
            "ns separate.\n\nSee the four independent platform/parity reports, detail"
            "ed CSV inventories, end-to-end results and FINAL_PUBLIC_RELEASE_CHECKL"
            "IST.md.\n"
        )
    )
    print(json.dumps(summary, default=dict))


if __name__ == "__main__":
    main()
