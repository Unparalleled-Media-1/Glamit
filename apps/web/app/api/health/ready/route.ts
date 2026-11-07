import { deploymentRevision } from "../../../../lib/deployment-revision";
export const dynamic = "force-dynamic";
export function GET() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Response.json({ status: configured ? "ready" : "not_configured", service: "web", commit: deploymentRevision(), scope: "web_build_configuration", integrations_verified: false }, { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
