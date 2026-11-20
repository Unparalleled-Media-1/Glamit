# Professional services and bookings

API (all server-authoritative; provider routes need the professional workspace and the `booking_manager`/admin role, reads need any workspace role):

* `POST/GET /v1/organizations/{org}/services`, `POST .../services/{sid}` (edit, publish, archive; archived is terminal)
* `GET/PUT /v1/organizations/{org}/availability` (weekly rules, IANA timezone, no overlaps)
* `GET /v1/organizations/{org}/bookings`, `POST .../bookings/{bid}/decision` (`accept|decline|cancel|complete`)
* Clients (eligible adults): `GET /v1/professionals/{org}/services`, `.../services/{sid}/slots?day=`, `POST /v1/bookings` (Idempotency-Key), `GET /v1/me/bookings`, `POST /v1/me/bookings/{bid}/cancel`

Rules: only published services of verified, unsuspended organizations are visible; a request must be an offered slot (15-minute grid inside availability, in the future, not overlapping a held booking); accepting is protected by a database exclusion constraint and concurrent accepts of overlapping requests produce exactly one winner; providers see a pseudonymous client reference only; every change is audited.

**Not live:** needs candidate migration 0019 (see `docs/database/migration-approval-pack/0019_addendum.md`). Not built: provider web UI (next), consumer discovery/search, reschedule, reminders/notifications, deposits and payments, calendar sync, portfolio media, earnings.
