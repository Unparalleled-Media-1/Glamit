# Railway root-cause investigation

07 November 2026 21:42 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

GitHub default **`feat/platform-foundations`**, SHA `d846b94c2fe6f0b4394be2b74c27734cde4533bf`. No `main` branch exists. PR21–26 are merged. 52 local/remote refs and 9 open PRs inventoried. The reported Railway source matches the actual default; a branch-name mismatch is not established. No force push, branch deletion, repository disconnect or source switch occurred.

Railway project `elegant-dedication` (`3f490939-cffd-4468-8c25-d90146f1b308`), production environment `93eeefda-99b8-462b-9041-421f9f5903ca`, existing service `glamit-web` (`d2a011b7-929e-4302-809a-27ca7345621a`), reported URL `https://glamit-web-production.up.railway.app`. These service details were supplied by the user, not independently verified through Railway API. Actual deployed commit **unknown**.

The user confirmed the token was added to **Railway service settings**. That makes it available to the hosted application, not this Codex workspace. Neither token is loaded here; Railway hosts remain outside applied egress policy. A fresh Chrome attempt through the inherited proxy returned **`net::ERR_TUNNEL_CONNECTION_FAILED`**; all 39 deployed routes are BLOCKED, not passed or proven broken. No actual Railway build/runtime log or GitHub integration authorization evidence was obtained.

**Root cause of the reported branch-loading/deployment failure remains UNDETERMINED.** GitHub branch availability is proven; the named source branch is valid. Missing agent access is the root cause of the blocked investigation, not proof of a Railway defect. A Python runtime is reported by the user but not inspected; do not assume it is erroneous without identifying what the service serves.

Required access: the existing project's environment-scoped `RAILWAY_TOKEN` in **this Codex environment's secure settings**, plus applied access for `backboard.railway.app`, `backboard.railway.com` and `glamit-web-production.up.railway.app`. Remove the unused unbound `RAILWAY_API_TOKEN` requirement; never configure both. The saved draft now includes the correct token entry but requires review/save/publication to load here. No token value belongs in chat or Git. Inspect deployment/source/build/runtime logs and Railway GitHub App permissions before changing settings; preserve the working service and previous release.
