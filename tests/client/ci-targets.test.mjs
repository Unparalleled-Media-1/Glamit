import { test } from "node:test";
import assert from "node:assert/strict";
import { targets } from "../../scripts/ci/targets.mjs";
test("web-only work does not build mobile or API", () => assert.deepEqual(targets(["apps/web/components/GlamApp.tsx"]), { web:true, mobile:false, backend:false, edge:false }));
test("native-only work does not build web or API", () => assert.deepEqual(targets(["apps/mobile/App.tsx"]), { web:false, mobile:true, backend:false, edge:false }));
test("API-only work is independent", () => assert.deepEqual(targets(["services/api/src/glam_api/main.py"]), { web:false, mobile:false, backend:true, edge:false }));
test("shared JS changes test both clients", () => { const t=targets(["packages/product/brand.ts"]); assert(t.web && t.mobile); });
test("contracts test consumers and API; docs do not redeploy", () => { assert(targets(["packages/contracts/openapi.json"]).backend); assert.deepEqual(targets(["docs/deployment/README.md"]), {web:false,mobile:false,backend:false,edge:false}); });

test("release-audit changes select the checks that execute them", () => { assert(targets(["scripts/launch/release-gates.cjs"]).web); assert(targets(["scripts/launch/report.py"]).backend); });
