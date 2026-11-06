# Consolidation plan — blocked pending review

No merges or branch deletions were performed. No PR is asserted approved; GitHub metadata and protection access returned Forbidden. There is no main branch to merge into.

1. A repository maintainer must decide whether to establish `main` from the existing default `d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb` and obtain the applicable review/protection/check requirements. This is a proposal, not authorization to bypass them.
2. Restore authorized read access to PR approvals, required checks and rulesets. Match branch tips to PRs and retain immutable approval evidence. Do not infer approval from commit ancestry or previous design approval.
3. Review core candidate `b97f1d6db1ad96b78d62e451c88a7bffbd212da4` as the consolidated application change. All feature/docs/fix branches through personalized results are ancestors of this candidate. Review the complete diff from the default, not only its tip. Prefer a single reviewed core PR over replaying ancestor branches and duplicating commits. Keep individual histories in the inventory.
4. Defer `1060e34263f0a980ba8ef66a8c148077a4a1355e` Stripe sandbox changes from the application migration lineage until the test-only migration is deliberately isolated through a separately reviewed change. Existing 10% policy remains unchanged. Do not apply0009 to Supabase or remove its safety check to force deployment.
5. Keep `gh-pages` publishing separate. Do not archive/delete local `work` or ancestor branches until their exact SHAs are verifiably reachable from approved main and owners agree.
6. Merge only approved PRs with required green CI through the repository's normal process. After each accepted merge run the focused regression; then clean-clone main and run the full gate suite.
7. Record final remote main SHA, CI run links, reviewed PR links and signed/immutable baseline tag. Proposed tag: `pre-supabase-g0-YYYYMMDD-<main-short-sha>` **only after gates pass**. None was created.

All 17 branches remain inventoried; no unreviewed merge is considered safe solely because there are no textual conflicts. Approval, financial-boundary isolation, clean-main validation, security remediation and G0 approval are prerequisites.
