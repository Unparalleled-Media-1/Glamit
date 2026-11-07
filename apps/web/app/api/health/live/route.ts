import { deploymentRevision } from "../../../../lib/deployment-revision";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "alive", service: "web", commit: deploymentRevision() }, { headers: { "Cache-Control": "no-store" } });
}
