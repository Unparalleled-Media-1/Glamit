"""One-shot, recovery-gated deployment of canonical application0014–0017.

Never retry an unknown write outcome. --verify performs catalog reads only.
Management credentials are never application database credentials.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path

import httpx

_spec = importlib.util.spec_from_file_location(
    "foundation_deploy", Path(__file__).with_name("deploy_application_foundation.py")
)
_foundation = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_foundation)
PROJECT = _foundation.PROJECT
validate_backup = _foundation.validate_backup

START = "0013_passwordless_accounts"
TARGET = "0017_analysis_passport"
ARTIFACT = Path("db/migrations/releases/0017_application.sql")
SOURCES = [
    Path(f"db/migrations/versions/{name}.sql")
    for name in ("0014_creator_studio", "0015_private_media", "0016_analysis_jobs", TARGET)
]
TABLES = sorted(re.findall(r"CREATE TABLE (\w+\.\w+)", "\n".join(p.read_text() for p in SOURCES)))


def load_release():
    manifest = json.loads(ARTIFACT.with_suffix(".manifest.json").read_text())
    if manifest["starting_revision"] != START or manifest["revision"] != TARGET:
        raise RuntimeError("unexpected_release_range")
    if hashlib.sha256(ARTIFACT.read_bytes()).hexdigest() != manifest["sha256"]:
        raise RuntimeError("release_checksum_mismatch")
    for name, checksum in manifest["canonical_sources"].items():
        if hashlib.sha256(Path(name).read_bytes()).hexdigest() != checksum:
            raise RuntimeError("canonical_source_drift")
    return ARTIFACT.read_text(), manifest


def validate_target(project, branches):
    if project.get("id") != PROJECT or project.get("status") != "ACTIVE_HEALTHY":
        raise RuntimeError("original_healthy_project_required")
    host = project.get("database", {}).get("host")
    if host != f"db.{PROJECT}.supabase.co":
        raise RuntimeError("original_database_host_required")
    # Supabase returns [] when branching is disabled; never recreate a branch.
    if branches and not any(
        b.get("project_ref") == PROJECT
        and b.get("parent_project_ref") == PROJECT
        and b.get("is_default") is True
        and b.get("name") == "main"
        for b in branches
    ):
        raise RuntimeError("unexpected_branch_inventory")


def validate_start(snapshot):
    if snapshot["revisions"] != [START]:
        raise RuntimeError("unexpected_starting_revision_verify_before_retry")
    if snapshot["tables"] or snapshot["bucket"] or snapshot["storage_policy"]:
        raise RuntimeError("partial_schema_requires_explicit_reconciliation")


def catalog_sql():
    names = ",".join("'" + name + "'" for name in TABLES)
    return f"""SELECT jsonb_build_object(
      'revisions',(SELECT jsonb_agg(version_num ORDER BY version_num) FROM public.alembic_version),
      'public_tables',(SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_tables
        WHERE schemaname='public'),
      'tables',coalesce((SELECT jsonb_agg(jsonb_build_object(
        'name',n.nspname||'.'||c.relname,'rls',c.relrowsecurity,
        'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
        'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
        'anon_write',has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE'),
        'authenticated_write',has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE')
      ) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname||'.'||c.relname IN ({names}) AND c.relkind='r'),'[]'::jsonb),
      'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('table',table_schema||'.'||table_name,
        'column',column_name,'type',udt_name,'nullable',is_nullable,'default',column_default)
        ORDER BY table_schema,table_name,ordinal_position) FROM information_schema.columns
        WHERE table_schema||'.'||table_name IN ({names})),'[]'::jsonb),
      'constraints',coalesce((SELECT jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,
        'name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated)
        ORDER BY conrelid::regclass::text,conname) FROM pg_constraint
        WHERE conrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY[{names}]) x)),'[]'::jsonb),
      'indexes',coalesce((SELECT jsonb_agg(jsonb_build_object('table',schemaname||'.'||tablename,
        'name',indexname,'definition',indexdef) ORDER BY schemaname,tablename,indexname)
        FROM pg_indexes WHERE schemaname||'.'||tablename IN ({names})),'[]'::jsonb),
      'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('table',schemaname||'.'||tablename,
        'name',policyname,'kind',permissive,'roles',roles,'cmd',cmd,'using',qual,'check',with_check)
        ORDER BY schemaname,tablename,policyname) FROM pg_policies
        WHERE schemaname||'.'||tablename IN ({names})),'[]'::jsonb),
      'triggers',coalesce((SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,
        'name',tgname,'definition',pg_get_triggerdef(oid),'enabled',tgenabled)
        ORDER BY tgrelid::regclass::text,tgname) FROM pg_trigger
        WHERE NOT tgisinternal AND tgrelid IN
        (SELECT to_regclass(x) FROM unnest(ARRAY[{names}]) x)),'[]'::jsonb),
      'functions',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,
        'definition',pg_get_functiondef(p.oid)) ORDER BY n.nspname,p.proname)
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE
        (n.nspname='public' AND p.proname IN
          ('guard_analysis_correction','guard_analysis_passport_owner','glam_api_v1'))
        OR (n.nspname='glam_private' AND p.proname IN
          ('creator_access','creator_append_only','creator_url'))),'[]'::jsonb),
      'bucket',(SELECT jsonb_build_object('id',id,'name',name,'public',public,
        'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)
        FROM storage.buckets WHERE id='glam-private-media'),
      'storage_policy',(SELECT jsonb_build_object('kind',permissive,'roles',roles,'cmd',cmd,
        'using',qual,'check',with_check) FROM pg_policies WHERE schemaname='storage'
        AND tablename='objects' AND policyname='glam_private_media_server_only')
    ) AS snapshot"""


def validate_final(actual, reference):
    if actual["revisions"] != [TARGET]:
        raise RuntimeError("final_history_mismatch")
    if [t["name"] for t in actual["tables"]] != TABLES:
        raise RuntimeError("required_tables_missing")
    for field in [
        "columns",
        "constraints",
        "indexes",
        "policies",
        "triggers",
        "functions",
        "bucket",
        "storage_policy",
    ]:
        if actual[field] != reference[field]:
            raise RuntimeError("catalog_mismatch_" + field)
    for table in actual["tables"]:
        if (
            not table["rls"]
            or table["anon_select"]
            or table["anon_write"]
            or table["authenticated_write"]
        ):
            raise RuntimeError("unsafe_table_privileges")
        if (
            table["name"]
            in {
                "public.private_media",
                "public.analysis_job",
                "public.analysis_correction",
                "public.style_passport_analysis",
                "creator_private.social_credentials",
            }
            and table["authenticated_select"]
        ):
            raise RuntimeError("private_table_exposed")


def guarded_sql(sql):
    guard = """
SELECT pg_advisory_xact_lock(hashtextextended('glam_application_migrations',0));
LOCK TABLE public.alembic_version IN EXCLUSIVE MODE;
DO $$ BEGIN
  IF (SELECT array_agg(version_num ORDER BY version_num) FROM public.alembic_version)
     IS DISTINCT FROM ARRAY['0013_passwordless_accounts']::varchar[] THEN
    RAISE EXCEPTION 'Starting migration changed; verify before retry';
  END IF;
END $$;
"""
    marker = "SET LOCAL statement_timeout='60s';"
    if sql.count(marker) != 1 or not sql.endswith("COMMIT;\n"):
        raise RuntimeError("unexpected_transaction_envelope")
    return sql.replace(marker, marker + guard, 1)


def deploy(validation_file, report_file, apply=False, production_approved=False):
    sql, manifest = load_release()
    validation = json.loads(Path(validation_file).read_text())
    if (
        validation.get("release_sha256") != manifest["sha256"]
        or validation.get("exact_replay") != "PASS"
    ):
        raise RuntimeError("exact_local_replay_required")
    if apply and not production_approved:
        raise RuntimeError("production_authorization_required")
    report = {
        "project_ref": PROJECT,
        "branch": "main (PRODUCTION)",
        "observed_at": datetime.now(UTC).isoformat(),
        "release_sha256": manifest["sha256"],
        "production_modified": False,
        "write_attempted": False,
    }

    def save():
        Path(report_file).write_text(json.dumps(report, indent=2) + "\n")

    with httpx.Client(
        headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"]},
        timeout=90,
        follow_redirects=False,
    ) as client:
        base = f"https://api.supabase.com/v1/projects/{PROJECT}"

        def get(path):
            r = client.get(base + path)
            if not r.is_success:
                raise RuntimeError("metadata_rejected_http_" + str(r.status_code))
            return r.json()

        def query(statement, readonly=True):
            r = client.post(
                base + "/database/query", json={"query": statement, "read_only": readonly}
            )
            if not r.is_success:
                raise RuntimeError("database_rejected_http_" + str(r.status_code))
            return r.json()

        validate_target(get(""), get("/branches"))
        report["before"] = query(catalog_sql())[0]["snapshot"]
        save()
        if apply:
            validate_start(report["before"])
            report["recovery_point"] = validate_backup(get("/database/backups")["backups"])
            # Guarded write: one request, no client retry. Persist uncertainty before sending.
            report["write_attempted"] = True
            report["status"] = "WRITE_OUTCOME_UNKNOWN_VERIFY_BEFORE_RETRY"
            save()
            query(guarded_sql(sql), False)
            report["production_modified"] = True
            report["status"] = "WRITE_CONFIRMED_PENDING_VERIFICATION"
            save()
        report["after"] = query(catalog_sql())[0]["snapshot"]
        validate_final(report["after"], validation["snapshot"])
        report["status"] = "VERIFIED"
        report["migrations_executed"] = 4 if apply else 0
        report["new_tables"] = TABLES
        save()
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-validation", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--production-approved", action="store_true")
    args = parser.parse_args()
    try:
        result = deploy(args.local_validation, args.report, args.apply, args.production_approved)
    except (RuntimeError, httpx.HTTPError) as error:
        print(
            json.dumps(
                {
                    "status": "BLOCKED_OR_UNKNOWN",
                    "report": args.report,
                    "reason": str(error) if isinstance(error, RuntimeError) else "request_failed",
                    "instruction": "Verify state using the persisted report; never blindly retry.",
                }
            )
        )
        raise SystemExit(2) from None
    print(
        json.dumps(
            {
                "status": result["status"],
                "project_ref": PROJECT,
                "new_tables": len(TABLES),
                "total_public_tables": len(result["after"]["public_tables"]),
                "migrations_executed": result["migrations_executed"],
            }
        )
    )
