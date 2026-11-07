"""Real Supabase session/RLS checks with designated disposable users; never SMS delivery proof."""

import json
import os
import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx

URL = "https://bkkmsbxrxkqaveymcrgi.supabase.co"


def verify():
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project_ref": "bkkmsbxrxkqaveymcrgi",
        "method": "controlled email/password Auth sessions; no messages sent",
        "sms_test": "BLOCKED_PROVIDER_NOT_CONFIGURED",
        "oauth_test": "BLOCKED_PROVIDERS_NOT_CONFIGURED",
        "native_biometric_test": "BLOCKED_REAL_DEVICE_VALIDATION",
        "checks": [],
        "controlled_auth_ids": [],
        "cleanup": [],
    }
    admin = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": "Bearer " + os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    }
    public = {"apikey": os.environ["SUPABASE_ANON_KEY"]}
    with httpx.Client(timeout=30, follow_redirects=False) as c:

        def check(name, result, expected):
            report["checks"].append(
                {
                    "name": name,
                    "http_status": result.status_code,
                    "expected": expected,
                    "passed": result.status_code == expected,
                }
            )
            if result.status_code != expected:
                raise RuntimeError("check_failed_" + name)
            return None if result.status_code == 204 else result.json()

        def api(method, path, token, body=None):
            return c.request(
                method,
                URL + "/functions/v1/glam-api" + path,
                headers={**public, "Authorization": "Bearer " + token},
                json=body,
            )

        def signin(email, password):
            return check(
                "controlled_login",
                c.post(
                    URL + "/auth/v1/token?grant_type=password",
                    headers=public,
                    json={"email": email, "password": password},
                ),
                200,
            )["access_token"]

        try:
            identities = []
            for _ in range(2):
                email = "glam-auth-control-" + uuid4().hex + "@example.com"
                password = secrets.token_urlsafe(40)
                user = check(
                    "controlled_user_created",
                    c.post(
                        URL + "/auth/v1/admin/users",
                        headers=admin,
                        json={
                            "email": email,
                            "password": password,
                            "email_confirm": True,
                            "user_metadata": {"controlled_test": "auth-0013-session-regression"},
                        },
                    ),
                    200,
                )
                report["controlled_auth_ids"].append(user["id"])
                identities.append((email, password))
            first = signin(*identities[0])
            second = signin(*identities[0])
            other = signin(*identities[1])
            profile = check("profile_provisioned", api("GET", "/v1/me/profile", first), 200)
            assert profile["id"] == report["controlled_auth_ids"][0]
            again = check(
                "profile_provisioning_idempotent", api("GET", "/v1/me/profile", second), 200
            )
            assert again["id"] == profile["id"]
            prefs = check(
                "notifications_default_private", api("GET", "/v1/me/notifications", first), 200
            )
            assert not any(prefs[k] for k in ["sms_updates", "email_updates", "push_updates"])
            changed = check(
                "notification_preference_saved",
                api(
                    "PATCH",
                    "/v1/me/notifications",
                    first,
                    {"expected_revision": prefs["revision"], "sms_updates": True},
                ),
                200,
            )
            assert changed["sms_updates"] is True and changed["email_updates"] is False
            device = str(uuid4())
            check(
                "device_metadata_only_upsert",
                api(
                    "PUT",
                    "/v1/me/devices/" + device,
                    first,
                    {"platform": "ios", "biometric_enabled": True},
                ),
                200,
            )
            check(
                "device_secret_field_rejected",
                api(
                    "PUT",
                    "/v1/me/devices/" + device,
                    first,
                    {
                        "platform": "ios",
                        "biometric_enabled": True,
                        "refresh_token": "NOT_A_REAL_TOKEN",
                    },
                ),
                422,
            )
            assert check("cross_user_devices_empty", api("GET", "/v1/me/devices", other), 200) == []
            result = c.get(
                URL + "/rest/v1/profiles",
                params={"id": "eq." + profile["id"]},
                headers={**public, "Authorization": "Bearer " + other},
            )
            assert check("cross_user_profile_rls_denied", result, 200) == []
            check(
                "current_session_logout",
                c.post(
                    URL + "/auth/v1/logout?scope=local",
                    headers={**public, "Authorization": "Bearer " + first},
                ),
                204,
            )
            check("revoked_jwt_rpc_denied", api("GET", "/v1/me/profile", first), 401)
            check(
                "other_session_same_user_remains_valid", api("GET", "/v1/me/profile", second), 200
            )
            result = c.get(
                URL + "/rest/v1/profiles", headers={**public, "Authorization": "Bearer " + first}
            )
            assert result.status_code in [200, 401, 403]
            if result.status_code == 200:
                assert result.json() == []
            report["checks"].append(
                {
                    "name": "revoked_jwt_direct_data_api_denied",
                    "http_status": result.status_code,
                    "passed": True,
                }
            )
            check(
                "all_sessions_logout",
                c.post(
                    URL + "/auth/v1/logout?scope=global",
                    headers={**public, "Authorization": "Bearer " + second},
                ),
                204,
            )
            check("global_revocation_denied", api("GET", "/v1/me/profile", second), 401)
            check("unrelated_user_remains_valid", api("GET", "/v1/me/profile", other), 200)
            report["status"] = "PASSED_SESSION_CORE_ONLY"
        except (RuntimeError, AssertionError, httpx.HTTPError):
            report["status"] = "FAILED"
        finally:
            for uid in report["controlled_auth_ids"]:
                r = c.delete(URL + "/auth/v1/admin/users/" + uid, headers=admin)
                report["cleanup"].append({"id": uid, "http_status": r.status_code})
                if not r.is_success:
                    report["status"] = "FAILED"
    Path("docs/authentication/evidence/live-session-regression.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))
    if report["status"] == "FAILED":
        raise SystemExit(2)


if __name__ == "__main__":
    verify()
