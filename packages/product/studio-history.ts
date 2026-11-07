/** Reversible user choices only. Never store photos, provider outputs or inferred traits here. */
export type StudioChoice = {
  tool: string;
  style: string;
  intensity: number;
  family: "Rose" | "Bronze" | "Berry";
  shade: number;
  preset: number;
  marked: boolean;
};
function copyChoice(c: StudioChoice): StudioChoice {
  return {
    tool: c.tool,
    style: c.style,
    intensity: c.intensity,
    family: c.family,
    shade: c.shade,
    preset: c.preset,
    marked: c.marked,
  };
}
export function rememberChoice(
  history: StudioChoice[],
  choice: StudioChoice,
): StudioChoice[] {
  return [...history, copyChoice(choice)].slice(-20);
}
export function undoChoice(history: StudioChoice[]): {
  choice: StudioChoice | null;
  history: StudioChoice[];
} {
  return {
    choice: history.length ? copyChoice(history[history.length - 1]) : null,
    history: history.slice(0, -1),
  };
}
