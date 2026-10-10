import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared content policy for untrusted Library, Notion, Journey, draft and
 * projector Markdown. Raw HTML never becomes DOM. No inline remote resource,
 * navigable Markdown URL or checkbox may act on behalf of the viewer.
 *
 * Canonical external source links are rendered separately after URL validation.
 * Custom headings are allowed for the Library outline but cannot relax the
 * security overrides.
 */
export function SafeMarkdown({
  children, components,
}: {
  children: string;
  components?: Components;
}) {
  const secureComponents: Components = {
    ...components,
    a: ({ children: label }: { children?: ReactNode }) => <span>{label}</span>,
    img: () => null,
    input: () => null,
  };
  return (
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={secureComponents}>
      {children}
    </ReactMarkdown>
  );
}
