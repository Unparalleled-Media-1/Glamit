import { notFound } from "next/navigation";
import GlamApp from "../../components/GlamApp";
import type { Page } from "../../../../packages/product/platform";
const sections = [
  "event",
  "builder",
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
];
export const dynamicParams = false;
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <GlamApp start={section as Page} />;
}
