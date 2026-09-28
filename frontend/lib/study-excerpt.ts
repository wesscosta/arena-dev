export function studyExcerpt(value: string | null | undefined, max = 150) {
  if (!value) return "";
  const withoutFencedCode = value.replace(/```[\s\S]*?```/g, " ");
  const withoutMarkup = withoutFencedCode
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
