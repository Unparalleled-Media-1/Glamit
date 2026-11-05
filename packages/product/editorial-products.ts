/** Fictional visual studies, never catalog offers, variants, prices or compatibility evidence. */
export const editorialProducts = [
  {
    id: "velvet-lip",
    name: "The velvet lip.",
    category: "Makeup",
    kind: "A color study",
    panel: 0,
    description:
      "Rich color. A considered finish. Explore a makeup direction through fictional, unbranded product imagery.",
    part: "Makeup",
  },
  {
    id: "rose-powder",
    name: "A touch of rose.",
    category: "Makeup",
    kind: "A complexion study",
    panel: 1,
    description:
      "A soft powder texture and a rose color story, shown as editorial inspiration rather than a verified cosmetic product.",
    part: "Makeup",
  },
  {
    id: "daily-ritual",
    name: "The daily ritual.",
    category: "Skincare",
    kind: "A texture study",
    panel: 2,
    description:
      "Frosted glass, a creamy texture and a slower getting-ready ritual. No ingredients, efficacy or compatibility are verified.",
    part: null,
  },
  {
    id: "hair-ritual",
    name: "In good company.",
    category: "Hair",
    kind: "A haircare study",
    panel: 3,
    description:
      "An amber bottle and a simple haircare ritual. The image is a packaging study, not a claim about a formula or its benefits.",
    part: "Hair",
  },
] as const;
export const productMoods = [
  { name: "Plum", color: "#71394e" },
  { name: "Rose", color: "#ba7b8b" },
  { name: "Nude", color: "#bc927d" },
] as const;
