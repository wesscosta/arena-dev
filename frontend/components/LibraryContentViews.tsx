"use client";

import type { JSX, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentOutlineNode } from "@/lib/learning-resource-api";
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

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6) }}
      >
        {children}
      </ReactMarkdown>
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

function MapBranch({ node, depth = 0, onNavigate }: {
  node: ContentOutlineNode;
  depth?: number;
  onNavigate: Navigate;
}) {
  return (
    <div className={styles.mapBranch} data-depth={depth}>
      <button className={styles.mapNode} type="button" onClick={() => onNavigate(node.anchor)}>
        <small>H{node.level}</small><strong>{node.title}</strong>
      </button>
      {node.children.length > 0 && (
        <div className={styles.mapChildren}>
          {node.children.map((child) => <MapBranch key={child.anchor} node={child} depth={depth + 1} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  );
}

export function ContentMapView({ outline, onNavigate = defaultNavigate }: {
  outline: ContentOutlineNode[];
  onNavigate?: Navigate;
}) {
  if (!outline.length) return (
    <div className={styles.projectionEmpty}>
      <strong>Mapa indisponível para este material</strong>
      <p>O mapa é uma projeção da hierarquia real do conteúdo; ele não inventa tópicos ausentes na fonte.</p>
    </div>
  );
  return (
    <section className={styles.mapPanel} aria-label="Mapa do conteúdo">
      <div className={styles.projectionIntro}>
        <strong>Mapa do conteúdo</strong>
        <span>Projeção navegável da estrutura do material. Não representa Mastery nem taxonomia global.</span>
      </div>
      <div className={styles.mapViewport}>
        <div className={styles.mapForest}>
          {outline.map((node) => <MapBranch key={node.anchor} node={node} onNavigate={onNavigate} />)}
        </div>
      </div>
    </section>
  );
}
