"""Generic redacted source/history scan. Never accept or print an exposed secret as input."""

import json
import re
import subprocess
from pathlib import Path

PATTERNS = {
    "stripe_key": re.compile(rb"(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}"),
    "webhook_key": re.compile(rb"whsec_[A-Za-z0-9]{20,}"),
    "aws_key": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "private_key_material": re.compile(
        rb"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{40}"
    ),
    "hosted_postgres_credential": re.compile(
        rb"postgres(?:ql)?(?:\+psycopg)?://[^\s/:]+:[^\s@]+@[^\s/]*\.supabase\.co", re.I
    ),
}
EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".json",
    ".yml",
    ".yaml",
    ".md",
    ".txt",
    ".sql",
    ".sh",
    ".toml",
    ".ini",
    ".example",
    ".env",
}


def scan(data, filename, revision, findings):
    for name, pattern in PATTERNS.items():
        for match in pattern.finditer(data):
            findings.append(
                {
                    "kind": name,
                    "file": filename,
                    "blob": revision,
                    "line": data[: match.start()].count(b"\n") + 1,
                    "value": "REDACTED — never persisted",
                }
            )


def main():
    tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
    findings = []
    tracked_count = 0
    for filename in tracked:
        p = Path(filename)
        if filename and p.is_file() and p.suffix in EXTENSIONS:
            tracked_count += 1
            scan(p.read_bytes(), filename, "working-tree", findings)
    objects = subprocess.check_output(["git", "rev-list", "--objects", "--all"])
    metadata = (
        subprocess.run(
            ["git", "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize) %(rest)"],
            input=objects,
            capture_output=True,
            check=True,
        )
        .stdout.decode()
        .splitlines()
    )
    selected = []
    for line in metadata:
        parts = line.split(" ", 3)
        if (
            len(parts) == 4
            and parts[1] == "blob"
            and int(parts[2]) < 2_000_000
            and Path(parts[3]).suffix in EXTENSIONS
        ):
            selected.append((parts[0], parts[3]))
    process = subprocess.Popen(
        ["git", "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE
    )
    for sha, filename in selected:
        process.stdin.write((sha + "\n").encode())
        process.stdin.flush()
        header = process.stdout.readline().decode().split()
        data = process.stdout.read(int(header[2]))
        process.stdout.read(1)
        scan(data, filename, sha, findings)
    process.stdin.close()
    if process.wait():
        raise RuntimeError("History scan incomplete")
    report = {
        "tracked_text_files_scanned": tracked_count,
        "historical_text_blobs_scanned": len(selected),
        "findings": findings,
        "scanner_scope": "Bounded pattern scan, not proof of no secrets",
        "conversation_credential_exposure": "OPEN CRITICAL; rotate externally; value not copied",
        "database_connection_attempted": False,
    }
    output = Path("docs/audits/pre-supabase/evidence/secret-scan.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {k: v for k, v in report.items() if k != "findings"} | {"finding_count": len(findings)}
        )
    )


if __name__ == "__main__":
    main()
