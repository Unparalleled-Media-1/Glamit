/** Path routing is intentionally independent of deploy credentials and provider availability. */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export function targets(paths) {
  const hit = regex => paths.some(p => regex.test(p));
  const pipeline = hit(/^scripts\/check-railway-config\.mjs$|^\.github\/workflows\/ci\.yml$|^scripts\/ci\//);
  const js = hit(/^(package(-lock)?\.json|\.node-version|\.npmrc)$|^packages\//);
  return {
    web: pipeline || js || hit(/^(apps\/web\/|deploy\/godaddy\/|deploy\/railway\/web|scripts\/(smoke_deployment_images|build-|public-supabase|check-browser|generate-consumer)|tests\/(client|auth|auth-branding|creator|launch|photo)\/|\.dockerignore$)/),
    mobile: pipeline || js || hit(/^(apps\/mobile\/|tests\/(auth|mobile)\/|tests\/client\/(product\.test|mobile-build-config)\.cjs$|scripts\/check-browser-auth-config\.mjs$|scripts\/public-supabase-config\.mjs$)/),
    backend: pipeline || hit(/^(services\/api\/|db\/|pyproject\.toml$|uv.lock$|alembic.ini$|tests\/[^/]+\.py$|tests\/fixtures\/|scripts\/(launch\/.*\.py|start-api|smoke_deployment_images|export_contracts|deploy_|export_application)|deploy\/railway\/api|\.dockerignore$|packages\/contracts\/)/),
    edge: pipeline || hit(/^(supabase\/functions\/|tests\/edge\/)/),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [base, head] = process.argv.slice(2);
  if (![base, head].every(s => /^[a-f0-9]{40}$/i.test(s || ""))) throw Error("Expected two commit SHAs");
  const paths = execFileSync("git", ["diff", "--name-only", "-z", base, head], { encoding: "utf8" }).split("\0").filter(Boolean);
  const result = targets(paths);
  for (const [key, value] of Object.entries(result)) if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  console.log(JSON.stringify({ targets: result, changedFiles: paths.length }));
}
