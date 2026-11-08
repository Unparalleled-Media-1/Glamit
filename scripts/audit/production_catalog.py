"Read-only Supabase catalog evidence: no user rows, DDL, uploads or auth mutations."

import json
import os
from datetime import UTC, datetime
from pathlib import Path

import httpx

PROJECT = "bkkmsbxrxkqaveymcrgi"
QUERIES = {
    "tables": "SELECT schemaname,tablename,rowsecurity FROM pg_tables "
    "WHERE schemaname='public' ORDER BY tablename",
    "columns": "SELECT table_name,column_name,data_type,is_nullable FROM "
    "information_schema.columns WHERE table_schema='public' "
    "ORDER BY table_name,ordinal_position",
    "indexes": "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE "
    "schemaname='public' ORDER BY tablename,indexname",
    "constraints": "SELECT c.relname AS "
    "table_name,k.conname,k.contype,k.convalidated,pg_get_constra"
    "intdef(k.oid) AS definition FROM pg_constraint k JOIN "
    "pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON "
    "n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY "
    "c.relname,k.conname",
    "policies": "SELECT "
    "schemaname,tablename,policyname,roles,cmd,qual,with_check "
    "FROM pg_policies WHERE schemaname IN ('public','storage') "
    "ORDER BY schemaname,tablename,policyname",
    "grants": "SELECT table_name,grantee,privilege_type FROM "
    "information_schema.role_table_grants WHERE "
    "table_schema='public' AND grantee IN "
    "('anon','authenticated','service_role') ORDER BY "
    "table_name,grantee,privilege_type",
    "functions": "SELECT n.nspname AS "
    "schema,p.proname,pg_get_function_identity_arguments(p.oid) "
    "AS arguments,p.prosecdef AS security_definer,p.proconfig AS "
    "configuration FROM pg_proc p JOIN pg_namespace n ON "
    "n.oid=p.pronamespace WHERE n.nspname IN "
    "('public','glam_private','creator_private') ORDER BY "
    "n.nspname,p.proname",
    "revision": "SELECT version_num FROM public.alembic_version",
}


def main():
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("SUPABASE_MANAGEMENT_TOKEN_NOT_CONFIGURED")
    base = f"https://api.supabase.com/v1/projects/{PROJECT}"
    headers = {"Authorization": "Bearer " + token}
    result = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project_ref": PROJECT,
        "scope": "Read-only system catalog metadata, no application user records",
    }
    with httpx.Client(timeout=30, follow_redirects=False) as client:
        metadata = client.get(base, headers=headers)
        metadata.raise_for_status()
        target = metadata.json()
        if (
            target.get("id") != PROJECT
            or target.get("database", {}).get("host") != f"db.{PROJECT}.supabase.co"
        ):
            raise RuntimeError("SUPABASE_TARGET_MISMATCH")
        result["target_status"] = target.get("status")
        for name, sql in QUERIES.items():
            response = client.post(
                base + "/database/query", headers=headers, json={"query": sql, "read_only": True}
            )
            if not response.is_success:
                raise RuntimeError("READ_ONLY_CATALOG_QUERY_FAILED_" + name)
            result[name] = response.json()
    out = Path("docs/audit/evidence/production-catalog.json")
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {
                "tables": len(result["tables"]),
                "policies": len(result["policies"]),
                "revision": result["revision"],
                "report": str(out),
            }
        )
    )


if __name__ == "__main__":
    main()
