"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  fetchContentIngestionCapabilities,
  previewContentFile,
  previewContentIngestion,
  type ContentDraft,
  type ContentIngestionCapabilities,
  type ContentIngestionSource,
  type DraftItemType,
} from "@/lib/content-ingestion-api";
import styles from "./JourneyCreationWizard.module.css";

type Props = {
  open: boolean;
  classroomId: string;
  onClose: () => void;
  onBlank: () => void;
  onUseDraft: (draft: ContentDraft) => Promise<void> | void;
  notify: (message: string) => void;
};

type Mode = "choose" | "ai" | "template" | "import" | "preview";
type ImportMode = "file" | "text" | "url" | "notion";

const TEMPLATE_OPTIONS = [
  { key: "SEQUENCE", title: "Sequência de aulas", text: "Introdução, desenvolvimento e consolidação." },
  { key: "PROJECT", title: "Projeto integrador", text: "Descoberta, construção e entrega." },
  { key: "EXAM_PREP", title: "Preparação para avaliação", text: "Diagnóstico, revisão e verificação." },
  { key: "CHALLENGE", title: "Aprendizagem por desafios", text: "Briefing, missões e checkpoint." },
] as const;

const ITEM_LABELS: Record<string, string> = {
  CONTENT: "Conteúdo",
  ACTIVITY: "Atividade",
  QUIZ: "Quiz",
  CHALLENGE: "Desafio",
  CHECKPOINT: "Checkpoint",
  EXTERNAL_RESOURCE: "Recurso externo",
};
export default function JourneyCreationWizard({
  open,
  classroomId,
  onClose,
  onBlank,
  onUseDraft,
  notify,
}: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [importMode, setImportMode] = useState<ImportMode>("file");
  const [capabilities, setCapabilities] = useState<ContentIngestionCapabilities | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [textContent, setTextContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("choose");
    setImportMode("file");
    setTitle("");
    setBrief("");
    setTextContent("");
    setSourceUrl("");
    setSourceLabel("");
    setDraft(null);
    void fetchContentIngestionCapabilities()
      .then(setCapabilities)
      .catch(() => setCapabilities(null));
  }, [open]);

  const itemCount = useMemo(
    () => draft?.sections.reduce((sum, section) => sum + section.items.length, 0) ?? 0,
    [draft],
  );

  function patchDraft(patch: Partial<ContentDraft>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  }

  function patchSection(sectionIndex: number, patch: Partial<ContentDraft["sections"][number]>) {
    if (!draft) return;
    setDraft({
      ...draft,
      sections: draft.sections.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section),
    });
  }

  function removeSection(sectionIndex: number) {
    if (!draft) return;
    setDraft({ ...draft, sections: draft.sections.filter((_, index) => index !== sectionIndex) });
  }

  function addSection() {
    if (!draft) return;
    setDraft({
      ...draft,
      sections: [...draft.sections, {
        title: `Novo módulo ${draft.sections.length + 1}`,
        description: null,
        items: [],
      }],
    });
  }

  function moveSection(sectionIndex: number, delta: number) {
    if (!draft) return;
    const target = sectionIndex + delta;
    if (target < 0 || target >= draft.sections.length) return;
    const sections = [...draft.sections];
    [sections[sectionIndex], sections[target]] = [sections[target], sections[sectionIndex]];
    setDraft({ ...draft, sections });
  }

  function patchItem(sectionIndex: number, itemIndex: number, patch: Partial<ContentDraft["sections"][number]["items"][number]>) {
    if (!draft) return;
    const section = draft.sections[sectionIndex];
    if (!section) return;
    patchSection(sectionIndex, {
      items: section.items.map((item, index) => index === itemIndex ? { ...item, ...patch } : item),
    });
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    if (!draft) return;
    const section = draft.sections[sectionIndex];
    if (!section) return;
    patchSection(sectionIndex, { items: section.items.filter((_, index) => index !== itemIndex) });
  }

  function addItem(sectionIndex: number) {
    if (!draft) return;
    const section = draft.sections[sectionIndex];
    if (!section) return;
    patchSection(sectionIndex, {
      items: [...section.items, {
        title: `Novo item ${section.items.length + 1}`,
        description: null,
        type: "CONTENT",
        body: null,
        sourceUrl: null,
      }],
    });
  }

  function moveItem(sectionIndex: number, itemIndex: number, delta: number) {
    if (!draft) return;
    const section = draft.sections[sectionIndex];
    if (!section) return;
    const target = itemIndex + delta;
    if (target < 0 || target >= section.items.length) return;
    const items = [...section.items];
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    patchSection(sectionIndex, { items });
  }

  if (!open) return null;

  async function preview(input: {
    source: ContentIngestionSource;
    templateKey?: string;
    content?: string;
    sourceUrl?: string;
    sourceLabel?: string;
  }) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await previewContentIngestion({
        classroomId,
        source: input.source,
        title: title.trim() || undefined,
        templateKey: input.templateKey,
        content: input.content,
        sourceUrl: input.sourceUrl,
        sourceLabel: input.sourceLabel,
      });
      setDraft(result);
      setMode("preview");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível preparar a jornada.");
    } finally {
      setBusy(false);
    }
  }
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    try {
      const result = await previewContentFile(classroomId, file, title);
      setSourceLabel(file.name);
      setDraft(result);
      setMode("preview");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível analisar o arquivo.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function chooseBlank() {
    onBlank();
    onClose();
  }

  async function useDraft() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await onUseDraft(draft);
      onClose();
    } catch {
      // The parent already surfaced the domain/API error.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Criar jornada">
        <header className={styles.dialogHeader}>
          <div>
            <span className={styles.eyebrow}>NOVA JORNADA</span>
            <h3>{mode === "choose" ? "Como você quer começar?" : mode === "preview" ? "Revise a estrutura sugerida" : "Prepare o ponto de partida"}</h3>
            <p>A Arena adapta o fluxo ao material que você já tem — inclusive nenhum.</p>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        {mode === "choose" && (
          <div className={styles.choiceGrid}>
            <button type="button" className={styles.choice} onClick={() => setMode("ai")}>
              <span className={styles.choiceIcon}>✦</span>
              <strong>Criar com IA</strong>
              <small>Descreva turma, objetivo e tempo disponível. A Arena propõe um rascunho para revisão.</small>
              {!capabilities?.aiConfigured && <em>Requer configuração do provedor de IA</em>}
            </button>
            <button type="button" className={styles.choice} onClick={() => setMode("template")}>
              <span className={styles.choiceIcon}>◫</span>
              <strong>Usar um modelo</strong>
              <small>Parta de uma estrutura pedagógica pronta e adapte ao seu contexto.</small>
            </button>
            <button type="button" className={styles.choice} onClick={() => setMode("import")}>
              <span className={styles.choiceIcon}>↑</span>
              <strong>Importar material</strong>
              <small>Use texto, Markdown, arquivo, link ou uma referência do Notion.</small>
            </button>
            <button type="button" className={styles.choice} onClick={chooseBlank}>
              <span className={styles.choiceIcon}>＋</span>
              <strong>Começar em branco</strong>
              <small>Monte a jornada manualmente, etapa por etapa.</small>
            </button>
          </div>
        )}

        {mode === "ai" && (
          <div className={styles.formPanel}>
            <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Introdução a Banco de Dados" /></label>
            <label><span>Descreva o que precisa ensinar</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Ex.: Turma iniciante, 20 horas, foco em modelagem e SQL, com prática a cada módulo e projeto final." /></label>
            {!capabilities?.aiConfigured && <div className={styles.notice}>A criação com IA está disponível no produto, mas este ambiente ainda não possui <code>ARENA_AI_API_KEY</code>.</div>}
            <div className={styles.footer}><button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button><button className={styles.primary} disabled={busy || !brief.trim() || !capabilities?.aiConfigured} onClick={() => void preview({ source: "AI", content: brief })}>{busy ? "Gerando..." : "Gerar rascunho"}</button></div>
          </div>
        )}
        {mode === "template" && (
          <div className={styles.formPanel}>
            <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A Arena pode sugerir um título inicial" /></label>
            <div className={styles.templateGrid}>
              {TEMPLATE_OPTIONS.map((template) => (
                <button key={template.key} className={styles.template} type="button" disabled={busy} onClick={() => void preview({ source: "TEMPLATE", templateKey: template.key })}>
                  <strong>{template.title}</strong>
                  <small>{template.text}</small>
                </button>
              ))}
            </div>
            <div className={styles.footer}><button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button></div>
          </div>
        )}

        {mode === "import" && (
          <div className={styles.formPanel}>
            <div className={styles.importTabs}>
              {([
                ["file", "Arquivo"],
                ["text", "Colar texto"],
                ["url", "Link"],
                ["notion", "Notion"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" className={importMode === key ? styles.activeTab : ""} onClick={() => setImportMode(key)}>{label}</button>
              ))}
            </div>
            {importMode === "file" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Se vazio, a Arena usa o conteúdo do material" /></label>
                <div className={styles.dropZone}>
                  <strong>{busy ? "Analisando material..." : "Selecione um material"}</strong>
                  <p>PDF, Word, PowerPoint, Markdown e TXT são convertidos em texto para gerar um rascunho revisável. O arquivo não é publicado automaticamente.</p>
                  <label className={styles.fileButton}>Escolher arquivo<input type="file" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.md,.markdown,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown" onChange={(event) => void handleFile(event)} /></label>
                  <small className={styles.supportedFiles}>Até 20 MB · {(capabilities?.supportedFileExtensions ?? ["PDF", "DOCX", "PPTX", "MD", "TXT"]).join(" · ")}</small>
                </div>
              </>
            )}
            {importMode === "text" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label><span>Cole seu material</span><textarea className={styles.largeText} value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder="Cole roteiro de aula, apostila, plano, anotações ou qualquer texto." /></label>
              </>
            )}
            {(importMode === "url" || importMode === "notion") && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label><span>{importMode === "notion" ? "Página do Notion" : "URL do material"}</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
                <label><span>Identificação opcional</span><input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder={importMode === "notion" ? "Ex.: Página Banco de Dados" : "Ex.: Material de referência"} /></label>
                {importMode === "notion" && <div className={styles.notice}>A Arena preserva o link sem raspar a página. A leitura automática virá por integração autorizada, evitando depender do HTML público do Notion.</div>}
              </>
            )}
            <div className={styles.footer}>
              <button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button>
              {importMode === "text" && <button className={styles.primary} disabled={busy || !textContent.trim()} onClick={() => void preview({ source: "TEXT", content: textContent, sourceLabel: "Texto colado" })}>{busy ? "Analisando..." : "Analisar material"}</button>}
              {importMode === "url" && <button className={styles.primary} disabled={busy || !sourceUrl.trim()} onClick={() => void preview({ source: "URL", sourceUrl, sourceLabel })}>Usar link</button>}
              {importMode === "notion" && <button className={styles.primary} disabled={busy || !sourceUrl.trim()} onClick={() => void preview({ source: "NOTION", sourceUrl, sourceLabel })}>Vincular página</button>}
            </div>
          </div>
        )}
        {mode === "preview" && draft && (
          <div className={styles.preview}>
            <div className={styles.previewSummary}>
              <div className={styles.previewIdentity}>
                <span>Jornada sugerida</span>
                <input value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} aria-label="Título da jornada sugerida" />
                <textarea value={draft.description} onChange={(event) => patchDraft({ description: event.target.value })} aria-label="Descrição da jornada sugerida" />
              </div>
              <div className={styles.previewMetrics}><b>{draft.sections.length}</b><span>módulos</span><b>{itemCount}</b><span>itens</span></div>
            </div>
            <div className={styles.sectionList}>
              {draft.sections.map((section, sectionIndex) => (
                <article className={styles.section} key={`${section.title}-${sectionIndex}`}>
                  <header>
                    <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                    <div className={styles.sectionIdentity}>
                      <input value={section.title} onChange={(event) => patchSection(sectionIndex, { title: event.target.value })} aria-label={`Título do módulo ${sectionIndex + 1}`} />
                      <input value={section.description ?? ""} onChange={(event) => patchSection(sectionIndex, { description: event.target.value || null })} placeholder="Descrição opcional do módulo" aria-label={`Descrição do módulo ${sectionIndex + 1}`} />
                    </div>
                    <div className={styles.orderActions}>
                      <button type="button" className={styles.iconAction} disabled={sectionIndex === 0} onClick={() => moveSection(sectionIndex, -1)} aria-label={`Mover módulo ${section.title} para cima`}>↑</button>
                      <button type="button" className={styles.iconAction} disabled={sectionIndex === draft.sections.length - 1} onClick={() => moveSection(sectionIndex, 1)} aria-label={`Mover módulo ${section.title} para baixo`}>↓</button>
                      <button type="button" className={styles.iconAction} onClick={() => removeSection(sectionIndex)} aria-label={`Remover módulo ${section.title}`}>×</button>
                    </div>
                  </header>
                  <div className={styles.itemList}>
                    {section.items.map((item, itemIndex) => (
                      <div className={styles.item} key={`${item.title}-${itemIndex}`}>
                        <select className={styles.itemTypeSelect} value={item.type} onChange={(event) => patchItem(sectionIndex, itemIndex, { type: event.target.value as DraftItemType })} aria-label={`Tipo do item ${itemIndex + 1}`}>
                          {Object.entries(ITEM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <div className={styles.itemIdentity}>
                          <input value={item.title} onChange={(event) => patchItem(sectionIndex, itemIndex, { title: event.target.value })} aria-label={`Título do item ${itemIndex + 1}`} />
                          <input value={item.description ?? ""} onChange={(event) => patchItem(sectionIndex, itemIndex, { description: event.target.value || null })} placeholder="Descrição opcional" aria-label={`Descrição do item ${itemIndex + 1}`} />
                        </div>
                        <div className={styles.orderActions}>
                          <button type="button" className={styles.iconAction} disabled={itemIndex === 0} onClick={() => moveItem(sectionIndex, itemIndex, -1)} aria-label={`Mover item ${item.title} para cima`}>↑</button>
                          <button type="button" className={styles.iconAction} disabled={itemIndex === section.items.length - 1} onClick={() => moveItem(sectionIndex, itemIndex, 1)} aria-label={`Mover item ${item.title} para baixo`}>↓</button>
                          <button type="button" className={styles.iconAction} onClick={() => removeItem(sectionIndex, itemIndex)} aria-label={`Remover item ${item.title}`}>×</button>
                        </div>
                      </div>
                    ))}
                    {section.items.length === 0 && <div className={styles.emptySection}>Este módulo está vazio e não será útil até receber um item.</div>}
                    <button type="button" className={styles.addInline} onClick={() => addItem(sectionIndex)}>+ Adicionar item</button>
                  </div>
                </article>
              ))}
              <button type="button" className={styles.addSectionButton} onClick={addSection}>+ Adicionar módulo</button>
            </div>
            <div className={styles.reviewNote}>Revise títulos, módulos e tipos antes de continuar. Nada é publicado automaticamente: esta estrutura vira um rascunho editável.</div>
            <div className={styles.footer}><button className={styles.secondary} onClick={() => setMode("choose")}>Refazer</button><button className={styles.primary} disabled={busy || !draft.title.trim() || itemCount === 0} onClick={() => void useDraft()}>{busy ? "Criando rascunho..." : "Usar esta estrutura"}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}
