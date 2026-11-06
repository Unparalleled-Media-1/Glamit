# RLS security audit — source verified, remote unknown

Existing 0003 and later table migrations enable RLS and revoke client grants for canonical tables. This is **deny-by-default server-only access**, not a direct Supabase client data model. Existing local tests verify foundation RLS and API org boundaries, but hosted pg_policy/grants/function privileges have not been inspected. Service-role metadata success is a bypass-capable administrative read, **not** a passing RLS test.

| Actor              | Intended access                                            | Required negative tests before deployment                          |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Anonymous          | Approved public catalog projection via authorized API only | No private look/report/media/order/consent/financial access        |
| Buyer              | Own records and permitted order receipt through API        | Another user's IDs/joins/updates/storage keys fail                 |
| Merchant           | Own org catalog/variants and own suborder lines            | Other merchants' order lines/addresses/inventory inaccessible      |
| Professional       | Own org availability/assigned bookings/quotes              | Another org/client's unassigned details inaccessible               |
| Creator/advertiser | Own storefront/campaigns; validated projections            | No cross-org attribution, private analysis or sensitive targeting  |
| Staff              | Explicit server-issued scoped grants, reason/audit trail   | User metadata or workspace selection cannot grant admin/finance    |
| Financial service  | Append-only authorized journal commands                    | Ordinary clients cannot insert/update/delete money/webhook records |

Never equate app_user.id with auth.uid() without the canonical issuer/subject mapping. Membership changes are server-authoritative; revoked grants must stop access promptly. If direct-client policies are later approved, use both USING/WITH CHECK with tenant-safe predicates, indexed lookup, no recursive policy loop, fixed search_path and narrowly granted security-definer functions. Do not grant broad execution on arbitrary SQL RPCs. The observed `rls_auto_enable` RPC was not invoked or assumed safe.

For every new relation/view/function/storage policy test anonymous, two buyers, two organizations, distinct roles, expired membership and service-role boundaries. RLS enabled without policies/grants/tenant attack tests is not ready. Inspect inherited grants/default privileges, view security mode, function EXECUTE, sequences, owner bypass and security-definer search_path with SQL catalog access. Full remote checks are BLOCKED; no policy was created/overwritten.

Secrets remain runtime-only. Previous conversational password rotation is unverified. Management SQL permission and full data/backup classification must be established before any change. Do not enable direct client financial access to compensate for unavailable SQL credentials.
