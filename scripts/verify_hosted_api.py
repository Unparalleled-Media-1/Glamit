"""Controlled real Auth/API regression. No email delivery, provider calls or payments."""

import json
import os
import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx

PROJECT = "bkkmsbxrxkqaveymcrgi"
URL = f"https://{PROJECT}.supabase.co"


def cleanup_organization(report):
    from uuid import UUID

    if not report.get("controlled_organization_id"):
        return
    org = str(UUID(report["controlled_organization_id"]))
    actor = str(UUID(report["controlled_internal_id"]))
    statement = f"""BEGIN;
      DELETE FROM public.idempotency_record WHERE user_id='{actor}'::uuid AND
        ((route='organizations' AND response->>'id'='{org}') OR
         (route='routines' AND key='controlled-routine'));
      DELETE FROM public.organization_members WHERE organization_id='{org}'::uuid
        AND user_id='{actor}'::uuid;
      DELETE FROM public.organizations WHERE id='{org}'::uuid
        AND name='Controlled API regression (not a merchant)';
      COMMIT;"""
    with httpx.Client(
        timeout=30, headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"]}
    ) as c:
        r = c.post(
            f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
            json={"query": statement, "read_only": False},
        )
        report["controlled_organization_cleanup_http_status"] = r.status_code
        if not r.is_success:
            report["status"] = "FAILED"
        report["retained_test_evidence"] = (
            "Minimal internal identities and immutable audits only; "
            "no merchant listings or financial records created."
        )


def verify():
    report = {
        "project_ref": PROJECT,
        "observed_at": datetime.now(UTC).isoformat(),
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

        def check(name, r, expected):
            report["checks"].append(
                {
                    "name": name,
                    "http_status": r.status_code,
                    "expected": expected,
                    "passed": r.status_code == expected,
                }
            )
            if r.status_code != expected:
                # Error codes only, never echo an Auth token, private response or password.
                try:
                    v = r.json()
                    report["last_error_code"] = (
                        v.get("error", {}).get("code")
                        if isinstance(v.get("error"), dict)
                        else v.get("code")
                    )
                except (ValueError, AttributeError):
                    pass
                raise RuntimeError("controlled_check_failed_" + name)
            return r.json()

        def api(method, path, token=None, body=None, key=None):
            headers = dict(public)
            if token:
                headers["Authorization"] = "Bearer " + token
            if key:
                headers["Idempotency-Key"] = key
            return c.request(
                method, URL + "/functions/v1/glam-api" + path, headers=headers, json=body
            )

        try:
            check("public_liveness", api("GET", "/health/live"), 200)
            check("anonymous_profile_denied", api("GET", "/v1/me/profile"), 401)
            sessions = []
            for _ in range(2):
                email = "glam-api-controlled-" + uuid4().hex + "@example.com"
                password = secrets.token_urlsafe(40)
                r = c.post(
                    URL + "/auth/v1/admin/users",
                    headers=admin,
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"controlled_test": "hosted-api-0012"},
                    },
                )
                created = check("controlled_auth_created", r, 200)
                report["controlled_auth_ids"].append(created["id"])
                r = c.post(
                    URL + "/auth/v1/token?grant_type=password",
                    headers=public,
                    json={"email": email, "password": password},
                )
                signed = check("real_auth_login", r, 200)
                sessions.append(signed["access_token"])
            token, other = sessions
            check("authenticated_readiness", api("GET", "/health/ready", token), 200)
            me = check("identity_bootstrap", api("GET", "/v1/me", token), 200)
            report["controlled_internal_id"] = me["id"]
            check(
                "profile_update",
                api(
                    "PATCH", "/v1/me/profile", token, {"display_name": "Controlled API regression"}
                ),
                200,
            )
            profile = check("profile_persisted", api("GET", "/v1/me/profile", token), 200)
            assert profile["display_name"] == "Controlled API regression"
            check(
                "preferences_update",
                api(
                    "PATCH",
                    "/v1/me/preferences",
                    token,
                    {"locale": "en-ZA", "marketing_opt_in": False},
                ),
                200,
            )
            passport = check("passport_read", api("GET", "/v1/me/style-passport", token), 200)
            revised = check(
                "passport_update",
                api(
                    "PATCH",
                    "/v1/me/style-passport",
                    token,
                    {"expected_revision": passport["revision"], "preferred_colors": ["navy"]},
                ),
                200,
            )
            preserved = check(
                "passport_preserves_selection",
                api(
                    "PATCH",
                    "/v1/me/style-passport",
                    token,
                    {"expected_revision": revised["revision"], "preferred_styles": ["formal"]},
                ),
                200,
            )
            assert preserved["preferred_colors"] == ["navy"]
            check(
                "stale_revision_refused",
                api(
                    "PATCH",
                    "/v1/me/style-passport",
                    token,
                    {"expected_revision": passport["revision"], "preferred_colors": []},
                ),
                409,
            )
            org = check(
                "organization_create",
                api(
                    "POST",
                    "/v1/organizations",
                    token,
                    {"name": "Controlled API regression (not a merchant)"},
                    "controlled-create",
                ),
                201,
            )
            report["controlled_organization_id"] = org["id"]
            again = check(
                "idempotent_replay",
                api(
                    "POST",
                    "/v1/organizations",
                    token,
                    {"name": "Controlled API regression (not a merchant)"},
                    "controlled-create",
                ),
                201,
            )
            assert org == again
            check("cross_tenant_denied", api("GET", "/v1/organizations/" + org["id"], other), 404)
            check("owner_read", api("GET", "/v1/organizations/" + org["id"], token), 200)
            check(
                "privilege_override_refused",
                api("PATCH", "/v1/me/profile", token, {"role": "admin"}),
                422,
            )
            check("unsupported_operation_truthful", api("POST", "/v1/analysis", token, {}), 501)
            check(
                "service_role_not_user",
                api("GET", "/v1/me", os.environ["SUPABASE_SERVICE_ROLE_KEY"]),
                401,
            )
            routine_body = {
                "title": "Controlled temporary routine",
                "steps": [{"text": "User-authored test step", "done": False}],
            }
            routine = check(
                "routine_created",
                api("POST", "/v1/me/routines", token, routine_body, "controlled-routine"),
                201,
            )
            report["controlled_routine_id"] = routine["id"]
            replay = check(
                "routine_replay",
                api("POST", "/v1/me/routines", token, routine_body, "controlled-routine"),
                201,
            )
            assert routine == replay
            check(
                "routine_cross_tenant_denied",
                api("DELETE", "/v1/me/routines/" + routine["id"], other),
                404,
            )
            changed = check(
                "routine_updated",
                api(
                    "PUT",
                    "/v1/me/routines/" + routine["id"],
                    token,
                    {**routine_body, "expected_revision": routine["revision"]},
                ),
                200,
            )
            assert changed["revision"] == routine["revision"] + 1
            check(
                "routine_stale_write_refused",
                api(
                    "PUT",
                    "/v1/me/routines/" + routine["id"],
                    token,
                    {**routine_body, "expected_revision": routine["revision"]},
                ),
                409,
            )
            removed = api("DELETE", "/v1/me/routines/" + routine["id"], token)
            report["checks"].append(
                {
                    "name": "routine_deleted",
                    "http_status": removed.status_code,
                    "expected": 204,
                    "passed": removed.status_code == 204,
                }
            )
            assert removed.status_code == 204
            check(
                "deleted_routine_not_replayed",
                api("POST", "/v1/me/routines", token, routine_body, "controlled-routine"),
                410,
            )
            report["status"] = "PASSED"
        except (RuntimeError, AssertionError, httpx.HTTPError):
            report["status"] = "FAILED"
        finally:
            cleanup_organization(report)
            for uid in report["controlled_auth_ids"]:
                r = c.delete(URL + "/auth/v1/admin/users/" + uid, headers=admin)
                report["cleanup"].append({"auth_id": uid, "http_status": r.status_code})
                if not r.is_success:
                    report["status"] = "FAILED"
    Path("docs/database/evidence/hosted-api/live-regression.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report))
    if report["status"] != "PASSED":
        raise SystemExit(2)


if __name__ == "__main__":
    verify()
