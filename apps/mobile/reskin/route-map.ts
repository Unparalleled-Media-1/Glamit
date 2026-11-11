import type { Page } from "../../../packages/product/platform";

/** Existing domain journeys are retained; distinct design variants do not imply new APIs. */
export const pageRoutes: Partial<Record<Page, string>> = {
  home: "home", analyze: "GL-017", consent: "GL-019", quality: "GL-023", goals: "TP-01",
  results: "GL-026", report: "GL-027", history: "GL-033", color: "GL-030", guide: "GL-032",
  studio: "GL-035", advisor: "GL-054", profile: "GL-117", privacy: "GL-130", explore: "GL-069",
  complete: "GL-093", screenshot: "GL-036", budget: "TP-10", booking: "GL-103", wardrobe: "GL-061",
  calendar: "GL-056", event: "GL-209", builder: "FB-03", offer: "GL-090", product: "GL-089",
  cart: "GL-095", checkout: "GL-098", orders: "GL-102", shop: "GL-085", destination: "GL-058",
};
export const routePages: Record<string, Page> = {};
for (const [page, route] of Object.entries(pageRoutes)) if (route && !routePages[route]) routePages[route] = page as Page;

export function routeForPage(page: Page) {
  return pageRoutes[page] || null;
}
