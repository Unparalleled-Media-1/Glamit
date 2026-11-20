"""Derive the least-privilege table grants the FastAPI runtime role needs, from the API's own SQL.

Review-only helper: it prints SQL and never connects to any database. The role itself is NOT created
here; role creation/BYPASSRLS on Supabase is a production change needing separate owner approval.
"""

import ast
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TABLE = r"(?:public\.)?([a-z_][a-z0-9_]*)"
NOT_TABLES = {
    "select",
    "set",
    "values",
    "jsonb",
    "lateral",
    "unnest",
    "exists",
    "of",
    "public",
    "only",
    "each",
    "pg_class",
}
EXTERNAL = {
    "sessions",
    "users",
    "buckets",
    "objects",
}  # auth/storage schemas: read via Supabase-owned grants


def _resolve(node, names):
    """Best-effort constant folding of a SQL string (literals, f-strings, module constants)."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        return "".join(
            _resolve(v.value, names) if isinstance(v, ast.FormattedValue) else v.value
            for v in node.values
        )
    if isinstance(node, ast.Name):
        return names.get(node.id, "")
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return _resolve(node.left, names) + _resolve(node.right, names)
    return ""


def statements(source: str, shared: dict[str, str] | None = None):
    tree = ast.parse(source)
    names = dict(shared or {})
    for _ in range(3):  # a few passes so constants may refer to earlier constants
        for node in tree.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1:
                target = node.targets[0]
                if isinstance(target, ast.Name):
                    value = _resolve(node.value, names)
                    if value:
                        names[target.id] = value
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "text" and node.args:
            for stmt in _resolve(node.args[0], names).split(";"):
                if stmt.strip():
                    yield stmt


def shared_constants(root: Path) -> dict[str, str]:
    names: dict[str, str] = {}
    for path in sorted((root / "services/api/src/glam_api").rglob("*.py")):
        for node in ast.parse(path.read_text()).body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1:
                target = node.targets[0]
                if isinstance(target, ast.Name) and target.id.isupper():
                    value = _resolve(node.value, names)
                    if value:
                        names[target.id] = value
    return names


def needed(root: Path = ROOT) -> dict[str, set[str]]:
    out: dict[str, set[str]] = defaultdict(set)
    shared = shared_constants(root)
    for path in sorted((root / "services/api/src/glam_api").rglob("*.py")):
        if "payments" in path.parts:  # isolated Stripe sandbox app, never deployed with the API
            continue
        for stmt in statements(path.read_text(), shared):
            head = stmt.lstrip().split(None, 1)[0].upper() if stmt.strip() else ""
            reads = {
                m.group(1).lower()
                for m in re.finditer(
                    rf"\b(?:FROM|JOIN)\s+(?:ONLY\s+)?{TABLE}(?=\s|\)|$)", stmt, re.I
                )
            }
            writes = {
                "INSERT": {
                    m.group(1).lower()
                    for m in re.finditer(rf"\bINSERT\s+INTO\s+{TABLE}", stmt, re.I)
                },
                "UPDATE": {
                    m.group(1).lower()
                    for m in re.finditer(rf"^\s*UPDATE\s+{TABLE}", stmt, re.I | re.M)
                },
                "DELETE": {
                    m.group(1).lower()
                    for m in re.finditer(rf"\bDELETE\s+FROM\s+{TABLE}", stmt, re.I)
                },
            }
            for priv, tables in writes.items():
                for t in tables:
                    out[t].add(priv)
                    if priv in {"UPDATE", "DELETE"}:
                        out[t].add("SELECT")  # WHERE clauses read the row
            for t in reads:
                out[t].add("SELECT")
                if re.search(
                    r"\bFOR\s+(?:NO\s+KEY\s+UPDATE|UPDATE|SHARE|KEY\s+SHARE)\b", stmt, re.I
                ):
                    out[t].add("UPDATE")  # FOR UPDATE/SHARE row locks require UPDATE privilege
            _ = head
    return {
        t: p
        for t, p in out.items()
        if t not in NOT_TABLES | EXTERNAL and not t.startswith(("pg_", "information_"))
    }


# Supabase-owned objects the API reads in SQL (session revocation checks, Storage catalog guard).
EXTERNAL_GRANTS = [
    "GRANT USAGE ON SCHEMA auth TO {role};",
    "GRANT SELECT ON auth.sessions TO {role};",
    "GRANT USAGE ON SCHEMA storage TO {role};  -- catalog lookups only; no table privileges",
]

# The API's own start-up self-checks (schema() in each module) demand these on their tables.
SELF_CHECK = {
    **{
        t: {"SELECT", "INSERT", "UPDATE"}
        for t in (
            "tryon_job",
            "tryon_result",
            "generation_cost_event",
            "generation_price_rule",
            "analysis_job",
            "analysis_correction",
        )
    },
    "style_passport_analysis": {"SELECT", "INSERT", "UPDATE", "DELETE"},
}


def render(grants: dict[str, set[str]], role: str = "glam_api_runtime") -> str:
    lines = [
        "-- PROPOSAL ONLY. Generated by scripts/db/runtime_privileges.py from the API's SQL.",
        "-- Not approved, not applied.",
        f"-- Role {role} must already exist (role creation and BYPASSRLS are separate decisions).",
        f"GRANT USAGE ON SCHEMA public TO {role};",
    ]
    grants = {
        t: set(grants.get(t, set())) | SELF_CHECK.get(t, set())
        for t in set(grants) | set(SELF_CHECK)
    }
    for table in sorted(grants):
        privs = ", ".join(p for p in ("SELECT", "INSERT", "UPDATE", "DELETE") if p in grants[table])
        lines.append(f"GRANT {privs} ON public.{table} TO {role};")
    lines.append(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {role};")
    lines.extend(g.format(role=role) for g in EXTERNAL_GRANTS)
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sys.stdout.write(render(needed()))
