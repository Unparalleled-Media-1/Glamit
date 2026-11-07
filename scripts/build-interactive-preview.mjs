import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const base = (process.env.PREVIEW_BASE_PATH || "").replace(/\/$/, "");
if (base && !/^\/[A-Za-z0-9_-]+$/.test(base))
  throw Error("Preview base must be empty or one safe repository path segment");
const root = path.resolve("dist/interactive-preview");
await rm(root, { recursive: true, force: true });
await mkdir(path.join(root, "assets"), { recursive: true });
await build({
  entryPoints: ["preview/entry.tsx"],
  bundle: true,
  jsx: "automatic",
  minify: true,
  format: "esm",
  target: ["es2022"],
  outdir: path.join(root, "assets"),
  entryNames: "preview",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": JSON.stringify(base + "/app"),
    "process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW": '"true"',
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""',
    "process.env.PREVIEW_SITE_BASE": JSON.stringify(base),
  },
  loader: { ".woff2": "file", ".webp": "file" },
  plugins: [
    {
      name: "preview-image-prefix",
      setup(b) {
        b.onLoad({ filter: /styles\.css$/ }, async (args) => ({
          contents: (await readFile(args.path, "utf8"))
            .replaceAll('url("/images/', `url("${base}/images/`)
            .replaceAll("url('/images/", `url('${base}/images/`),
          loader: "css",
          resolveDir: path.dirname(args.path),
        }));
        b.onResolve({ filter: /^\/images\// }, (args) => ({
          path: base + args.path,
          external: true,
        }));
        b.onResolve(
          {
            filter: new RegExp(
              "^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/images/",
            ),
          },
          (args) => ({ path: args.path, external: true }),
        );
      },
    },
  ],
});
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'self'"><title>GLAM Beauty — Interactive Preview</title><link rel="stylesheet" href="${base}/assets/preview.css"></head><body><div id="root"></div><script type="module" src="${base}/assets/preview.js"></script></body></html>`;
await writeFile(path.join(root, "index.html"), html);
await writeFile(path.join(root, ".nojekyll"), "");
await cp("apps/web/public/images", path.join(root, "images"), {
  recursive: true,
});
const routes = [
  "offer",
  "results",
  "destination",
  "cart",
  "checkout",
  "orders",
  "shop",
  "product",
  "",
  "analyze",
  "hair",
  "skin",
  "body-fit",
  "consent",
  "quality",
  "goals",
  "report",
  "color",
  "guide",
  "studio",
  "advisor",
  "profile",
  "history",
  "privacy",
  "explore",
  "complete",
  "screenshot",
  "budget",
  "booking",
  "wardrobe",
  "calendar",
  "groups",
  "agent",
  "event",
  "builder",
  "business",
  "admin",
];
for (const route of routes) {
  const dir = path.join(root, "app", route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
}
await mkdir(path.join(root, "app/api"), { recursive: true });
await writeFile(
  path.join(root, "app/api/capabilities.json"),
  JSON.stringify({
    identity: false,
    analysis: false,
    privateStorage: false,
    makeover: false,
    advisor: false,
    catalog: false,
    booking: false,
    billing: false,
    reason:
      "Static interactive preview. No account, private processing or commerce integration is enabled.",
  }),
);
await writeFile(
  path.join(root, "build.json"),
  JSON.stringify(
    {
      source_commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      built_at: new Date().toISOString(),
      site_base: base,
      app_base: base + "/app",
      mode: "static_interactive_preview",
      live_integrations: false,
    },
    null,
    2,
  ),
);
console.log(
  `Interactive preview built in ${root}; serve at ${base || "/"} with the repository base preserved.`,
);
