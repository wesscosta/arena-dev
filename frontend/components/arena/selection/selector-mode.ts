import type { ParticipantSelectorMode } from "./selection.types";

export const ARENA_SELECTOR_MODE: ParticipantSelectorMode =
  process.env.NEXT_PUBLIC_ARENA_SELECTOR_MODE === "legacy-wheel"
    ? "legacy-wheel"
    : "grid-spotlight";
