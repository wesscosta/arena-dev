import type { ContentOutlineNode } from "./learning-resource-api";
import type { LiveStageState } from "./live-stage-api";

/** A projection is ordered by authoritative stageVersion, never arrival time. */
export function reconcileStageVersion(current: LiveStageState, incoming: LiveStageState): LiveStageState {
  if (!current.sessionId || current.sessionId !== incoming.sessionId) return incoming;
  if (typeof incoming.stageVersion === "number" && typeof current.stageVersion === "number"
      && incoming.stageVersion < current.stageVersion) return current;
  return incoming;
}

/**
 * Stage carried by a realtime frame, applied in stageVersion order. Shared by
 * the projector and the student phone so a late frame never rolls either back.
 */
export function stageFromEvent(shown: LiveStageState, event: { type: string; payload: unknown }): LiveStageState {
  if (event.type === "LIVE_STAGE_STATE") return reconcileStageVersion(shown, event.payload as LiveStageState);
  if (event.type !== "RUNTIME_SNAPSHOT") return shown;
  const stage = (event.payload as { stage?: LiveStageState | null } | null)?.stage;
  return stage ? reconcileStageVersion(shown, stage) : shown;
}

/** Preserve canonical parser order, including nested and repeated headings. */
export function flattenMaterialOutline(nodes: ContentOutlineNode[]): ContentOutlineNode[] {
  return nodes.flatMap((node) => [node, ...flattenMaterialOutline(node.children)]);
}

export function sectionNumber(nodes: ContentOutlineNode[], anchor: string | null | undefined): number {
  if (!anchor) return -1;
  return flattenMaterialOutline(nodes).findIndex((node) => node.anchor === anchor);
}

/** Reconcile to rendered DOM without guessing slugs from translated/edited headings. */
export function renderedHeadingMatches(canonicalTitle: string, renderedText: string): boolean {
  return canonicalTitle.replace(/[*_`~]/g, "").trim().replace(/\s+/g, " ")
    === renderedText.trim().replace(/\s+/g, " ");
}
