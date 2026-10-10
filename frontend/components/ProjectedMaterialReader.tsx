"use client";

import { useEffect, useRef } from "react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { splitNotionAsides } from "@/lib/notion-callout";
import type { PublicPresentedMaterial } from "@/lib/material-presentation-api";
import styles from "./ProjectedMaterialReader.module.css";
import { flattenMaterialOutline, sectionNumber, renderedHeadingMatches } from "@/lib/material-section-sync";

/**
 * Public renderer: Markdown only. Raw HTML, embedded images, interactive form
 * controls and navigable external links are intentionally disallowed.
 * The Notion <aside> wrapper is structural, not executable HTML.
 */
export function SafePresentationBody({ body, format }: Pick<PublicPresentedMaterial, "body" | "format">) {
  if (format === "PLAIN_TEXT") return <pre className={styles.plain}>{body}</pre>;

  const segments = splitNotionAsides(body);
  return <div className={styles.markdown}>
    {segments.map((segment, index) => {
      const content = <SafeMarkdown>
        {segment.content}
      </SafeMarkdown>;
      return segment.kind === "aside"
        ? <aside key={index} className={styles.callout} aria-label="Destaque do material">{content}</aside>
        : <div key={index} className={styles.segment}>{content}</div>;
    })}
  </div>;
}

export default function ProjectedMaterialReader({ material, anchor, stageVersion }: {
  material: PublicPresentedMaterial;
  anchor: string | null;
  stageVersion: number;
}) {
  const bodyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const region = bodyRef.current;
    if (!region) return;
    if (!anchor) { region.scrollTop = 0; return; }
    const nodes = flattenMaterialOutline(material.outline);
    const index = sectionNumber(material.outline, anchor);
    if (index < 0) return;
    const headings = region.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6");
    const target = headings.item(index);
    // The server's immutable outline is the sole authority. If the renderer's
    // heading order diverges, do not jump to a different heading.
    if (!target || !renderedHeadingMatches(nodes[index].title, target.textContent ?? "")) return;
    const regionRect = region.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    region.scrollTo({ top: region.scrollTop + targetRect.top - regionRect.top - 12, behavior: "instant" });
  }, [material, anchor, stageVersion]);

  return <article className={styles.reader} data-testid="projector-material-stage"
    aria-label={`Material apresentado: ${material.title}`}>
    <header className={styles.heading}>
      <span className={styles.eyebrow}>MATERIAL DA AULA · LEITURA GUIADA</span>
      <h1>{material.title}</h1>
      <span className={styles.revision}>Versão apresentada · revisão {material.revision}</span>
    </header>
    <section ref={bodyRef} className={styles.body} tabIndex={0}
      aria-label="Conteúdo publicado para o projetor">
      <SafePresentationBody body={material.body} format={material.format} />
    </section>
  </article>;
}
