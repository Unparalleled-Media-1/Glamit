"""Read-only ref/content audit. Never merge, checkout, delete refs or infer PR approval."""

import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path


def git(*args, check=True):
    result = subprocess.run(["git", *args], text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError("Git audit command failed: " + args[0])
    return result.stdout.strip(), result.returncode


def main():
    target = Path("docs/audits/pre-supabase/evidence")
    target.mkdir(parents=True, exist_ok=True)
    candidate = git("rev-parse", "refs/heads/feat/stripe-connect-test")[0]
    default = git("rev-parse", "refs/remotes/origin/feat/platform-foundations")[0]
    core = git("rev-parse", "refs/heads/feat/personalized-results-journey")[0]
    references = git(
        "for-each-ref", "--format=%(refname)\t%(objectname)", "refs/heads", "refs/remotes/origin"
    )[0]
    branches = {}
    for line in references.splitlines():
        ref, sha = line.split("\t")
        if ref.endswith("/HEAD"):
            continue
        local = ref.startswith("refs/heads/")
        name = ref[len("refs/heads/") :] if local else ref[len("refs/remotes/origin/") :]
        entry = branches.setdefault(name, {"name": name, "local": None, "remote": None})
        entry["local" if local else "remote"] = sha
    values = []
    for name, branch in sorted(branches.items()):
        sha = branch["remote"] or branch["local"]
        counts = git("rev-list", "--left-right", "--count", default + "..." + sha)[0].split()
        base, base_status = git("merge-base", candidate, sha, check=False)
        changes = git("diff", "--name-only", default, sha)[0].splitlines()
        core_ancestor = git("merge-base", "--is-ancestor", sha, core, check=False)[1] == 0
        candidate_ancestor = git("merge-base", "--is-ancestor", sha, candidate, check=False)[1] == 0
        conflict_paths = []
        conflict_status = "not_applicable"
        if base_status == 0:
            if candidate_ancestor:
                conflict_status = "already_contained_in_latest_candidate"
            else:
                merge, status = git(
                    "merge-tree", "--write-tree", "--name-only", candidate, sha, check=False
                )
                conflict_status = (
                    "clean_tree_preview" if status == 0 else "conflicting_or_unavailable"
                )
                if status:
                    # Never persist conflict contents, credentials or raw merge messages.
                    conflict_paths = [line for line in merge.splitlines()[1:] if line in changes]
        else:
            conflict_status = "unrelated_history"
        if name == "gh-pages":
            classification, why = (
                "DEFER",
                "Generated preview publishing tree; never merge artifacts into app history.",
            )
        elif name == "work":
            classification, why = (
                "ARCHIVE CANDIDATE",
                "Local historical baseline; preserve; no deletion authorized.",
            )
        elif name.startswith("audit/"):
            classification, why = "DEFER", "Audit evidence branch; not a product-release approval."
        elif name == "feat/stripe-connect-test":
            classification, why = (
                "DEFER",
                "Sandbox candidate; 0009 refuses non-test DBs, including Supabase postgres.",
            )
        elif core_ancestor:
            classification, why = (
                "BLOCKED",
                "Contained in core candidate, not main; awaits bootstrap, PR review and green CI.",
            )
        else:
            classification, why = (
                "BLOCKED",
                "Requires explicit content review; PR and protection metadata unavailable.",
            )
        local_only = []
        remote_only = []
        if branch["local"] and branch["remote"]:
            local_only = git("rev-list", branch["remote"] + ".." + branch["local"])[0].splitlines()
            remote_only = git("rev-list", branch["local"] + ".." + branch["remote"])[0].splitlines()
        elif branch["local"]:
            local_only = git("rev-list", branch["local"], "--not", "--remotes=origin")[
                0
            ].splitlines()
        values.append(
            {
                **branch,
                "sha": sha,
                "last_commit_date": git("show", "-s", "--format=%cI", sha)[0],
                "commit_author": git("show", "-s", "--format=%an", sha)[0],
                "last_subject": git("show", "-s", "--format=%s", sha)[0],
                "ahead_main": None,
                "behind_main": None,
                "ahead_default": int(counts[1]),
                "behind_default": int(counts[0]),
                "changed_files_vs_default": changes,
                "changed_file_count": len(changes),
                "contained_in_core_candidate": core_ancestor,
                "contained_in_latest_candidate": candidate_ancestor,
                "classification": classification,
                "reason": why,
                "conflict_preview_vs_latest": conflict_status,
                "conflict_paths": conflict_paths,
                "associated_pr": "UNKNOWN — GitHub API Forbidden; no approval inferred",
                "required_ci_and_reviews": "UNVERIFIED",
                "local_only_commits": local_only,
                "remote_only_commits": remote_only,
                "tests": "Historical docs only unless executed explicitly in this audit",
            }
        )
    pr_heads = []
    refs = git("for-each-ref", "--format=%(refname)\t%(objectname)", "refs/audit/pull")[0]
    for line in refs.splitlines():
        ref, sha = line.split("\t")
        number = int(ref.split("/")[-2])
        pr_heads.append(
            {
                "number": number,
                "head_sha": sha,
                "url": f"https://github.com/Unparalleled-Media-1/Glamit/pull/{number}",
                "subject": git("show", "-s", "--format=%s", sha)[0],
                "contained_in_default": git(
                    "merge-base", "--is-ancestor", sha, default, check=False
                )[1]
                == 0,
                "contained_in_candidate": git(
                    "merge-base", "--is-ancestor", sha, candidate, check=False
                )[1]
                == 0,
                "state": "UNKNOWN",
                "approvals": "UNKNOWN",
                "checks": "UNKNOWN",
                "head_only_commits_vs_default": git("rev-list", default + ".." + sha)[
                    0
                ].splitlines(),
            }
        )
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "repository": "Unparalleled-Media-1/Glamit",
        "default_branch": "feat/platform-foundations",
        "default_sha": default,
        "main_exists": False,
        "main_sha": None,
        "candidate_sha": candidate,
        "core_candidate_sha": core,
        "branch_count": len(values),
        "remote_branch_count": sum(bool(v["remote"]) for v in values),
        "local_branch_count": sum(bool(v["local"]) for v in values),
        "tag_refs": git("for-each-ref", "--format=%(refname) %(objectname)", "refs/tags")[
            0
        ].splitlines(),
        "worktrees": git("worktree", "list", "--porcelain")[0].splitlines(),
        "stashes": git("stash", "list", "--format=%gd %H")[0].splitlines(),
        "detached_head": git("symbolic-ref", "-q", "HEAD", check=False)[1] != 0,
        "branches": values,
        "visible_pr_heads": pr_heads,
    }
    (target / "branch-inventory.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                k: report[k]
                for k in [
                    "branch_count",
                    "remote_branch_count",
                    "local_branch_count",
                    "main_exists",
                    "default_sha",
                    "core_candidate_sha",
                ]
            }
        )
    )


if __name__ == "__main__":
    main()
