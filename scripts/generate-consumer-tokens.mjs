import { readFile, writeFile } from "node:fs/promises";
const tokens = JSON.parse(
  await readFile("packages/product/consumer-design.json", "utf8"),
);
const lines = [
  "/* Generated from packages/product/consumer-design.json. */",
  ":root {",
];
for (const [group, entries] of Object.entries(tokens))
  for (const [key, value] of Object.entries(entries)) {
    const unit =
      typeof value === "number" ? (key.endsWith("Ms") ? "ms" : "px") : "";
    lines.push(
      `  --glam-${group}-${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${value}${unit};`,
    );
  }
lines.push("}", "");
const result = lines.join("\n");
const destination = "apps/web/app/golden-tokens.css";
if (process.argv.includes("--check")) {
  if ((await readFile(destination, "utf8")) !== result)
    throw Error("Consumer design tokens are out of date");
} else await writeFile(destination, result);
