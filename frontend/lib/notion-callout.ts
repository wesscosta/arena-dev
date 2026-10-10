/** Recognize the block-level <aside> wrapper emitted by Notion Markdown export.
 * Only a well-formed wrapper at the start of a line is interpreted. Raw HTML is
 * NEVER rendered; the caller renders segment content through safe Markdown.
 */
export type MarkdownSegment = { kind: "markdown" | "aside"; content: string };

type Fence = { char: string; width: number } | null;

function toggleFence(line: string, fence: Fence): Fence {
  const found = /^ {0,3}(`{3,}|~{3,})/.exec(line);
  if (!found) return fence;
  const marker = found[1];
  if (!fence) return { char: marker[0], width: marker.length };
  if (marker[0] === fence.char && marker.length >= fence.width &&
      line.slice(found[0].length).trim() === "") return null;
  return fence;
}

export function splitNotionAsides(source: string): MarkdownSegment[] {
  const result: MarkdownSegment[] = [];
  const lines = source.split(/\r?\n/);
  let normal: string[] = [];
  let content: string[] = [];
  let inAside = false;
  let outerFence: Fence = null;
  let asideFence: Fence = null;
  let originalOpen = "";

  const flush = (kind: MarkdownSegment["kind"], buffer: string[]) => {
    const text = buffer.join("\n").trim();
    if (text) result.push({ kind, content: text });
  };
  for (const line of lines) {
    if (!inAside) {
      if (outerFence) {
        normal.push(line);
        outerFence = toggleFence(line, outerFence);
        continue;
      }
      const open = /^\s{0,3}<aside(?:\s+[^>]*)?>\s*(.*)$/i.exec(line);
      if (open) {
        inAside = true;
        content = [];
        originalOpen = line.slice(0, line.length - open[1].length);
        const closing = /^(.*?)\s*<\/aside>\s*$/i.exec(open[1]);
        if (closing) {
          content.push(closing[1]);
          flush("markdown", normal);
          normal = [];
          flush("aside", content);
          content = [];
          inAside = false;
        } else if (open[1]) {
          content.push(open[1]);
          asideFence = toggleFence(open[1], asideFence);
        }
        continue;
      }
      normal.push(line);
      outerFence = toggleFence(line, outerFence);
      continue;
    }

    // A closing tag inside a fenced code example belongs to that code, not the wrapper.
    if (!asideFence) {
      const closing = /^(.*?)\s*<\/aside>\s*$/i.exec(line);
      if (closing) {
        if (closing[1]) content.push(closing[1]);
        flush("markdown", normal);
        normal = [];
        flush("aside", content);
        content = [];
        inAside = false;
        continue;
      }
    }
    content.push(line);
    asideFence = toggleFence(line, asideFence);
  }

  if (inAside) {
    // Preserve malformed source rather than silently swallowing its contents.
    normal.push(originalOpen, ...content);
  }
  flush("markdown", normal);
  return result;
}
