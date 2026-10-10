"use client";

import Link from "next/link";
import { SafeMarkdown } from "@/components/SafeMarkdown";
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
  return <article className={styles.readerArticle}>
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
