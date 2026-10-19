"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  archiveLibraryResource,
  createLibraryResource,
  fetchContentLibrary,
  fetchLibraryFacets,
  fetchLibraryResourceUsage,
  restoreLibraryResource,
  updateLibraryResource,
  type LibraryFacets,
  type LibraryJourneyUsage,
  type LibraryResourceUsage,
  type LibrarySort,
  type LearningResource,
  type LearningResourceFormat,
  type LearningResourceSourceType,
} from "@/lib/learning-resource-api";
import {
  fetchJourneys,
  refreshJourneyStageResource,
  updateJourney,
  type Journey,
} from "@/lib/journey-api";
import type { Classroom } from "@/lib/types";
import { AnchoredMarkdown, ContentMapView, ContentOutlineView } from "./LibraryContentViews";
import LibraryImportPanel from "./LibraryImportPanel";
import styles from "./LibraryWorkspace.module.css";
import { DialogCloseButton } from "@/components/ui";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalKeyboard } from "@/lib/use-modal-keyboard";

type Props = { classrooms: Classroom[]; notify: (message: string) => void };
type ViewMode = "reading" | "structure" | "map";
type Editor = {
  id?: string;
  title: string;
  summary: string;
  subject: string;
  tags: string;
  language: string;
  body: string;
  format: LearningResourceFormat;
  sourceType: LearningResourceSourceType;
  sourceUrl: string;
  sourceLabel: string;
};

const EMPTY_EDITOR: Editor = {
  title: "",
  summary: "",
  subject: "",
  tags: "",
  language: "pt-BR",
  body: "",
  format: "MARKDOWN",
  sourceType: "MANUAL",
  sourceUrl: "",
  sourceLabel: "",
};
const EMPTY_FACETS: LibraryFacets = { subjects: [], tags: [], languages: [] };

function tagsFromText(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function sourceName(resource: LearningResource) {
  return {
    MANUAL: "Manual",
    AI: "IA",
    TEMPLATE: "Template",
    TEXT: "Texto",
    MARKDOWN: "Markdown",
    FILE: "Arquivo",
    URL: "Link",
    NOTION: "Notion",
  }[resource.sourceType];
}

export default function LibraryWorkspace({ classrooms, notify }: Props) {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [facets, setFacets] = useState<LibraryFacets>(EMPTY_FACETS);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [subject, setSubject] = useState("");
  const [tag, setTag] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState<LibrarySort>("RECENT");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<LearningResource | null>(null);
  const [usage, setUsage] = useState<LibraryResourceUsage | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("reading");
  const [reuseOpen, setReuseOpen] = useState(false);
  const reuseCloseRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(reuseOpen);
  const reuseDialogRef = useRef<HTMLElement>(null);
  useModalKeyboard(reuseOpen, () => setReuseOpen(false), reuseDialogRef, reuseCloseRef);
  const [journeys, setJourneys] = useState<Array<Journey & { classroomName: string }>>([]);
  const [targetJourneyId, setTargetJourneyId] = useState("");
  const [targetModule, setTargetModule] = useState("");

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchContentLibrary({ query, archived, subject, tag, language, sort });
      setResources(rows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível carregar a Biblioteca.");
    } finally {
      setLoading(false);
    }
  }, [archived, language, notify, query, sort, subject, tag]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadLibrary(); }, 220);
    return () => window.clearTimeout(timer);
  }, [loadLibrary]);

  useEffect(() => {
    let alive = true;
    void fetchLibraryFacets()
      .then((value) => { if (alive) setFacets(value); })
      .catch(() => { if (alive) setFacets(EMPTY_FACETS); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    void fetchLibraryResourceUsage(selected.id)
      .then((value) => { if (alive) setUsage(value); })
      .catch(() => { if (alive) setUsage(null); });
    return () => { alive = false; };
  }, [selected]);

  const targetJourney = useMemo(
    () => journeys.find((item) => item.id === targetJourneyId),
    [journeys, targetJourneyId],
  );
  const modules = useMemo(
    () => targetJourney
      ? [...new Set(targetJourney.stages.map((stage) => stage.sectionTitle).filter((value): value is string => Boolean(value)))]
      : [],
    [targetJourney],
  );
  const filtersActive = Boolean(query.trim() || subject || tag || language || sort !== "RECENT");

  function openEditor(resource?: LearningResource) {
    setEditor(resource ? {
      id: resource.id,
      title: resource.title,
      summary: resource.summary ?? "",
      subject: resource.subject ?? "",
      tags: resource.tags.join(", "),
      language: resource.language ?? "pt-BR",
      body: resource.body ?? "",
      format: resource.format,
      sourceType: resource.sourceType,
      sourceUrl: resource.sourceUrl ?? "",
      sourceLabel: resource.sourceLabel ?? "",
    } : { ...EMPTY_EDITOR });
  }

  async function saveEditor() {
    if (!editor || busy) return;
    const hasContent = editor.format === "LINK" ? Boolean(editor.sourceUrl.trim()) : Boolean(editor.body.trim());
    if (!editor.title.trim() || !hasContent) {
      notify(editor.format === "LINK" ? "Informe título e URL." : "Informe título e conteúdo.");
      return;
    }
    setBusy(true);
    try {
      const previousRevision = selected?.revision;
      const input = {
        title: editor.title.trim(),
        summary: editor.summary.trim() || undefined,
        subject: editor.subject.trim() || undefined,
        tags: tagsFromText(editor.tags),
        language: editor.language.trim() || undefined,
        body: editor.format === "LINK" ? undefined : editor.body,
        format: editor.format,
        sourceType: editor.sourceType,
        sourceUrl: editor.sourceUrl.trim() || undefined,
        sourceLabel: editor.sourceLabel.trim() || undefined,
      };
      const saved = editor.id
        ? await updateLibraryResource(editor.id, input)
        : await createLibraryResource(input);
      setSelected(saved);
      setEditor(null);
      setViewMode("reading");
      const [, nextFacets] = await Promise.all([loadLibrary(), fetchLibraryFacets()]);
      setFacets(nextFacets);
      notify(
        editor.id && previousRevision === saved.revision
          ? "Metadados atualizados sem criar nova revisão de conteúdo."
          : editor.id
            ? "Material atualizado. Jornadas existentes preservam seus snapshots."
            : "Material criado na Biblioteca.",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o material.");
    } finally { setBusy(false); }
  }

  async function archive(resource: LearningResource) {
    if (busy) return;
    setBusy(true);
    try {
      await archiveLibraryResource(resource.id);
      setSelected(null);
      await loadLibrary();
      notify("Material arquivado. Snapshots existentes foram preservados.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível arquivar.");
    } finally { setBusy(false); }
  }

  async function restore(resource: LearningResource) {
    if (busy) return;
    setBusy(true);
    try {
      await restoreLibraryResource(resource.id);
      setSelected(null);
      await loadLibrary();
      notify("Material restaurado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível restaurar.");
    } finally { setBusy(false); }
  }

  async function openReuse() {
    if (!selected) return;
    setReuseOpen(true);
    setTargetJourneyId("");
    setTargetModule("");
    try {
      const groups = await Promise.all(classrooms.map(async (classroom) => {
        const rows = await fetchJourneys(classroom.id);
        return rows.filter((row) => row.status === "DRAFT")
          .map((row) => ({ ...row, classroomName: classroom.name }));
      }));
      setJourneys(groups.flat());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível carregar as Jornadas.");
    }
  }

  async function addToJourney() {
    if (!selected || !targetJourney || busy) return;
    setBusy(true);
    try {
      const sectionTitle = targetModule || targetJourney.stages.at(-1)?.sectionTitle || "Módulo 1";
      const saved = await updateJourney(targetJourney.id, {
        classroomId: targetJourney.classroomId,
        title: targetJourney.title,
        description: targetJourney.description ?? undefined,
        stages: [
          ...targetJourney.stages.map((stage) => ({
            id: stage.id,
            title: stage.title,
            description: stage.description ?? undefined,
            unlockRule: stage.unlockRule,
            completionRule: stage.completionRule,
            sectionId: stage.sectionId ?? undefined,
            sectionTitle: stage.sectionTitle ?? undefined,
            itemType: stage.itemType,
            learningResourceId: stage.learningResourceId ?? undefined,
          })),
          {
            title: selected.title,
            description: selected.summary ?? undefined,
            unlockRule: targetJourney.stages.length ? "PREVIOUS_STAGE_COMPLETED" as const : "IMMEDIATE" as const,
            completionRule: "MANUAL" as const,
            sectionTitle,
            itemType: "CONTENT" as const,
            learningResourceId: selected.id,
          },
        ],
      });
      setJourneys((current) => current.map((row) =>
        row.id === saved.id ? { ...saved, classroomName: row.classroomName } : row,
      ));
      setReuseOpen(false);
      setUsage(await fetchLibraryResourceUsage(selected.id));
      notify(`Material adicionado como snapshot da revisão ${selected.revision}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível adicionar à Jornada.");
    } finally { setBusy(false); }
  }

  async function refreshSnapshot(row: LibraryJourneyUsage) {
    if (!selected || busy || !row.refreshAllowed) return;
    setBusy(true);
    try {
      await refreshJourneyStageResource(row.journeyId, row.stageId);
      setUsage(await fetchLibraryResourceUsage(selected.id));
      notify(`Snapshot atualizado para a revisão ${selected.revision}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível atualizar o snapshot.");
    } finally { setBusy(false); }
  }

  function navigateToContent(anchor: string) {
    setViewMode("reading");
    window.setTimeout(() => {
      const target = document.getElementById(anchor);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target instanceof HTMLElement) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }, 0);
  }

  function exportMarkdown(resource: LearningResource) {
    if (!resource.body) return;
    const safeName = resource.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "material";
    const url = URL.createObjectURL(new Blob([resource.body], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (importOpen) {
    return <LibraryImportPanel
      notify={notify}
      onCancel={() => setImportOpen(false)}
      onImported={(resource) => {
        setImportOpen(false);
        setSelected(resource);
        setViewMode("reading");
        void Promise.all([loadLibrary(), fetchLibraryFacets().then(setFacets)]);
      }}
    />;
  }

  if (editor) {
    return (
      <section className={styles.workspace}>
        <button className={styles.back} type="button" onClick={() => setEditor(null)}>← Biblioteca</button>
        <header className={styles.heading}>
          <div><span>MATERIAL</span><h2>{editor.id ? "Editar material" : "Novo material"}</h2>
            <p>Metadados organizam o acervo; a revisão avança somente quando o conteúdo muda.</p></div>
        </header>
        <div className={styles.editor}>
          <div className={styles.editorMeta}>
            <label><span>Título</span><input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} /></label>
            <label><span>Assunto</span><input value={editor.subject} placeholder="Ex.: Banco de Dados" onChange={(e) => setEditor({ ...editor, subject: e.target.value })} /></label>
            <label><span>Tags</span><input value={editor.tags} placeholder="SQL, SELECT, consultas" onChange={(e) => setEditor({ ...editor, tags: e.target.value })} /></label>
            <label><span>Idioma</span><input value={editor.language} placeholder="pt-BR" onChange={(e) => setEditor({ ...editor, language: e.target.value })} /></label>
          </div>
          <label className={styles.fullField}><span>Descrição</span><input value={editor.summary} onChange={(e) => setEditor({ ...editor, summary: e.target.value })} /></label>
          {editor.format === "LINK" ? (
            <div className={styles.editorMeta}>
              <label><span>URL</span><input value={editor.sourceUrl} onChange={(e) => setEditor({ ...editor, sourceUrl: e.target.value })} placeholder="https://..." /></label>
              <label><span>Rótulo da fonte</span><input value={editor.sourceLabel} onChange={(e) => setEditor({ ...editor, sourceLabel: e.target.value })} placeholder="Opcional" /></label>
            </div>
          ) : (
            <div className={styles.editorSplit}>
              <label className={styles.contentField}><span>Markdown</span><textarea value={editor.body} onChange={(e) => setEditor({ ...editor, body: e.target.value })} spellCheck={false} /></label>
              <section className={styles.previewPane} aria-label="Preview do material">
                <span className={styles.previewLabel}>Preview</span>
                <div className={styles.previewScroll}>
                  {editor.body.trim() ? <AnchoredMarkdown>{editor.body}</AnchoredMarkdown> : <p className={styles.previewEmpty}>O conteúdo formatado aparecerá aqui.</p>}
                </div>
              </section>
            </div>
          )}
          <div className={styles.editorActions}>
            <button type="button" onClick={() => setEditor(null)}>Cancelar</button>
            <button className={styles.primary} type="button" disabled={busy} onClick={() => void saveEditor()}>{busy ? "Salvando..." : "Salvar alterações"}</button>
          </div>
        </div>
      </section>
    );
  }

  if (selected) {
    const updateCount = usage?.journeys.filter((row) => row.updateAvailable).length ?? 0;
    return (
      <section className={styles.workspace}>
        <button className={styles.back} type="button" onClick={() => setSelected(null)}>← Biblioteca</button>
        <header className={styles.detailHead}>
          <div>
            <span>MATERIAL</span><h2>{selected.title}</h2><p>{selected.summary || "Material reutilizável da sua Biblioteca."}</p>
            <div className={styles.detailMetadata}>
              {selected.subject && <b>{selected.subject}</b>}
              {selected.language && <small>{selected.language}</small>}
              <small>{sourceName(selected)}</small><small>Revisão {selected.revision}</small>
            </div>
            {selected.tags.length > 0 && <div className={styles.tagList}>{selected.tags.map((value) => <span key={value}>{value}</span>)}</div>}
          </div>
          <div className={styles.actions}>
            {!archived ? <>
              <button type="button" onClick={() => openEditor(selected)}>Editar</button>
              <button className={styles.primary} type="button" onClick={() => void openReuse()}>Adicionar a uma Jornada</button>
              {selected.body && <button type="button" onClick={() => exportMarkdown(selected)}>Exportar .md</button>}
              <button type="button" onClick={() => void archive(selected)}>Arquivar</button>
            </> : <button className={styles.primary} type="button" onClick={() => void restore(selected)}>Restaurar</button>}
          </div>
        </header>

        {selected.sourceReference && <div className={styles.provenanceBar}>
          <div><strong>Origem preservada</strong><span>{selected.sourceLabel || selected.sourceReference}</span></div>
          {selected.sourceSnapshotAt && <small>snapshot {new Date(selected.sourceSnapshotAt).toLocaleDateString("pt-BR")}</small>}
        </div>}

        <nav className={styles.contentTabs} aria-label="Visualizações do material">
          {([["reading", "Leitura"], ["structure", "Estrutura"], ["map", "Mapa"]] as const).map(([value, label]) =>
            <button key={value} type="button" className={viewMode === value ? styles.activeContentTab : ""} aria-current={viewMode === value ? "page" : undefined} onClick={() => setViewMode(value)}>{label}</button>
          )}
        </nav>

        {viewMode === "reading" && <article className={styles.reader}>
          {selected.format === "LINK" && selected.sourceUrl
            ? <div className={styles.externalResource}><strong>Recurso externo</strong><p>O conteúdo permanece na fonte original.</p><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte ↗</a></div>
            : selected.body
              ? selected.format === "PLAIN_TEXT" ? <div className={styles.plainText}>{selected.body}</div> : <AnchoredMarkdown>{selected.body}</AnchoredMarkdown>
              : <p>Este material ainda não possui conteúdo.</p>}
        </article>}
        {viewMode === "structure" && <ContentOutlineView outline={selected.outline} onNavigate={navigateToContent} />}
        {viewMode === "map" && <ContentMapView outline={selected.outline} onNavigate={navigateToContent} />}

        <section className={styles.usagePanel}>
          <div className={styles.usageHeading}>
            <div><span>REUTILIZAÇÃO</span><h3>Uso em Jornadas</h3><p>Snapshots só mudam quando o professor solicita explicitamente.</p></div>
            {updateCount > 0 && <strong className={styles.updateBadge}>{updateCount} {updateCount === 1 ? "atualização disponível" : "atualizações disponíveis"}</strong>}
          </div>
          {!usage || usage.journeys.length === 0
            ? <div className={styles.usageEmpty}>Este material ainda não foi usado em nenhuma Jornada.</div>
            : <div className={styles.usageList}>{usage.journeys.map((row) =>
              <article key={`${row.journeyId}:${row.stageId}`} className={styles.usageRow}>
                <div><strong>{row.journeyTitle}</strong><span>{row.classroomName} · {row.stageTitle}</span></div>
                <div className={styles.usageRevision}><small>Snapshot</small><b>r{row.snapshotRevision ?? "—"}{row.updateAvailable ? ` → r${row.currentRevision}` : ""}</b></div>
                {row.refreshAllowed
                  ? <button type="button" disabled={busy} onClick={() => void refreshSnapshot(row)}>Atualizar snapshot</button>
                  : row.updateAvailable
                    ? <span className={styles.snapshotLocked}>Snapshot preservado</span>
                    : <span className={styles.snapshotCurrent}>Atual</span>}
              </article>
            )}</div>}
        </section>

        {reuseOpen && <div className={styles.modalBackdrop} role="presentation">
          <section ref={reuseDialogRef} tabIndex={-1} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="reuse-title">
            <header className={styles.modalHeading}>
              <div><span>REUTILIZAR MATERIAL</span><h3 id="reuse-title">Adicionar a uma Jornada</h3><p>Somente Jornadas em rascunho podem receber novos conteúdos.</p></div>
              <DialogCloseButton ref={reuseCloseRef} label="Fechar reutilização de material" onClick={() => setReuseOpen(false)} />
            </header>
            <label><span>Jornada</span><select value={targetJourneyId} onChange={(e) => { setTargetJourneyId(e.target.value); setTargetModule(""); }}>
              <option value="">Selecionar Jornada...</option>
              {classrooms.map((classroom) => <optgroup key={classroom.id} label={classroom.name}>{journeys.filter((journey) => journey.classroomId === classroom.id).map((journey) => <option key={journey.id} value={journey.id}>{journey.title}</option>)}</optgroup>)}
            </select></label>
            {targetJourney && <label><span>Módulo</span><select value={targetModule} onChange={(e) => setTargetModule(e.target.value)}><option value="">Adicionar ao módulo final</option>{modules.map((module) => <option key={module} value={module}>{module}</option>)}</select></label>}
            <div className={styles.editorActions}><button type="button" onClick={() => setReuseOpen(false)}>Cancelar</button><button className={styles.primary} type="button" disabled={!targetJourneyId || busy} onClick={() => void addToJourney()}>Adicionar snapshot</button></div>
          </section>
        </div>}
      </section>
    );
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.heading}>
        <div><span>BIBLIOTECA</span><h2>Seus materiais</h2><p>Importe, organize e reutilize conteúdos sem duplicar o material de origem.</p></div>
        <div className={styles.headingActions}><button type="button" onClick={() => setImportOpen(true)}>Importar</button><button className={styles.primary} type="button" onClick={() => openEditor()}>+ Novo material</button></div>
      </header>
      <div className={styles.toolbar}>
        <label className={styles.search}><span className="sr-only">Buscar materiais</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, descrição, assunto ou tag..." /></label>
        <div className={styles.tabs}><button className={!archived ? styles.activeTab : ""} type="button" onClick={() => setArchived(false)}>Ativos</button><button className={archived ? styles.activeTab : ""} type="button" onClick={() => setArchived(true)}>Arquivados</button></div>
      </div>
      <div className={styles.filterBar}>
        <label><span>Assunto</span><select value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">Todos</option>{facets.subjects.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Tag</span><select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas</option>{facets.tags.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Idioma</span><select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="">Todos</option>{facets.languages.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Ordenar</span><select value={sort} onChange={(e) => setSort(e.target.value as LibrarySort)}><option value="RECENT">Recentes</option><option value="TITLE_ASC">Título A–Z</option><option value="TITLE_DESC">Título Z–A</option></select></label>
        {filtersActive && <button className={styles.clearFilters} type="button" onClick={() => { setQuery(""); setSubject(""); setTag(""); setLanguage(""); setSort("RECENT"); }}>Limpar filtros</button>}
      </div>
      {loading ? <div className={styles.empty}>Carregando Biblioteca...</div> : resources.length === 0
        ? <div className={styles.empty}><strong>{filtersActive ? "Nenhum material corresponde aos filtros." : archived ? "Nenhum material arquivado." : "Sua Biblioteca ainda está vazia"}</strong><p>{filtersActive ? "Ajuste a busca ou os filtros." : "Importe um material existente ou crie um recurso reutilizável."}</p>{!filtersActive && !archived && <div className={styles.emptyActions}><button type="button" onClick={() => setImportOpen(true)}>Importar material</button><button className={styles.primary} type="button" onClick={() => openEditor()}>Criar material</button></div>}</div>
        : <div className={styles.list}>{resources.map((resource) =>
          <button className={styles.row} type="button" key={resource.id} onClick={() => { setSelected(resource); setViewMode("reading"); }}>
            <span className={styles.rowMain}><strong>{resource.title}</strong>{resource.summary && <small>{resource.summary}</small>}<span className={styles.rowTags}>{resource.subject && <b>{resource.subject}</b>}{resource.tags.slice(0, 3).map((value) => <i key={value}>{value}</i>)}{resource.tags.length > 3 && <i>+{resource.tags.length - 3}</i>}</span></span>
            <span className={styles.meta}><span>{sourceName(resource)}</span><span aria-hidden="true">·</span><b title={`Revisão ${resource.revision} do material`}>Revisão {resource.revision}</b><span aria-hidden="true">·</span><small>{new Date(resource.updatedAt).toLocaleDateString("pt-BR")}</small></span><span aria-hidden="true">→</span>
          </button>
        )}</div>}
    </section>
  );
}
