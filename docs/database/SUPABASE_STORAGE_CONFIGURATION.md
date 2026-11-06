# Storage configuration proposal

Actual service-key `GET /storage/v1/bucket` returned an empty list. No bucket/policy/object was created, listed, uploaded or deleted. Hidden/internal data and storage policy catalogs remain unverified without SQL access. Do not infer storage authorization from bucket-list success.

| Proposed purpose        | Visibility                                           | Proposed limits / review                                           |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Profile images          | Private original; opt-in sanitized public derivative | Image MIME/decoded-byte validation, max 10 MiB, strip metadata     |
| Face analysis           | Private owner-only quarantine/source                 | JPEG/PNG/WebP only, max 10 MiB; explicit purpose/expiry            |
| AI transformations      | Private owner-only                                   | Validated output; source/job/model lineage; bounded retention      |
| Wardrobe                | Private owner-only                                   | Images max 10 MiB; no public discoverability by default            |
| Merchant product images | Private drafts; reviewed public derivatives          | Org-managed facts/rights, max 15 MiB; no auto-publication          |
| Professional portfolios | Private drafts; reviewed public derivatives          | Org/assigned professional writes, consent/rights approval          |
| Creator content         | Private draft; opt-in reviewed public derivative     | Supported media kinds and video limits require product review      |
| Ad creatives            | Private draft; approved public derivative            | Org-authorized review, no private face/analysis reuse              |
| Verification documents  | Private restricted reviewers only                    | Document MIME/size/retention policy must be approved; never public |

Limits are proposed, not applied. Owner/org access must map authenticated identity through canonical membership; possession of a path or URL must not grant write rights. Storage RLS binds bucket, owner/org path and operation, with separate select/insert/update/delete checks. Signed URLs should expire quickly (proposed<=5minutes, subject to provider requirements), never log/persist them in analytics. Validate bytes/MIME/size, quarantine/scanning and EXIF removal before downstream processing. Do not publish unreviewed merchandise or private originals.

Retention/deletion jobs need approved purpose-specific schedules for originals, outputs, invitations, verification and backups; revoke URLs/cache and vendor artifacts, record safe completion, honor consent withdrawal. Do not promise immediate deletion from immutable backups. Required tests include cross-owner path traversal, guessed object keys, MIME spoof, over-limit upload, expired URL, role revocation, private/public derivative separation and vendor/backup expiration. All remote storage-policy tests remain BLOCKED; no fabricated PASS.
