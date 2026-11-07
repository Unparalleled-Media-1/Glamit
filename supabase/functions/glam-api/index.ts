import { createHandler } from "./handler.ts";
const handler = createHandler({
  url: Deno.env.get("SUPABASE_URL") || "",
  publicKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
  origins: (Deno.env.get("GLAM_ALLOWED_ORIGINS") ||
    "https://unparalleled-media-1.github.io").split(",").map((v) => v.trim())
    .filter(Boolean),
  build: "glam-hosted-api-0013",
});
Deno.serve(handler);
