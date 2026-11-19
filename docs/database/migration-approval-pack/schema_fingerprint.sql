-- Read-only catalog fingerprint. Run the SAME query on two databases and compare the output.
-- Excludes the Stripe sandbox ledger (0009), which is never part of application@head.
WITH t AS (
  SELECT 'table' k, n.nspname||'.'||c.relname v FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','glam_private','creator_private') AND c.relname NOT LIKE 'stripe_test_%'
  UNION ALL SELECT 'column', table_schema||'.'||table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'')
   FROM information_schema.columns WHERE table_schema IN ('public','glam_private','creator_private') AND table_name NOT LIKE 'stripe_test_%'
  UNION ALL SELECT 'constraint', conrelid::regclass::text||'.'||conname||':'||contype::text||':'||convalidated::text FROM pg_constraint
   WHERE connamespace IN ('public'::regnamespace) AND conrelid::regclass::text NOT LIKE '%stripe_test_%'
  UNION ALL SELECT 'index', schemaname||'.'||indexname||':'||indexdef FROM pg_indexes WHERE schemaname IN ('public','glam_private','creator_private') AND tablename NOT LIKE 'stripe_test_%'
  UNION ALL SELECT 'policy', schemaname||'.'||tablename||'.'||policyname||':'||cmd||':'||permissive::text FROM pg_policies WHERE schemaname IN ('public','storage') AND policyname NOT LIKE '%stripe_test%'
  UNION ALL SELECT 'rls', n.nspname||'.'||c.relname||':'||c.relrowsecurity::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind='r' AND n.nspname IN ('public','creator_private') AND c.relname NOT LIKE 'stripe_test_%'
  UNION ALL SELECT 'function', n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','glam_private') AND p.prokind='f' AND p.proname NOT LIKE '%stripe_test%'
  UNION ALL SELECT 'trigger', event_object_table||'.'||trigger_name FROM information_schema.triggers WHERE trigger_schema='public' AND event_object_table NOT LIKE 'stripe_test_%'
  UNION ALL SELECT 'grant', table_schema||'.'||table_name||':'||grantee||':'||privilege_type FROM information_schema.role_table_grants
   WHERE table_schema IN ('public','creator_private') AND grantee IN ('anon','authenticated','service_role','PUBLIC') AND table_name NOT LIKE 'stripe_test_%'
)
SELECT k AS kind, count(*) AS n, md5(string_agg(v,E'\n' ORDER BY v)) AS digest FROM t GROUP BY k ORDER BY k;
