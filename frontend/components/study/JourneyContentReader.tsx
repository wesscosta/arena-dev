"use client";

import Link from "next/link";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { blockOutsideEditable } from "@/lib/copy-protection";
import type { JourneyContentDetailView } from "@/lib/study-api";
import styles from "./study.module.css";

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

export default function JourneyContentReader({ content }: { content: JourneyContentDetailView }) {
  const externalUrl = safeExternalUrl(content.sourceUrl);
  const isPlainText = content.format === "TEXT" || content.format === "PLAIN_TEXT";
  const protection = content.copyProtected ? {
    onCopy: blockOutsideEditable,
    onCut: blockOutsideEditable,
    onContextMenu: blockOutsideEditable,
    onDragStart: blockOutsideEditable,
  } : {};
  return <article className={`${styles.readerArticle} ${content.copyProtected ? styles.readerProtected : ""}`}
    data-copy-protected={content.copyProtected ? "true" : undefined} {...protection}>
    {content.copyProtected && <p className={styles.readerProtectedNote}>O professor desativou a cópia deste conteúdo.</p>}
    {content.body ? (isPlainText
      ? <div className={styles.readerPlainText}>{content.body}</div>
      : <div className={styles.readerMarkdown}><SafeMarkdown>{content.body}</SafeMarkdown></div>)
      : <div className={styles.readerEmpty}>Este conteúdo não possui texto incorporado.</div>}

    {externalUrl && <aside className={styles.readerSource}>
      <div><span>Material complementar</span><strong>{content.sourceLabel || "Abrir recurso externo"}</strong></div>
      <a href={externalUrl} target="_blank" rel="noopener noreferrer">Abrir em nova aba ↗</a>
    </aside>}
  </article>;
}
