import type { ParticipantSelectorPresentation } from "@/lib/types";
import type { ParticipantSelectorMode } from "./selection.types";

const envMode = process.env.NEXT_PUBLIC_ARENA_SELECTOR_MODE;

export const DEFAULT_ARENA_SELECTOR_MODE: ParticipantSelectorMode =
  envMode === "legacy-wheel" || envMode === "wheel"
    ? "wheel"
    : "grid-spotlight";

export function presentationToSelectorMode(
  presentation?: ParticipantSelectorPresentation,
): ParticipantSelectorMode {
  if (presentation === "WHEEL") return "wheel";
  if (presentation === "GRID_SPOTLIGHT") return "grid-spotlight";
  return DEFAULT_ARENA_SELECTOR_MODE;
}

export function selectorModeToPresentation(
  mode: ParticipantSelectorMode,
): ParticipantSelectorPresentation {
  return mode === "wheel" ? "WHEEL" : "GRID_SPOTLIGHT";
}
