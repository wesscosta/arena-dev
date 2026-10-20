"use client";

import { useMemo, useState } from "react";
import {
  materializeLibraryImport,
  previewLibraryFile,
  previewLibraryImport,
  type LibraryImportPreview,
  type LibraryIngestionSource,
} from "@/lib/library-ingestion-api";
import type { LearningResource } from "@/lib/learning-resource-api";
import { ContentOutlineView } from "./LibraryContentViews";
import styles from "./LibraryWorkspace.module.css";
import type { Notify } from "@/components/ui";

type Props = {
  onCancel: () => void;
  onImported: (resource: LearningResource) => void;
  notify: Notify;
};

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase("pt-BR") ===
            item.toLocaleLowerCase("pt-BR"),
        ) === index,
    )
    .slice(0, 20);
}

export default function LibraryImportPanel({
  onCancel,
  onImported,
  notify,
}: Props) {
  const [source, setSource] = useState<LibraryIngestionSource>("MARKDOWN");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [subject, setSubject] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LibraryImportPreview | null>(null);
  const [canonicalBody, setCanonicalBody] = useState("");
  const [busy, setBusy] = useState(false);

  const tagValues = useMemo(() => splitTags(tags), [tags]);

  async function analyze() {
    if (busy) return;
    if (source === "FILE" && !file) {
      notify("Selecione um arquivo para analisar.");
      return;
    }
    if ((source === "MARKDOWN" || source === "TEXT") && !content.trim()) {
      notify("Cole o conteúdo que deseja importar.");
      return;
    }
    if ((source === "NOTION" || source === "URL") && !sourceUrl.trim()) {
      notify("Informe a URL do material.");
      return;
    }

    setBusy(true);
    try {
      const metadata = {
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        subject: subject.trim() || undefined,
        tags: tagValues,
        language: language.trim() || undefined,
      };
      const result =
        source === "FILE" && file
          ? await previewLibraryFile(file, metadata)
          : await previewLibraryImport({
              source,
              ...metadata,
              content:
                source === "MARKDOWN" || source === "TEXT"
                  ? content
                  : undefined,
              sourceUrl:
                source === "NOTION" || source === "URL"
                  ? sourceUrl.trim()
                  : undefined,
              sourceLabel: sourceLabel.trim() || undefined,
            });
      setPreview(result);
      setTitle(result.title ?? "");
      setSummary(result.summary ?? "");
      setSubject(result.subject ?? "");
      setTags(result.tags.join(", "));
      setLanguage(result.language ?? "pt-BR");
      setCanonicalBody(result.body ?? "");
      notify("Estrutura analisada. Revise o material antes de importar.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível analisar o material.", "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshStructure() {
    if (!preview || busy) return;
    if (!canonicalBody.trim()) {
      notify("O conteúdo está vazio.");
      return;
    }
    setBusy(true);
    try {
      const refreshed = await previewLibraryImport({
        source: "MARKDOWN",
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        subject: subject.trim() || undefined,
        tags: tagValues,
        language: language.trim() || undefined,
        content: canonicalBody,
        sourceLabel: preview.sourceLabel ?? undefined,
      });
      setPreview({
        ...preview,
        title: refreshed.title,
        summary: refreshed.summary,
        subject: refreshed.subject,
        tags: refreshed.tags,
        language: refreshed.language,
        body: refreshed.body,
        parserVersion: refreshed.parserVersion,
        outline: refreshed.outline,
        structureAnalysis: refreshed.structureAnalysis,
      });
      setCanonicalBody(refreshed.body ?? "");
      notify("Estrutura recalculada sem alterar a proveniência da fonte.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível recalcular a estrutura.", "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function materialize() {
    if (!preview || busy) return;
    if (!title.trim()) {
      notify("Informe um título para o material.");
      return;
    }
    setBusy(true);
    try {
      const saved = await materializeLibraryImport(preview, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        subject: subject.trim() || undefined,
        tags: tagValues,
        language: language.trim() || undefined,
        body: canonicalBody || undefined,
      });
      onImported(saved);
      notify("Material importado para a Biblioteca.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o material.", "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.workspace}>
      <button className={styles.back} type="button" onClick={onCancel}>
        ← Biblioteca
      </button>

      <header className={styles.heading}>
        <div>
          <span>IMPORTAÇÃO</span>
          <h2>Importar material</h2>
          <p>
            A Arena preserva estrutura e proveniência. Conteúdo bem estruturado
            é processado deterministicamente, sem depender de IA.
          </p>
        </div>
      </header>

      {!preview ? (
        <div className={styles.importForm}>
          <div className={styles.importSourceGrid}>
            {(
              [
                ["MARKDOWN", "Markdown", "Preserva H1–H6 e código."],
                ["NOTION", "Notion", "Usa snapshot autorizado quando disponível."],
                ["FILE", "Arquivo", "PDF, DOCX, PPTX, MD ou TXT."],
                ["TEXT", "Texto", "Detecta títulos simples e converte para Markdown."],
                ["URL", "Link", "Mantém referência externa sem scraping."],
              ] as Array<[LibraryIngestionSource, string, string]>
            ).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                className={
                  source === value
                    ? styles.importSourceActive
                    : styles.importSource
                }
                aria-pressed={source === value}
                onClick={() => setSource(value)}
              >
                <strong>{label}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>

          <div className={styles.editorMeta}>
            <label>
              <span>Título opcional</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Pode ser sugerido pela fonte"
              />
            </label>
            <label>
              <span>Assunto</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ex.: Banco de Dados"
              />
            </label>
            <label>
              <span>Tags</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="SQL, SELECT, consultas"
              />
            </label>
            <label>
              <span>Idioma</span>
              <input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="pt-BR"
              />
            </label>
          </div>

          <label className={styles.fullField}>
            <span>Descrição opcional</span>
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Contexto editorial do material"
            />
          </label>

          {(source === "MARKDOWN" || source === "TEXT") && (
            <label className={styles.fullField}>
              <span>{source === "MARKDOWN" ? "Markdown" : "Texto"}</span>
              <textarea
                className={styles.importTextarea}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  source === "MARKDOWN"
                    ? "# Título\n\n## Capítulo\n\n### Tópico"
                    : "Cole o conteúdo do material..."
                }
              />
            </label>
          )}

          {source === "FILE" && (
            <label className={styles.fileField}>
              <span>Arquivo</span>
              <input
                type="file"
                accept=".md,.markdown,.txt,.pdf,.doc,.docx,.ppt,.pptx"
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
              />
              <small>
                Até 20 MB. Arquivos estruturados produzem resultados mais
                confiáveis.
              </small>
            </label>
          )}

          {(source === "NOTION" || source === "URL") && (
            <div className={styles.editorMeta}>
              <label>
                <span>{source === "NOTION" ? "URL do Notion" : "URL"}</span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label>
                <span>Rótulo da fonte</span>
                <input
                  value={sourceLabel}
                  onChange={(event) => setSourceLabel(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
            </div>
          )}

          <div className={styles.editorActions}>
            <button type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className={styles.primary}
              type="button"
              disabled={busy}
              onClick={() => void analyze()}
            >
              {busy ? "Analisando..." : "Analisar material"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.importReview}>
          <div
            className={
              preview.structureAnalysis.aiRecommended
                ? styles.structureWarning
                : styles.structureStatus
            }
          >
            <strong>
              {preview.structureAnalysis.mode === "REFERENCE_ONLY"
                ? "Referência externa"
                : "Estrutura analisada"}
            </strong>
            <span>{preview.structureAnalysis.message}</span>
            {preview.structureAnalysis.mode === "DETERMINISTIC" && (
              <small>
                Confiança estrutural:{" "}
                {Math.round(preview.structureAnalysis.confidence * 100)}%
              </small>
            )}
          </div>

          <div className={styles.editorMeta}>
            <label>
              <span>Título</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span>Assunto</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ex.: Banco de Dados"
              />
            </label>
            <label>
              <span>Tags</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Separadas por vírgula"
              />
            </label>
            <label>
              <span>Idioma</span>
              <input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              />
            </label>
          </div>

          <label className={styles.fullField}>
            <span>Descrição</span>
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>

          {preview.format !== "LINK" && (
            <div className={styles.importReviewGrid}>
              <label className={styles.fullField}>
                <span>Conteúdo canônico</span>
                <textarea
                  className={styles.importCanonicalTextarea}
                  value={canonicalBody}
                  onChange={(event) => setCanonicalBody(event.target.value)}
                  spellCheck={false}
                />
                <small>
                  Corrija headings quando necessário e recalcule a estrutura
                  antes de importar.
                </small>
                <button
                  className={styles.secondaryAction}
                  type="button"
                  disabled={busy}
                  onClick={() => void refreshStructure()}
                >
                  Recalcular estrutura
                </button>
              </label>
              <ContentOutlineView outline={preview.outline} />
            </div>
          )}

          {preview.sourceReference && (
            <div className={styles.provenanceBox}>
              <strong>Proveniência</strong>
              <span>{preview.sourceLabel || preview.sourceReference}</span>
              <small>
                A origem é registrada separadamente do conteúdo editável.
              </small>
            </div>
          )}

          <div className={styles.editorActions}>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setCanonicalBody("");
              }}
            >
              Voltar
            </button>
            <button
              className={styles.primary}
              type="button"
              disabled={busy}
              onClick={() => void materialize()}
            >
              {busy ? "Importando..." : "Importar para a Biblioteca"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
