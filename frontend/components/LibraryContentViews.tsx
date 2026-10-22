"use client";

import { useState, type JSX, type ReactNode } from "react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import type { ContentOutlineNode } from "@/lib/learning-resource-api";
import { splitNotionAsides } from "@/lib/notion-callout";
import styles from "./LibraryWorkspace.module.css";

type Navigate = (anchor: string) => void;

function textFromNode(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textFromNode).join("");
  if (value && typeof value === "object" && "props" in value) {
    return textFromNode((value as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function baseSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "secao";
}

function headingId(value: string, counts: Map<string, number>) {
  const base = baseSlug(value);
  const count = (counts.get(base) ?? 0) + 1;
  counts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

export function AnchoredMarkdown({ children }: { children: string }) {
  const counts = new Map<string, number>();
  const heading = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    function Heading({ children: headingChildren }: { children?: ReactNode }) {
      const id = headingId(textFromNode(headingChildren), counts);
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag id={id}>{headingChildren}</Tag>;
    };

  const segments = splitNotionAsides(children);
  const markdownComponents = {
    h1: heading(1), h2: heading(2), h3: heading(3),
    h4: heading(4), h5: heading(5), h6: heading(6),
  };
  return (
    <div className={styles.markdown}>
      {segments.map((segment, index) => {
        const formatted = (
          <SafeMarkdown components={markdownComponents}>
            {segment.content}
          </SafeMarkdown>
        );
        return segment.kind === "aside"
          ? <aside className={styles.notionCallout} aria-label="Destaque do conteúdo" key={index}>{formatted}</aside>
          : <div key={index} className={styles.markdownSection}>{formatted}</div>;
      })}
    </div>
  );
}

function defaultNavigate(anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (target instanceof HTMLElement) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

function OutlineBranch({ nodes, depth = 0, onNavigate }: {
  nodes: ContentOutlineNode[];
  depth?: number;
  onNavigate: Navigate;
}) {
  return (
    <ul className={styles.outlineList} data-depth={depth}>
      {nodes.map((node) => (
        <li key={node.anchor}>
          <button type="button" className={styles.outlineNode} onClick={() => onNavigate(node.anchor)}>
            <span>H{node.level}</span><strong>{node.title}</strong>
          </button>
          {node.children.length > 0 && <OutlineBranch nodes={node.children} depth={depth + 1} onNavigate={onNavigate} />}
        </li>
      ))}
    </ul>
  );
}

export function ContentOutlineView({ outline, onNavigate = defaultNavigate }: {
  outline: ContentOutlineNode[];
  onNavigate?: Navigate;
}) {
  if (!outline.length) return (
    <div className={styles.projectionEmpty}>
      <strong>Estrutura não detectada</strong>
      <p>Adicione headings ao Markdown para gerar navegação estrutural e o Mapa do conteúdo.</p>
    </div>
  );
  return (
    <section className={styles.outlinePanel} aria-label="Estrutura do conteúdo">
      <div className={styles.projectionIntro}>
        <strong>Estrutura do conteúdo</strong>
        <span>Hierarquia derivada do material. Selecione um tópico para voltar à leitura.</span>
      </div>
      <OutlineBranch nodes={outline} onNavigate={onNavigate} />
    </section>
  );
}

const MAP_INITIAL_NODE_BUDGET = 24;

/* Opens whole levels, breadth first, while the visible node count stays within the budget,
   so a short material shows everything and a long one shows only its first levels. */
function initiallyExpanded(branches: ContentOutlineNode[]) {
  const expanded = new Set<string>();
  let visible = branches.length;
  let level = branches;
  while (level.length) {
    const parents = level.filter((node) => node.children.length > 0);
    const opened = parents.reduce((sum, node) => sum + node.children.length, 0);
    if (!parents.length || visible + opened > MAP_INITIAL_NODE_BUDGET) break;
    parents.forEach((node) => expanded.add(node.anchor));
    visible += opened;
    level = parents.flatMap((node) => node.children);
  }
  return expanded;
}

function collectParents(nodes: ContentOutlineNode[], into = new Set<string>()) {
  nodes.forEach((node) => {
    if (node.children.length) {
      into.add(node.anchor);
      collectParents(node.children, into);
    }
  });
  return into;
}

function countDescendants(node: ContentOutlineNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function MapBranch({ node, depth, branch, expanded, onToggle, onNavigate }: {
  node: ContentOutlineNode;
  depth: number;
  branch?: number;
  expanded: Set<string>;
  onToggle: (anchor: string) => void;
  onNavigate: Navigate;
}) {
  const open = expanded.has(node.anchor);
  const hidden = countDescendants(node);
  return (
    <li className={styles.mindItem} data-depth={depth} data-branch={branch}>
      <div className={styles.mindRow}>
        <button className={styles.mindNode} type="button" title={node.title} onClick={() => onNavigate(node.anchor)}>
          {node.title}
        </button>
        {node.children.length > 0 && (
          <button
            className={styles.mindToggle}
            type="button"
            aria-expanded={open}
            aria-label={open ? `Recolher ${node.title}` : `Expandir ${node.title} (${hidden} ${hidden === 1 ? "tópico" : "tópicos"})`}
            onClick={() => onToggle(node.anchor)}
          >
            {open ? <span aria-hidden="true" className={styles.mindMinus} /> : <span aria-hidden="true">{hidden}</span>}
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.mindChildren}>
          {node.children.map((child) => (
            <MapBranch key={child.anchor} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ContentMapView({ outline, title, onNavigate = defaultNavigate }: {
  outline: ContentOutlineNode[];
  title?: string;
  onNavigate?: Navigate;
}) {
  // A single top-level heading is the material's own title: it becomes the center of the map.
  const root = outline.length === 1 ? outline[0] : null;
  const branches = root ? root.children : outline;
  const [expanded, setExpanded] = useState(() => initiallyExpanded(branches));

  if (!outline.length) return (
    <div className={styles.projectionEmpty}>
      <strong>Mapa indisponível para este material</strong>
      <p>O mapa é uma projeção da hierarquia real do conteúdo; ele não inventa tópicos ausentes na fonte.</p>
    </div>
  );

  const toggle = (anchor: string) => setExpanded((current) => {
    const next = new Set(current);
    if (!next.delete(anchor)) next.add(anchor);
    return next;
  });
  const rootTitle = root?.title ?? title ?? "Material";

  return (
    <section className={styles.mapPanel} aria-label="Mapa do conteúdo">
      <div className={styles.mapHeader}>
        <div className={styles.projectionIntro}>
          <strong>Mapa do conteúdo</strong>
          <span>Projeção navegável da estrutura do material. Não representa Mastery nem taxonomia global.</span>
        </div>
        <div className={styles.mapActions}>
          <button type="button" onClick={() => setExpanded(collectParents(branches))}>Expandir tudo</button>
          <button type="button" onClick={() => setExpanded(new Set())}>Recolher tudo</button>
        </div>
      </div>
      <div className={styles.mapViewport}>
        <div className={styles.mindMap}>
          {root
            ? <button className={styles.mindRoot} type="button" title={rootTitle} onClick={() => onNavigate(root.anchor)}>{rootTitle}</button>
            : <strong className={styles.mindRoot} title={rootTitle}>{rootTitle}</strong>}
          {branches.length > 0 && (
            <ul className={styles.mindChildren}>
              {branches.map((node, index) => (
                <MapBranch key={node.anchor} node={node} depth={1} branch={index % 6} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
