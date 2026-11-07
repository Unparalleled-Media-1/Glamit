"""Two simulated clients share real PostgreSQL records, not actual native-device evidence."""

import json
from uuid import uuid4

from sqlalchemy import text
from test_hosted_api import rpc
from test_supabase_foundation import ISSUER, as_user
from test_supabase_foundation import foundation as foundation


def test_same_identity_separate_sessions_share_data_while_other_identity_is_isolated(
    db, foundation
):
    owner, outsider = foundation
    second = uuid4()
    with db.begin() as c:
        c.execute(
            text("INSERT INTO auth.sessions(id,user_id) VALUES(:s,:u)"),
            {"s": second, "u": owner["uid"]},
        )
        as_user(c, owner["uid"])
        routine = rpc(
            c,
            "POST",
            "/v1/me/routines",
            {
                "title": "Cross-session fixture",
                "steps": [{"text": "Use my saved look", "done": False}],
            },
            str(uuid4()),
        )
    with db.begin() as c:
        as_user(c, owner["uid"])
        c.execute(
            text("SELECT set_config('request.jwt.claims',:claims,true)"),
            {
                "claims": json.dumps(
                    {
                        "iss": ISSUER,
                        "sub": str(owner["uid"]),
                        "session_id": str(second),
                        "role": "authenticated",
                    }
                )
            },
        )
        assert rpc(c, "GET", "/v1/me/profile")["id"] == str(owner["uid"])
        assert rpc(c, "GET", "/v1/me/routines")[0]["id"] == routine["id"]
        rpc(c, "DELETE", "/v1/me/routines/" + routine["id"])
    with db.begin() as c:
        as_user(c, owner["uid"])
        assert rpc(c, "GET", "/v1/me/routines") == []
    with db.begin() as c:
        as_user(c, outsider["uid"])
        assert rpc(c, "GET", "/v1/me/routines") == []
