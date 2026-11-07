"""Read-only remote launch evidence; never deploys, sends messages or moves money."""

import json
import os
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx

PROJECT = "bkkmsbxrxkqaveymcrgi"
OUT = Path("docs/launch/evidence")


def main():
    result = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project_ref": PROJECT,
        "scope": "Read-only API/catalog metadata; no transactions or notifications",
    }
    names = [
        "OPENAI_API_KEY",
        "REPLICATE_API_TOKEN",
        "FASHN_API_KEY",
        "GOOGLE_MAPS_API_KEY",
        "RESEND_API_KEY",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "SENTRY_DSN",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "GLAM_CPANEL_USER",
        "GLAM_CPANEL_API_TOKEN",
    ]
    result["environment_presence"] = {name: bool(os.environ.get(name)) for name in names}
    with httpx.Client(timeout=30, follow_redirects=False) as client:
        token = os.environ.get("SUPABASE_ACCESS_TOKEN")
        if token:
            base = f"https://api.supabase.com/v1/projects/{PROJECT}"
            headers = {"Authorization": "Bearer " + token}

            def management(method, suffix, **kwargs):
                r = client.request(method, base + suffix, headers=headers, **kwargs)
                if not r.is_success:
                    raise RuntimeError("management_http_" + str(r.status_code))
                return r.json()

            metadata = management("GET", "")
            result["target"] = {
                "id": metadata.get("id"),
                "status": metadata.get("status"),
                "database_host": metadata.get("database", {}).get("host"),
            }
            result["branch_inventory"] = [
                {k: b.get(k) for k in ("id", "name", "is_default", "project_ref")}
                for b in management("GET", "/branches")
            ]
            auth = management("GET", "/config/auth")
            result["auth"] = {
                k: auth.get(k)
                for k in (
                    "site_url",
                    "uri_allow_list",
                    "external_phone_enabled",
                    "external_google_enabled",
                    "external_apple_enabled",
                    "external_facebook_enabled",
                    "sms_max_frequency",
                    "sms_otp_exp",
                    "sms_otp_length",
                    "captcha_enabled",
                )
            }
            result["provider_credential_presence"] = {
                k: bool(auth.get(k))
                for k in (
                    "sms_twilio_account_sid",
                    "sms_twilio_auth_token",
                    "sms_twilio_message_service_sid",
                    "external_google_client_id",
                    "external_google_secret",
                    "external_apple_client_id",
                    "external_apple_secret",
                    "external_facebook_client_id",
                    "external_facebook_secret",
                )
            }
            backups = management("GET", "/database/backups").get("backups", [])
            result["backups"] = [
                {k: b.get(k) for k in ("id", "inserted_at", "status", "is_physical_backup")}
                for b in backups[-5:]
            ]
            sql = """SELECT (SELECT version_num FROM public.alembic_version) AS revision,
              (SELECT count(*) FROM pg_tables WHERE schemaname='public') AS public_tables,
              (SELECT count(*) FROM pg_tables WHERE schemaname='public'
                 AND NOT rowsecurity) AS tables_without_rls,
              (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes,
              (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
              (SELECT count(*) FROM pg_constraint k JOIN pg_namespace n ON k.connamespace=n.oid
                 WHERE n.nspname='public' AND k.contype='f') AS foreign_keys,
              (SELECT count(*) FROM pg_constraint k JOIN pg_namespace n ON k.connamespace=n.oid
                 WHERE n.nspname='public' AND k.contype='f'
                 AND NOT k.convalidated) AS unvalidated_foreign_keys"""
            started = time.monotonic()
            result["catalog"] = management(
                "POST", "/database/query", json={"query": sql, "read_only": True}
            )
            result["catalog_roundtrip_ms"] = round((time.monotonic() - started) * 1000)
            result["index_plan"] = management(
                "POST",
                "/database/query",
                json={
                    "query": (
                        "EXPLAIN (FORMAT JSON) SELECT id FROM public.profiles "
                        "WHERE id='00000000-0000-0000-0000-000000000000'::uuid"
                    ),
                    "read_only": True,
                },
            )
        public = os.environ.get("SUPABASE_ANON_KEY")
        if public:
            base = f"https://{PROJECT}.supabase.co/functions/v1/glam-api"
            result["http"] = []
            for endpoint, expected in (("/health/live", 200), ("/v1/me/profile", 401)):
                started = time.monotonic()
                response = client.get(base + endpoint, headers={"apikey": public})
                result["http"].append(
                    {
                        "path": endpoint,
                        "status": response.status_code,
                        "expected": expected,
                        "passed": response.status_code == expected,
                        "roundtrip_ms": round((time.monotonic() - started) * 1000),
                    }
                )
        service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if service:
            r = client.get(
                f"https://{PROJECT}.supabase.co/storage/v1/bucket",
                headers={"apikey": service, "Authorization": "Bearer " + service},
            )
            result["storage"] = {"http_status": r.status_code}
            if r.is_success:
                result["storage"].update(
                    bucket_count=len(r.json()),
                    public_bucket_count=sum(b.get("public") is True for b in r.json()),
                    private_upload_workflow="NOT VERIFIED; no image uploaded",
                )
        stripe = os.environ.get("STRIPE_SECRET_KEY")
        if stripe:
            r = client.get(
                "https://api.stripe.com/v1/balance", headers={"Authorization": "Bearer " + stripe}
            )
            mode = r.json().get("livemode") if r.is_success else None
            result["stripe"] = {
                "http_status": r.status_code,
                "livemode": mode,
                "status": "BLOCKED_LIVE_MODE"
                if mode is True
                else "TEST_CONNECTIVITY_ONLY"
                if mode is False
                else "BLOCKED_UNVERIFIED",
                "financial_mutations": 0,
                "actual_payment_ids": [],
                "actual_transfer_ids": [],
                "commission_reconciliation": "NOT EXECUTED",
            }
    result["devices"] = {
        tool: subprocess.run(["bash", "-c", "command -v " + tool], capture_output=True).returncode
        == 0
        for tool in ("adb", "xcrun", "maestro")
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "remote-readiness.json").write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {
                "report": str(OUT / "remote-readiness.json"),
                "stripe": result.get("stripe"),
                "auth_providers_enabled": {
                    k: v for k, v in result.get("auth", {}).items() if k.endswith("_enabled")
                },
            }
        )
    )


if __name__ == "__main__":
    main()
