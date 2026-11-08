import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist/interactive-preview");
const metadata = JSON.parse(
  await readFile(path.join(root, "build.json"), "utf8"),
);
const base = metadata.site_base;
const port = Number(process.env.PREVIEW_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("Choose a preview port from 1024 to 65535");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".webm": "video/webm",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    const u = new URL(req.url, "http://localhost");
    if (base && u.pathname !== base && !u.pathname.startsWith(base + "/")) {
      res.writeHead(404);
      return res.end();
    }
    let relative = decodeURIComponent(u.pathname.slice(base.length)).replace(
      /^\//,
      "",
    );
    let file = path.resolve(root, relative || "index.html");
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(404);
      return res.end();
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    await stat(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `GLAM Beauty interactive preview: http://127.0.0.1:${port}${base}/ (workspace-local; no live integrations)`,
  ),
);
