/** Explicit editorial choices, not inferred suitability, product shades or AI results. */
export const beautyCategories = [
  "Makeup",
  "Hair",
  "Skincare",
  "Clothing",
] as const;
export type BeautyCategory = (typeof beautyCategories)[number];
export const beautyEdits = [
  {
    name: "Soft bronze",
    detail: "Warm definition. A softer finish.",
    panel: 0,
    tool: "Makeup Match",
  },
  {
    name: "Rose after hours",
    detail: "A little color. A little confidence.",
    panel: 1,
    tool: "Makeup Match",
  },
  {
    name: "Everyday natural",
    detail: "Your features, in their own light.",
    panel: 2,
    tool: "Glow-Up Preview",
  },
  {
    name: "Clean & considered",
    detail: "A fresh approach to grooming.",
    panel: 3,
    tool: "Hair Try-On",
  },
];
export const shadeFamilies = {
  Rose: ["#a34d60", "#b76d78", "#cf8d94", "#dda5a3", "#8c3f54"],
  Bronze: ["#7b4c3e", "#985c48", "#b87c5e", "#cf9d7d", "#e4baa0"],
  Berry: ["#652c45", "#893f5e", "#a95073", "#bb718c", "#d393a6"],
} as const;
export const colorMoods = {
  "Warm neutrals": [
    "#ead9c5",
    "#d5ab83",
    "#aa7050",
    "#7c5144",
    "#444b3c",
    "#dca270",
  ],
  "Cool expression": [
    "#e4dced",
    "#b5a4bf",
    "#797996",
    "#4e647a",
    "#804e6b",
    "#c98b9d",
  ],
  "Fresh contrast": [
    "#f2efe4",
    "#c5d1b4",
    "#749c8e",
    "#335d50",
    "#342c32",
    "#d49f9d",
  ],
} as const;

export function studioDirections(tool: string): string[] {
  if (tool === "Makeup Match")
    return [
      "Natural",
      "Soft bronze",
      "Rose accents",
      "Statement lip",
      "Smoky definition",
    ];
  if (tool === "Look Remix")
    return [
      "Natural",
      "Fluid tailoring",
      "Relaxed layers",
      "Occasion",
      "Minimal",
    ];
  if (tool === "Glow-Up Preview")
    return ["Natural", "Soft glam", "Evening", "Everyday"];
  return [
    "Natural",
    "Braids",
    "Locs",
    "Wigs",
    "Curly",
    "Coily",
    "Barbering",
    "Beard & grooming",
  ];
}
export function studioPart(tool: string): "Hair" | "Makeup" | "Clothing" {
  return tool === "Look Remix"
    ? "Clothing"
    : tool === "Hair Try-On" || tool === "Hair Color"
      ? "Hair"
      : "Makeup";
}
