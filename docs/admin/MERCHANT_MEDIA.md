# Merchant product originals

`PUT /v1/organizations/{org}/catalog/listings/{lid}/original-images` accepts one JPEG, PNG or WebP (max 10 MB, min 480 px short side, no animation), requires `X-Rights-Confirmed: true` and the workspace writer role, decodes and re-encodes it as a metadata-free PNG, stores it in the private `glam-catalog-media` bucket and records a `catalog_media` row (`rights_confirmed`, `validated`). Up to 8 originals per listing. `GET` on the same path lists ids only; the bytes are never served back to browsers.

Publishing already requires a validated, rights-confirmed original; this endpoint is the first way a merchant can supply one.

## Not live until the owner approves infrastructure

* The bucket `glam-catalog-media` (private, `allowed_mime_types=["image/png"]`) does **not** exist in production. Creating it and any storage policy is a production change needing explicit approval, like the private-photo bucket.
* The endpoint returns `503 catalog_media_not_configured` unless `GLAM_CATALOG_MEDIA_ENABLED=true` and the service-role key are set. It never simulates storage; tests use an in-memory store only.
* The API runtime role needs INSERT on `catalog_media` (already granted by the runtime-role proposal).

Image display to shoppers and AI derivatives remain separate work.
