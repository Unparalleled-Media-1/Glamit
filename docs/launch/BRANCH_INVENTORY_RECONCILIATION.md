# Live branch reconciliation

The restored checkout included historical local/tracking refs. The46 entries in the earlier git-inventory.json describe those refs, not46 current GitHub branches. No refs or branches were deleted.

A fresh paginated GitHub branch read returns three live branches, and each head was explicitly fetched and verified:

- `audit/final-cross-platform`: `6f489df614a79e93f3c3b6ec6e110618d75fb096`; contained in the main branch: False.
- `feat/platform-foundations`: `166498e287de5d966dac42e6fb7a719fd61d0ddd`; contained in the main branch: True.
- `fix/railway-docker-complete`: `3547b1f93773ffdaab32ebeb957bce3b827c07b8`; contained in the main branch: True.

The user-designated main branch remains feat/platform-foundations at166498e287de5d966dac42e6fb7a719fd61d0ddd. There is no literal GitHub main branch. The prior Docker repair branch is already contained in main. The current audit branch remains in PR33; no merge or deployment was performed. See evidence/final/remote-branch-heads.json for live-head evidence. Cached historical refs are retained for audit purposes.
