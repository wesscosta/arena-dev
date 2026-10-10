import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared content policy for untrusted Library, Notion, Journey, draft and
 * projector Markdown. Raw HTML never becomes DOM. No inline remote resource,
 * automatic external navigation or checkbox may act on behalf of the viewer.
 * Safe HTTP(S)/internal links need explicit interaction and open securely.
 *
 * Canonical external source links are rendered separately after URL validation.
 * Custom headings are allowed for the Library outline but cannot relax the
 * security overrides.
 */
function safeLink(href?: string) {
  if (!href) return null;
  if (/^#[a-z0-9_-]+$/i.test(href) || /^\/(?!\/)/.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function SafeMarkdown({
  children, components, linkMode = "safe",
}: {
  children: string;
  components?: Components;
  linkMode?: "safe" | "disabled";
}) {
  const secureComponents: Components = {
    ...components,
    a: ({ href, children: label }: { href?: string; children?: ReactNode }) => {
      const destination = linkMode === "safe" ? safeLink(href) : null;
      return destination
        ? <a href={destination} target="_blank" rel="noopener noreferrer">{label}</a>
        : <span>{label}</span>;
    },
    img: () => null,
    input: () => null,
  };
  return (
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={secureComponents}>
      {children}
    </ReactMarkdown>
  );
}
