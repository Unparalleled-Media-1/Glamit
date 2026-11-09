import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { publicSupabaseKey } from "./public-supabase-config.mjs";

// Validate BEFORE writing a client bundle; server credentials may never reach generated files.
const key = publicSupabaseKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
);
const root = path.resolve("dist/godaddy-web");
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
const result = await build({
  entryPoints: ["deploy/godaddy/entry.tsx"],
  bundle: true,
  jsx: "automatic",
  minify: true,
  format: "esm",
  target: ["es2022"],
  outdir: path.join(root, "assets"),
  entryNames: "app-[hash]",
  assetNames: "asset-[hash]",
  metafile: true,
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
    "process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW": '"true"',
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(key),
  },
  loader: { ".woff2": "file", ".webp": "file" },
  external: ["/images/*"],
});
const js = Object.entries(result.metafile.outputs).find(([name, meta]) =>
  name.endsWith(".js") && meta.entryPoint
)?.[0];
const css = result.metafile.outputs[js]?.cssBundle;
if (!js || !css) throw Error("Expected application JS and CSS output.");
const href = (name) =>
  "/" + path.relative(root, path.resolve(name)).replaceAll(path.sep, "/");
const csp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://bkkmsbxrxkqaveymcrgi.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const html =
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${
    csp.replace("; frame-ancestors 'none'", "")
  }"><meta name="description" content="Your personal beauty and styling companion."><link rel="canonical" href="https://www.glamit.beauty/"><link rel="icon" type="image/png" sizes="256x256" href="/brand/favicon.png?v=20261108"><link rel="apple-touch-icon" href="/brand/favicon.png?v=20261108"><link rel="manifest" href="/site.webmanifest"><title>GLAM Beauty</title><link rel="stylesheet" href="${
    href(css)
  }"></head><body><div id="root"></div><script type="module" src="${
    href(js)
  }"></script></body></html>`;
await writeFile(path.join(root, "index.html"), html);
await cp("apps/web/public/site.webmanifest", path.join(root, "site.webmanifest"));
await cp("apps/web/public/brand", path.join(root, "brand"), { recursive: true });
await cp("apps/web/public/images", path.join(root, "images"), {
  recursive: true,
});
// Explicit files also support static hosts that do not use Apache rewrites.
for (
  const route of [
    "terms", "privacy-policy", "cookies", "returns", "accessibility", "contact", "get-app",
    "login",
    "register",
    "business/login",
    "business/register",
    "admin/login",
    "auth/callback",
    "profile",
    "analyze",
    "studio",
    "advisor",
    "shop",
    "product",
    "results",
    "event",
    "destination",
    "builder",
    "complete",
    "business",
    "admin",
    "cart",
    "checkout",
    "orders",
    "guide",
    "history",
    "privacy",
    "wardrobe",
    "consent",
    "quality",
    "goals",
    "report",
    "color",
    "hair",
    "skin",
    "body-fit",
    "screenshot",
    "budget",
    "booking",
    "explore",
    "calendar",
    "groups",
    "agent",
    "offer",
  ]
) {
  await mkdir(path.join(root, route), { recursive: true });
  await writeFile(path.join(root, route, "index.html"), html);
}
await mkdir(path.join(root, "api"), { recursive: true });
await writeFile(
  path.join(root, "api/capabilities.json"),
  JSON.stringify({
    identity: true,
    analysis: false,
    privateStorage: false,
    makeover: false,
    advisor: false,
    catalog: false,
    booking: false,
    billing: false,
    reason:
      "Supabase account core is connected. AI, private media and commercial operations remain unavailable.",
  }),
);
await writeFile(
  path.join(root, ".htaccess"),
  `DirectoryIndex index.html\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.html [L]\n</IfModule>\n<IfModule mod_headers.c>\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "no-referrer"\nHeader always set Content-Security-Policy "${csp}"\n<FilesMatch "\\.(html|json)$">\nHeader always set Cache-Control "no-store"\n</FilesMatch>\n</IfModule>\n`,
);
await writeFile(
  path.join(root, "build.json"),
  JSON.stringify(
    {
      source_commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      built_at: new Date().toISOString(),
      canonical_origin: "https://www.glamit.beauty",
      mode: "static_web_supabase_core",
      backend: "https://bkkmsbxrxkqaveymcrgi.supabase.co/functions/v1/glam-api",
      provider_operations_enabled: false,
      privileged_keys_in_browser: false,
      frontend_deployed: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "GoDaddy static-host upload build prepared in dist/godaddy-web; no hosting files or DNS were changed.",
);
