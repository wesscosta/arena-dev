export function studyExcerpt(value: string | null | undefined, max = 150) {
  if (!value) return "";
  const withoutFencedCode = value.replace(/```[\s\S]*?```/g, " ");
  // Table rows and rules never read as prose ("| Capítulo | Tema | --- |").
  const withoutTables = withoutFencedCode.replace(/^\s*\|.*\|\s*$/gm, " ").replace(/^\s*[-*_]{3,}\s*$/gm, " ");
  const withoutMarkup = withoutTables
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutMarkup) return "";
  return withoutMarkup.length <= max ? withoutMarkup : withoutMarkup.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
}

const comparable = (value: string) => value.toLowerCase().replace(/[|*_`~#>…:–—-]/g, " ").replace(/\s+/g, " ").trim();

/**
 * True when a description is only the opening of the body (imports derive it
 * from the first characters). Showing it above the body repeats the text, and
 * older imports even kept raw table syntax in it.
 */
export function isExcerptOfBody(description: string | null | undefined, body: string | null | undefined): boolean {
  if (!description || !body) return false;
  const opening = comparable(description).slice(0, 60);
  return opening.length >= 20 && comparable(body).startsWith(opening);
}
