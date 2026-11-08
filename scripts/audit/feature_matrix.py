"Render curated requirement traceability; source presence never promotes readiness."

import ast
import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/audit"
STATUSES = {
    "VERIFIED COMPLETE",
    "PARTIALLY IMPLEMENTED",
    "MISSING",
    "BROKEN",
    "PLACEHOLDER",
    "BLOCKED BY CREDENTIALS",
    "BLOCKED BY PLATFORM APPROVAL",
    "BLOCKED BY DEPLOYMENT ACCESS",
    "NOT TESTED",
    "APPROVED FOR LATER PHASE",
}


def source_ref(name):
    p = ROOT / name
    if not p.is_file():
        raise ValueError("Missing evidence source: " + name)
    lines = p.read_text().splitlines()
    first = next(
        (
            i
            for i, line in enumerate(lines, 1)
            if re.search(
                "export (default |async )?(function|class)|^class |^def "
                "|^CREATE (OR REPLACE )?(TABLE|FUNCTION)|^const "
                "(config|handler)",
                line,
            )
        ),
        1,
    )
    return f"{name}:{first}"


def main():
    source = json.loads((OUT / "requirements.json").read_text())
    production = json.loads((OUT / "evidence/production-catalog.json").read_text())
    remote = json.loads((OUT / "evidence/remote-readiness.json").read_text())
    git_state = json.loads((OUT / "evidence/git-state.json").read_text())
    actual_tables = {t["tablename"] for t in production["tables"]}
    deployed = json.loads((OUT / "evidence/railway-ci-receipt.json").read_text())
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    rows, hashes, endpoints = [], {}, []
    for file in (ROOT / "services/api/src/glam_api").rglob("*.py"):
        tree = ast.parse(file.read_text())
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if (
                    isinstance(dec, ast.Call)
                    and isinstance(dec.func, ast.Attribute)
                    and dec.func.attr in {"get", "post", "put", "patch", "delete"}
                    and dec.args
                    and isinstance(dec.args[0], ast.Constant)
                ):
                    endpoints.append(
                        {
                            "method": dec.func.attr.upper(),
                            "path": dec.args[0].value,
                            "source": f"{file.relative_to(ROOT)}:{node.lineno}",
                            "function": node.name,
                        }
                    )
    for feature in source["features"]:
        p = source["profiles"][feature["profile"]]
        if feature["status"] not in STATUSES:
            raise ValueError("Unknown feature status")
        if feature["status"] == "VERIFIED COMPLETE":
            raise ValueError("No feature currently has all six verified operational layers")
        files = list(p["files"])
        if feature["requirement"] == "Guest exploration":
            files += ["apps/web/components/GlamApp.tsx", "apps/mobile/App.tsx"]
        if feature["requirement"] == "Native Face ID/Touch ID/Android biometric unlock":
            files += ["apps/mobile/auth/secure-session.ts"]
        for file in files + p["tests"]:
            if not (ROOT / file).is_file():
                raise ValueError("Missing source/test: " + file)
            hashes[file] = hashlib.sha256((ROOT / file).read_bytes()).hexdigest()
        missing = feature["status"] == "MISSING"
        placeholder = feature["status"] == "PLACEHOLDER"
        found = sorted(
            name
            for name in actual_tables
            if re.search(r"\b" + re.escape(name) + r"\b", p["tables"])
        )
        local = (
            "Related tests/guards exist; current isolated260 PostgreSQL "
            "passes; not feature acceptance or provider proof"
        )
        if missing or placeholder:
            local = (
                "No completed feature acceptance; related guard/draft tests "
                "do not implement this operation"
            )
        row = {
            "feature_id": feature["id"],
            "module": feature.get("module", p["module"]),
            "audit_area": p["group"],
            "approved_requirement": feature["requirement"],
            "approved_source": "docs/specification/sources/2026-11-product-completeness-dire"
            "ctive.txt (PartsA-N) and referenced approved repository "
            "specifications",
            "priority": feature["priority"],
            "intended_platforms": feature.get(
                "platforms",
                "web;iOS;Android;backend"
                if feature["profile"] != "platform"
                else "web;iOS;Android;admin;backend",
            ),
            "expected_user_journey": feature["requirement"]
            + ": authenticated/eligible input where needed → real "
            "operation → persisted result → reopen → failure/recovery",
            "actual_web_route": p["web"]
            if not missing
            else "NO IMPLEMENTED FEATURE ROUTE; nearest planning context: " + p["web"],
            "actual_native_screen": p["native"]
            if not missing
            else "NO IMPLEMENTED FEATURE SCREEN; nearest planning context: " + p["native"],
            "component_and_source": "; ".join(source_ref(f) for f in files),
            "source_scope": "Inspected surrounding context only; no completed "
            "feature implementation"
            if missing
            else "UI/contract or metadata only"
            if placeholder
            else "Partial layer evidence; no complete operational chain",
            "api_endpoint_or_service": "NONE for this feature; see evidence/api-inventory.json"
            if missing
            else p["api"],
            "database_tables_and_migrations": p["tables"] + " | " + p["migrations"],
            "actual_production_table_presence": "; ".join(found)
            or "NONE of mapped domain tables; candidate/sandbox only",
            "storage_buckets": "NONE: production Storage inventory returned0 buckets; no "
            "binary upload/access test",
            "external_provider_dependency": p["provider"],
            "environment_secret_names_only": p["secrets"],
            "existing_test_files": "; ".join(p["tests"]),
            "git_commit_or_pr_evidence": commit
            + "; default "
            + git_state["default_branch"]["sha"]
            + "; PR27 merged; PR28 photo repair separate/unmerged",
            "local_test_result": local,
            "deployed_test_result": "NOT VERIFIED FEATURE; CI served "
            + str(deployed["deployed_commit"])
            + ";78 HTTP route/viewport responses; readiness503;0/31 critical journeys",
            "real_device_test_result": "NOT TESTED: no signed iOS/Android build or "
            "physical-device evidence",
            "security_verification_result": "Catalog RLS/grants inspected; local "
            "isolation tests. No "
            "feature-specific production role/retention acceptance",
            "defect_id": "F-" + feature["id"],
            "implementation_status": feature["status"],
            "remaining_blockers": feature["blocker"],
            "responsible_remediation_step": "P0 foundations/configuration → P1 authenticated "
            "media/AI/catalog/checkout → P2 specialist/creator/growth. " + feature["blocker"],
            "implementation_evidence_and_limits": p["note"],
            "deferral_approval": "NONE; optional priority is a proposal, "
            "not approved scope reduction",
            "verification_layers": "UI/backend/schema/provider/E2E/deployed/device must be "
            "individually qualified; no overall completion inferred",
        }
        if "iOS" not in row["intended_platforms"] and "Android" not in row["intended_platforms"]:
            row["actual_native_screen"] = "NOT APPLICABLE: backend/admin requirement"
            row["real_device_test_result"] = (
                "Not a native-screen requirement; dependent consumer device "
                "journeys remain unverified"
            )
        if feature["requirement"] == "Style Passport saved user-approved results":
            row["actual_web_route"] = (
                "No dedicated saved-result Passport UI; profile/result context only"
            )
            row["actual_native_screen"] = (
                "No dedicated saved-result Passport screen; preference context"
            )
        if feature["requirement"] == "Guest exploration":
            row["api_endpoint_or_service"] = (
                "No authentication API required for local guest navigation"
            )
        auth_secrets = {
            "SMS OTP signup/login": "sms_twilio_account_sid; sms_twilio_auth_token; "
            "sms_twilio_message_service_sid",
            "Google OAuth login": "external_google_client_id; external_google_secret",
            "Apple OAuth login": "external_apple_client_id; external_apple_secret",
            "Facebook OAuth login": "external_facebook_client_id; external_facebook_secret",
        }
        if feature["requirement"] in auth_secrets:
            row["environment_secret_names_only"] = auth_secrets[feature["requirement"]]
        if feature["requirement"] == "Guest exploration":
            row["external_provider_dependency"] = "NONE for local guest exploration"
            row["environment_secret_names_only"] = "NONE for local guest exploration"
        if feature.get("requirement_source"):
            row["approved_source"] = feature["requirement_source"]
        row["evidence_artifacts"] = (
            "docs/audit/evidence/validation.json; "
            "docs/audit/evidence/railway-ci-receipt.json; "
            "workflow42452036311 screenshots/trace (route evidence only)"
        )
        rows.append(row)
    if len({r["feature_id"] for r in rows}) != len(rows):
        raise ValueError("Duplicate feature IDs")
    with (OUT / "GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    for file in [
        "scripts/check-browser-auth-config.mjs",
        "deploy/railway/web.Dockerfile",
        "tests/client/production-web-config.test.mjs",
    ]:
        hashes[file] = hashlib.sha256((ROOT / file).read_bytes()).hexdigest()
    counts = Counter(r["implementation_status"] for r in rows)
    summary = {
        "observed_at": datetime.now(UTC).isoformat(),
        "source_commit": commit,
        "methodology": source["methodology"],
        "total_atomic_requirements": len(rows),
        "status_counts": dict(counts),
        "fully_verified": counts["VERIFIED COMPLETE"],
        "operationally_verified_percent": round(100 * counts["VERIFIED COMPLETE"] / len(rows), 2),
        "priorities": dict(Counter(r["priority"] for r in rows)),
        "areas": dict(Counter(r["audit_area"] for r in rows)),
        "production_schema_revision": production["revision"],
        "production_tables": len(actual_tables),
        "source_hashes": hashes,
        "remote_observed_at": remote["observed_at"],
        "deployed_receipt_observed_at": deployed["observed_at"],
        "release_decision": "NO-GO",
    }
    (OUT / "evidence/feature-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    (OUT / "evidence/api-inventory.json").write_text(json.dumps(endpoints, indent=2) + "\n")
    print(
        json.dumps(
            {
                "total": len(rows),
                "statuses": dict(counts),
                "operational_percent": summary["operationally_verified_percent"],
            }
        )
    )


if __name__ == "__main__":
    main()
