import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { splitNotionAsides } from "@/lib/notion-callout";
import type { PublicPresentedMaterial } from "@/lib/material-presentation-api";
import styles from "./ProjectedMaterialReader.module.css";

/**
 * Public renderer: Markdown only. Raw HTML, embedded images, interactive form
 * controls and navigable external links are intentionally disallowed.
 * The Notion <aside> wrapper is structural, not executable HTML.
 */
export function SafePresentationBody({ body, format }: Pick<PublicPresentedMaterial, "body" | "format">) {
  if (format === "PLAIN_TEXT") return <pre className={styles.plain}>{body}</pre>;

  const segments = splitNotionAsides(body);
  const components = {
    a: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    img: () => null,
    input: () => null,
  };
  return <div className={styles.markdown}>
    {segments.map((segment, index) => {
      const content = <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={components}>
        {segment.content}
      </ReactMarkdown>;
      return segment.kind === "aside"
        ? <aside key={index} className={styles.callout} aria-label="Destaque do material">{content}</aside>
        : <div key={index} className={styles.segment}>{content}</div>;
    })}
  </div>;
}

export default function ProjectedMaterialReader({ material }: { material: PublicPresentedMaterial }) {
  return <article className={styles.reader} data-testid="projector-material-stage"
    aria-label={`Material apresentado: ${material.title}`}>
    <header className={styles.heading}>
      <span className={styles.eyebrow}>MATERIAL DA AULA · LEITURA GUIADA</span>
      <h1>{material.title}</h1>
      <span className={styles.revision}>Versão apresentada · revisão {material.revision}</span>
    </header>
    <section className={styles.body} aria-label="Conteúdo publicado para o projetor">
      <SafePresentationBody body={material.body} format={material.format} />
    </section>
  </article>;
}
