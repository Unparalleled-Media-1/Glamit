/** Same frozen installers, with bounded/redacted CI failure evidence accessible in check annotations. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export function redactInstallOutput(text, env = process.env) {
  let result = String(text);
  for (const [name, value] of Object.entries(env)) {
    if (
      value &&
      value.length >= 8 &&
      /SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL/.test(name)
    ) {
      result = result.split(value).join("[REDACTED]");
    }
  }
  return result
    .replace(/https?:\/\/[^\s"'<>]+/g, "[URL REDACTED]")
    .replace(
      /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|\brlwy_[A-Za-z0-9_]+/g,
      "[REDACTED]",
    )
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}
export function failureSummary(text, env) {
  const clean = redactInstallOutput(text, env);
  const errors = clean
    .split(/\r?\n/)
    .filter((line) =>
      /error|failed|caused by|E[A-Z_]{3,}|no space|permission denied/i.test(
        line,
      ),
    );
  return (
    errors.length
      ? errors.slice(-8)
      : ["Frozen dependency install failed; inspect the job log."]
  )
    .join(" ")
    .slice(0, 1600);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (!["node", "python"].includes(mode))
    throw Error("EXPECTED_NODE_OR_PYTHON_INSTALL");
  const command = mode === "node" ? "npm" : "uv";
  const args =
    mode === "node" ? ["ci", "--ignore-scripts"] : ["sync", "--frozen"];
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const collect = (chunk) => {
    log = (log + chunk.toString()).slice(-2_000_000);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", (error) => collect(error.message));
  child.on("close", (code) => {
    process.stdout.write(redactInstallOutput(log));
    if (code !== 0 && process.env.GITHUB_ACTIONS === "true") {
      const message = failureSummary(log)
        .replaceAll("%", "%25")
        .replaceAll("\r", "%0D")
        .replaceAll("\n", "%0A");
      console.log(
        `::error title=Frozen ${mode} dependency install::${message}`,
      );
    }
    process.exitCode = code === 0 ? 0 : code || 1;
  });
}
