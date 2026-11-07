"""Read-only verification restricted to this audit's temporary identities and records."""

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import httpx


def main():
    folder = Path("docs/launch/evidence")
    core = json.loads((folder / "live-core-regression.json").read_text())
    session = json.loads((folder / "live-session-regression.json").read_text())
    ids = [str(UUID(v)) for v in core["controlled_auth_ids"] + session["controlled_auth_ids"]]
    values = ",".join("'" + v + "'" for v in ids)
    org, routine = (
        str(UUID(core[k])) for k in ["controlled_organization_id", "controlled_routine_id"]
    )
    sql = f"""SELECT
      (SELECT count(*) FROM auth.users WHERE id IN ({values})) AS auth_remaining,
      (SELECT count(*) FROM profiles WHERE id IN ({values})) AS profiles_remaining,
      (SELECT count(*) FROM notification_preferences WHERE profile_id IN ({values}))
        AS notifications_remaining,
      (SELECT count(*) FROM device_auth_preferences WHERE profile_id IN ({values}))
        AS devices_remaining,
      (SELECT count(*) FROM organizations WHERE id='{org}'::uuid) AS organizations_remaining,
      (SELECT count(*) FROM personal_routine WHERE id='{routine}'::uuid) AS routines_remaining,
      (SELECT count(*) FROM app_user WHERE subject IN ({values})) AS identities_retained,
      (SELECT count(*) FROM credit_account WHERE user_id IN
        (SELECT id FROM app_user WHERE subject IN ({values}))) AS bootstrap_accounts_retained,
      (SELECT count(*) FROM credit_journal WHERE user_id IN
        (SELECT id FROM app_user WHERE subject IN ({values}))) AS credit_journals,
      (SELECT count(*) FROM credit_posting WHERE user_id IN
        (SELECT id FROM app_user WHERE subject IN ({values}))) AS credit_postings"""
    with httpx.Client(
        timeout=30, headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"]}
    ) as client:
        response = client.post(
            "https://api.supabase.com/v1/projects/bkkmsbxrxkqaveymcrgi/database/query",
            json={"query": sql, "read_only": True},
        )
        if not response.is_success:
            raise RuntimeError("cleanup_http_" + str(response.status_code))
        counts = response.json()[0]
    result = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project_ref": "bkkmsbxrxkqaveymcrgi",
        "read_only": True,
        "counts": counts,
        "status": "PASSED"
        if all(v == 0 for k, v in counts.items() if not k.endswith("retained"))
        else "FAILED",
        "retention_note": "Existing bootstrap retains internal references, zero-balance "
        "credit accounts and immutable audits. No credit/payment transactions.",
    }
    (folder / "controlled-cleanup.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
    if result["status"] != "PASSED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
