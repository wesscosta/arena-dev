import type { ContentOutlineNode } from "./learning-resource-api";
import type { LiveStageState } from "./live-stage-api";

/** A projection is ordered by authoritative stageVersion, never arrival time. */
export function reconcileStageVersion(current: LiveStageState, incoming: LiveStageState): LiveStageState {
  if (!current.sessionId || current.sessionId !== incoming.sessionId) return incoming;
  if (typeof incoming.stageVersion === "number" && typeof current.stageVersion === "number"
      && incoming.stageVersion < current.stageVersion) return current;
  return incoming;
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
