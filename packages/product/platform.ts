/** Shared application contracts. No provider output or business authority is synthesized here. */
export const mobileTabs = [
  "Home",
  "Analyze",
  "AI Studio",
  "AI Advisor",
  "Profile",
] as const;
export const webTabs = [
  "Home",
  "Face Analysis",
  "Color Analysis",
  "AI Studio",
  "My Glow-Up Guide",
  "AI Advisor",
] as const;
export const interests = [
  "Glam & Baddie",
  "Career & Professional",
  "Everyday & Family",
  "Gaming & Fandom",
  "Men’s Style & Grooming",
  "Modest & Cultural",
  "Fitness & Active",
  "Alternative & Creative",
  "Budget & Sustainable",
  "Events & Celebrations",
];
export const goals = [
  "Understand my features",
  "Discover my colors",
  "Makeup techniques",
  "Hair & grooming",
  "A practical routine",
];
export const tools = [
  "Glow-Up Preview",
  "Hair Try-On",
  "Hair Color",
  "Makeup Match",
  "Look Remix",
];
export const styles = [
  "Natural",
  "Braids",
  "Locs",
  "Wigs",
  "Curly",
  "Coily",
  "Barbering",
  "Beard & grooming",
  "Occasion",
];
export const reportFields = [
  "Face shape",
  "Eye shape",
  "Brows",
  "Lip features",
  "Facial proportions",
  "Skin tone",
  "Estimated undertone",
];
export type Page =
  | "home"
  | "analyze"
  | "hair"
  | "skin"
  | "body-fit"
  | "consent"
  | "quality"
  | "goals"
  | "report"
  | "color"
  | "guide"
  | "studio"
  | "advisor"
  | "profile"
  | "history"
  | "privacy"
  | "explore"
  | "complete"
  | "screenshot"
  | "budget"
  | "booking"
  | "wardrobe"
  | "calendar"
  | "groups"
  | "agent";
export const tabPage: Record<string, Page> = {
  Home: "home",
  Analyze: "analyze",
  "Face Analysis": "analyze",
  "Color Analysis": "color",
  "AI Studio": "studio",
  "My Glow-Up Guide": "guide",
  "AI Advisor": "advisor",
  Profile: "profile",
};
export type Role =
  | "merchant"
  | "advertiser"
  | "professional"
  | "creator"
  | "affiliate";
export type Module = { name: string; fields: readonly string[] };
const m = (name: string, ...fields: string[]): Module => ({ name, fields });
export const workspaces: Record<
  Role,
  { title: string; mobile: readonly string[]; modules: Module[] }
> = {
  merchant: {
    title: "Merchant / Brand",
    mobile: [
      "Dashboard",
      "Products",
      "Orders / Leads",
      "Promotions",
      "Profile",
    ],
    modules: [
      m("Overview", "Catalog coverage", "Source freshness"),
      m(
        "Snap & List",
        "Original product images",
        "AI preparation",
        "Merchant review",
        "Publication",
      ),
      m("My Products", "Approved revisions", "Source facts"),
      m("Draft Listings", "Merchant-owned drafts", "Review state"),
      m(
        "Catalog Health",
        "Missing facts",
        "Source freshness",
        "Stock and media",
      ),
      m("Storefront", "Public name", "Support contact", "Returns policy"),
      m(
        "Product Catalog",
        "Product title",
        "Category",
        "Source SKU",
        "Rights reference",
      ),
      m("Inventory", "SKU", "Source revision", "Quantity evidence"),
      m(
        "Product Variants",
        "SKU",
        "Size chart",
        "Materials",
        "Variant reference",
      ),
      m("Offers", "Source offer", "Currency", "Delivered cost evidence"),
      m(
        "Orders / Referrals",
        "Source reference",
        "Seller responsibility",
        "Support state",
      ),
      m("Advertising", "Eligible offers", "Placement", "Disclosure"),
      m("Analytics", "Interval", "Event definition", "Freshness"),
      m("Billing", "Invoice reference", "Reconciliation state"),
      m("Integrations", "Feed type", "Authorized source", "Refresh interval"),
      m("Reviews", "Verified event", "Moderation state"),
      m("Settings", "Organization", "Team scope", "Region"),
    ],
  },
  advertiser: {
    title: "Advertiser",
    mobile: ["Dashboard", "Campaigns", "Analytics", "Billing", "Profile"],
    modules: [
      m("Overview", "Reporting interval", "Qualified events"),
      m("Campaigns", "Campaign name", "Objective", "Schedule"),
      m(
        "Create Campaign",
        "Objective",
        "Eligible products",
        "Placement",
        "Budget cap",
        "Creative",
        "Disclosure",
      ),
      m("Sponsored Products", "Source offer", "Eligibility", "Sponsored label"),
      m("Sponsored Looks", "Look rights", "Disclosure", "Eligible offers"),
      m(
        "Creative Library",
        "Asset rights",
        "Accessible description",
        "Destination",
      ),
      m(
        "Audiences & Placements",
        "Permitted context",
        "Region",
        "Frequency cap",
      ),
      m("Budgets", "Currency", "Hard cap", "Review owner"),
      m("Billing", "Invoice reference", "Adjustment evidence"),
      m("Performance Reports", "Interval", "Attribution rule", "Freshness"),
      m(
        "Conversion Tracking",
        "Verified event",
        "Deduplication key",
        "Refund window",
      ),
      m("Account Settings", "Organization", "Authorized team", "Brand safety"),
    ],
  },
  professional: {
    title: "Beauty Professional",
    mobile: ["Dashboard", "Bookings", "Portfolio", "Clients", "Profile"],
    modules: [
      m(
        "Profile",
        "Service region",
        "Qualification reference",
        "Support contact",
      ),
      m("Portfolio", "Image rights", "Authorized style", "Description"),
      m("Services & Prices", "Service", "Materials", "Full quote terms"),
      m("Availability", "Timezone", "Working hours", "Resource"),
      m("Bookings", "Request reference", "Verified slot", "Cancellation terms"),
      m(
        "Look Requests",
        "Authorized reference",
        "Feasibility",
        "Materials",
        "Full-price quote",
      ),
      m("Client Messages", "Case reference", "Permitted context"),
      m("Reviews", "Completed service", "Moderation"),
      m("Promotions", "Qualified service", "Terms", "Disclosure"),
      m("Earnings", "Recognized event", "Adjustments"),
      m("Settings", "Organization", "Team", "Service area"),
    ],
  },
  creator: {
    title: "Creator / Influencer",
    mobile: ["Dashboard", "Create", "My Looks", "Earnings", "Profile"],
    modules: [
      m("Creator Profile", "Public name", "Original voice", "Rights policy"),
      m("My Looks", "Title", "Style description", "Asset rights"),
      m("Tutorials", "Title", "Step-by-step instructions", "Rights reference"),
      m(
        "Shoppable Collections",
        "Collection title",
        "Qualified offers",
        "Affiliate disclosure",
      ),
      m("Affiliate Links", "Approved destination", "Disclosure", "Expiry"),
      m("Brand Campaigns", "Deliverables", "Rights", "Compensation terms"),
      m("Audience Analytics", "Aggregate interval", "Privacy threshold"),
      m("Earnings", "Verified event", "Commission terms"),
      m("Payouts", "Recognized balance", "Settlement evidence"),
      m("Settings", "Organization", "Publication preferences"),
    ],
  },
  affiliate: {
    title: "Affiliate / Partner",
    mobile: ["Dashboard", "Links", "Conversions", "Earnings", "Profile"],
    modules: [
      m("Overview", "Verified events", "Reporting interval"),
      m("Links", "Approved destination", "Disclosure", "Expiry"),
      m("Collections", "Title", "Offer source", "Disclosure"),
      m("Conversions", "Verified event", "Attribution window", "Refund state"),
      m("Earnings", "Recognized commission", "Adjustments"),
      m("Payouts", "Settlement evidence", "Verified destination"),
      m("Settings", "Partner agreement", "Organization"),
    ],
  },
};
export const adminModules = [
  "Executive Overview",
  "User Management",
  "AI Operations",
  "Beauty Content",
  "Merchant Management",
  "Professional Management",
  "Advertising",
  "Commerce",
  "Subscriptions",
  "Creators & Partners",
  "Regional Operations",
  "Trust & Safety",
  "Privacy",
  "Analytics",
  "System Configuration",
];
export const adminRoles = [
  "Super Admin",
  "Support",
  "Finance",
  "AI Operations",
  "Content Moderation",
  "Trust & Safety",
  "Compliance",
  "Regional Operations",
  "Read-Only Analyst",
];
export const campaignSteps = [
  "Objective",
  "Eligible products",
  "Placement",
  "Budget",
  "Creative",
  "Review",
  "Launch",
];
export interface Step {
  id: string;
  text: string;
  done: boolean;
}
export interface Routine {
  id: string;
  title: string;
  steps: Step[];
}
export interface Photo {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  name: string;
}
export function photoIssue(
  photo: Pick<Photo, "bytes" | "width" | "height">,
): string | null {
  if (photo.bytes > 10 * 1024 * 1024)
    return "Choose an image smaller than 10 MB.";
  if (photo.width < 480 || photo.height < 480)
    return "Use an image at least 480 × 480 pixels.";
  if (photo.width * photo.height > 40000000)
    return "Choose an image below 40 megapixels.";
  return null;
}
export interface PersonalState {
  page: Page;
  goals: string[];
  interests: string[];
  routines: Routine[];
  tool: string;
  style: string;
  intensity: number;
}
export const initialPersonal: PersonalState = {
  page: "home",
  goals: [],
  interests: [],
  routines: [],
  tool: tools[0],
  style: styles[0],
  intensity: 35,
};
export type Action =
  | { type: "navigate"; page: Page }
  | { type: "toggle"; key: "goals" | "interests"; value: string }
  | { type: "tool"; value: string }
  | { type: "style"; value: string }
  | { type: "intensity"; value: number }
  | { type: "save-routine"; routine: Routine }
  | { type: "step"; routine: string; step: string }
  | { type: "delete-routine"; id: string }
  | { type: "reset" };
export function personalReducer(
  state: PersonalState,
  action: Action,
): PersonalState {
  switch (action.type) {
    case "navigate":
      return { ...state, page: action.page };
    case "toggle":
      return {
        ...state,
        [action.key]: state[action.key].includes(action.value)
          ? state[action.key].filter((v) => v !== action.value)
          : [...state[action.key], action.value],
      };
    case "tool":
      return tools.includes(action.value)
        ? { ...state, tool: action.value }
        : state;
    case "style":
      return styles.includes(action.value)
        ? { ...state, style: action.value }
        : state;
    case "intensity":
      return { ...state, intensity: Math.max(0, Math.min(100, action.value)) };
    case "save-routine":
      return {
        ...state,
        routines: [
          ...state.routines.filter((r) => r.id !== action.routine.id),
          action.routine,
        ],
      };
    case "step":
      return {
        ...state,
        routines: state.routines.map((r) =>
          r.id === action.routine
            ? {
                ...r,
                steps: r.steps.map((s) =>
                  s.id === action.step ? { ...s, done: !s.done } : s,
                ),
              }
            : r,
        ),
      };
    case "delete-routine":
      return {
        ...state,
        routines: state.routines.filter((r) => r.id !== action.id),
      };
    case "reset":
      return { ...initialPersonal };
  }
}
export const capabilityReasons = {
  analysis:
    "Analysis provider, identity and eligibility checks are not connected. No photo has been uploaded or analyzed.",
  studio:
    "Makeover generation is not connected. Your original remains unchanged.",
  advisor: "The AI Advisor is not connected. Your message has not been sent.",
  commerce:
    "No verified catalog or professional is connected. Price, stock, delivery and availability are unknown.",
  account:
    "Google / Supabase connection is deferred. No authenticated session is active.",
};
