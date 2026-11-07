"""Read-only Git/GitHub branch consolidation evidence. Never merges or publishes."""

import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def main():
    repository = "repos/Unparalleled-Media-1/Glamit"
    metadata = json.loads(command("gh", "api", repository))
    default = metadata["default_branch"]
    base = command("git", "rev-parse", "origin/" + default)
    branches = []
    refs = command(
        "git",
        "for-each-ref",
        "--format=%(refname:short)\t%(objectname)",
        "refs/heads",
        "refs/remotes/origin",
    )
    for line in refs.splitlines():
        name, sha = line.split("\t")
        contained = (
            subprocess.run(
                ["git", "merge-base", "--is-ancestor", sha, base], capture_output=True
            ).returncode
            == 0
        )
        branches.append(
            {
                "name": name,
                "sha": sha,
                "contained_in_main": contained,
                "divergence_from_main": command(
                    "git", "rev-list", "--left-right", "--count", base + "..." + sha
                ),
            }
        )
    pulls = json.loads(command("gh", "api", repository + "/pulls?state=all&per_page=100"))
    prs = []
    for pr in pulls:
        item = {
            "number": pr["number"],
            "state": pr["state"],
            "merged_at": pr["merged_at"],
            "base": pr["base"]["ref"],
            "head": pr["head"]["ref"],
            "head_sha": pr["head"]["sha"],
        }
        if pr["state"] == "open":
            reviews = json.loads(command("gh", "api", f"{repository}/pulls/{pr['number']}/reviews"))
            latest = {}
            for review in reviews:
                if review["state"] in {"APPROVED", "CHANGES_REQUESTED", "DISMISSED"}:
                    latest[review["user"]["id"]] = {
                        "state": review["state"],
                        "commit_id": review.get("commit_id"),
                    }
            item["current_head_approvals"] = sum(
                r["state"] == "APPROVED" and r["commit_id"] == item["head_sha"]
                for r in latest.values()
            )
            item["changes_requested"] = sum(
                r["state"] == "CHANGES_REQUESTED" for r in latest.values()
            )
        prs.append(item)
    value = {
        "observed_at": datetime.now(UTC).isoformat(),
        "default_branch": default,
        "main_sha": base,
        "candidate_sha": command("git", "rev-parse", "HEAD"),
        "candidate_branch": command("git", "branch", "--show-current"),
        "branches": branches,
        "pull_requests": prs,
        "remote_refs_fetched": True,
        "mutations": "none; no merge or deletion",
    }
    Path("docs/launch/evidence/git-inventory.json").write_text(json.dumps(value, indent=2) + "\n")
    print(
        json.dumps(
            {
                "default_branch": default,
                "branches": len(branches),
                "open_prs": sum(p["state"] == "open" for p in prs),
                "open_prs_with_current_head_approval": sum(
                    p.get("current_head_approvals", 0) > 0 for p in prs
                ),
            }
        )
    )


if __name__ == "__main__":
    main()
