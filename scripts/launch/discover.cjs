/** Source inventory only; never treats a declaration as a working feature. */
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  cp = require("node:child_process");
const root = path.resolve(__dirname, "../..");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    )
    .filter((f) => /\.(tsx?|py)$/.test(f));
}
const sectionFile = path.join(root, "apps/web/app/[section]/page.tsx");
const source = ts.createSourceFile(
  sectionFile,
  fs.readFileSync(sectionFile, "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let sections = [];
function visit(n) {
  if (
    ts.isVariableDeclaration(n) &&
    n.name.getText(source) === "sections" &&
    ts.isArrayLiteralExpression(n.initializer)
  )
    sections = n.initializer.elements.map((e) => e.text);
  ts.forEachChild(n, visit);
}
visit(source);
const routes = [
  "/",
  ...sections.map((s) => "/" + s),
  "/business",
  "/admin",
  "/login",
  "/auth/callback",
  ...files(path.join(root, "apps/web/app"))
    .filter((file) => file.endsWith("/page.tsx") && !file.includes("["))
    .map(
      (file) =>
        "/" +
        path
          .relative(path.join(root, "apps/web/app"), path.dirname(file))
          .replaceAll(path.sep, "/"),
    ),
];
const controls = [];
for (const file of [
  ...files(path.join(root, "apps/web")),
  ...files(path.join(root, "apps/mobile")),
]) {
  const s = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function walk(n) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(s),
        attrs = n.attributes.properties.filter(ts.isJsxAttribute);
      if (
        [
          "button",
          "a",
          "input",
          "select",
          "textarea",
          "form",
          "dialog",
          "Pressable",
          "TextInput",
          "Modal",
          "Switch",
        ].includes(tag) ||
        attrs.some((a) => /^on(Press|Click|Change|Submit)$/.test(a.name.text))
      ) {
        const at = s.getLineAndCharacterOfPosition(n.getStart(s));
        controls.push({
          file: path.relative(root, file),
          line: at.line + 1,
          tag,
          label:
            attrs
              .find((a) => a.name.text === "aria-label")
              ?.initializer?.getText(s) || null,
          handler: attrs
            .filter((a) => /^on(Press|Click|Change|Submit)$/.test(a.name.text))
            .map((a) => a.name.text),
          handler_source: Object.fromEntries(
            attrs
              .filter((a) =>
                /^on(Press|Click|Change|Submit)$/.test(a.name.text),
              )
              .map((a) => [
                a.name.text,
                a.initializer?.getText(s).slice(0, 5000) || null,
              ]),
          ),
        });
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(s);
}
const openapi = JSON.parse(
  fs.readFileSync(path.join(root, "packages/contracts/openapi.json")),
);
const endpoints = Object.entries(openapi.paths).flatMap(([p, v]) =>
  Object.keys(v)
    .filter((m) => ["get", "post", "patch", "put", "delete"].includes(m))
    .map((m) => ({ method: m.toUpperCase(), path: p })),
);
const value = {
  observed_at: new Date().toISOString(),
  source_commit: cp
    .execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
    .trim(),
  routes: [...new Set(routes)],
  source_controls: controls,
  endpoints,
  scope:
    "Source declarations only. Runtime inventory and functional proof are separate.",
};
fs.writeFileSync(
  path.join(
    process.env.GLAM_LAUNCH_EVIDENCE || path.join(root, "docs/launch/evidence"),
    "source-inventory.json",
  ),
  JSON.stringify(value, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    routes: value.routes.length,
    source_controls: controls.length,
    endpoints: endpoints.length,
  }),
);
