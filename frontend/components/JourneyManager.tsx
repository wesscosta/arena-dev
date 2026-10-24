"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { materializeContentDraft, type ContentDraft } from "@/lib/content-ingestion-api";
import { fetchContentLibrary, type LearningResource } from "@/lib/learning-resource-api";
import JourneyCreationWizard from "@/components/JourneyCreationWizard";
import {
  archiveJourney,
  changeJourneyRelease,
  createJourney,
  fetchJourneys,
  publishJourney,
  saveJourneyToLibrary, updateJourney,
  fetchJourneyRedemption,
  enableJourneyRedemption,
  regenerateJourneyRedemption,
  disableJourneyRedemption,
  fetchJourneyStageContent,
  updateJourneyStageContent,
  type JourneyRedemptionCode,
  type JourneyStageContent,
  type Journey,
  type JourneyInput,
  type JourneyStageInput,
} from "@/lib/journey-api";
import styles from "./JourneyManager.module.css";
import { DialogCloseButton } from "@/components/ui";
import { useModalKeyboard } from "@/lib/use-modal-keyboard";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { Notify } from "@/components/ui";

type Props = {
  classroomId: string;
  classroomName: string;
  notify: Notify;
  /** Opened for editing once the list loads (deep link from the study preview). */
  initialJourneyId?: string;
  /** Journey creation is its own screen with a history entry, owned by the teacher app. */
  creating: boolean;
  onCreate: () => void;
  onCloseCreation: () => void;
};

type DraftStage = JourneyStageInput & {
  itemType?: Journey["stages"][number]["itemType"];
};

type Draft = {
  id?: string;
  title: string;
  description: string;
  status: Journey["status"];
  copyProtected: boolean;
  releasedChapterCount: number | null;
  stages: DraftStage[];
};

function toDraft(journey: Journey): Draft {
  return {
    id: journey.id,
    title: journey.title,
    description: journey.description ?? "",
    status: journey.status,
    copyProtected: journey.copyProtected ?? false,
    releasedChapterCount: journey.releasedChapterCount ?? null,
    stages: journey.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description ?? "",
      activityId: stage.activityId ?? undefined,
      unlockRule: stage.unlockRule,
      completionRule: stage.completionRule,
      sectionId: stage.sectionId ?? undefined,
      sectionTitle: stage.sectionTitle ?? undefined,
      itemType: stage.itemType,
      learningResourceId: stage.learningResourceId ?? undefined,
    })),
  };
}

function emptyDraft(): Draft {
  return { title: "", description: "", status: "DRAFT", copyProtected: false, releasedChapterCount: null, stages: [] };
}

function statusLabel(status: Journey["status"]) {
  if (status === "PUBLISHED") return "PUBLICADA";
  if (status === "ARCHIVED") return "ARQUIVADA";
  return "RASCUNHO";
}

export default function JourneyManager({ classroomId, classroomName, notify, initialJourneyId, creating, onCreate, onCloseCreation }: Props) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [releaseInput, setReleaseInput] = useState("auto");
  const [redemption, setRedemption] = useState<JourneyRedemptionCode | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryDialogRef = useRef<HTMLElement>(null);
  const libraryCloseRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(libraryOpen);
  useModalKeyboard(libraryOpen, () => setLibraryOpen(false), libraryDialogRef, libraryCloseRef);
  const [libraryResources, setLibraryResources] = useState<LearningResource[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryTargetModule, setLibraryTargetModule] = useState<string | undefined>();
  const [textEditor, setTextEditor] = useState<{ content: JourneyStageContent; body: string } | null>(null);
  const textDialogRef = useRef<HTMLElement>(null);
  const textCloseRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(Boolean(textEditor));
  useModalKeyboard(Boolean(textEditor), () => setTextEditor(null), textDialogRef, textCloseRef);

  useEffect(() => {
    if (!draft?.id || draft.status !== "PUBLISHED") { setRedemption(null); return; }
    let active = true;
    void fetchJourneyRedemption(draft.id).then((value) => { if (active) setRedemption(value); }).catch(() => { if (active) setRedemption(null); });
    return () => { active = false; };
  }, [draft?.id, draft?.status]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchJourneys(classroomId)
      .then((rows) => { if (active) setJourneys(rows); })
      .catch((error) => { if (active) notify(error instanceof Error ? error.message : "Não foi possível carregar as jornadas.", "error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId, notify]);

  const selected = useMemo(() => draft?.id ? journeys.find((journey) => journey.id === draft.id) : undefined, [draft?.id, journeys]);
  // Drafts and published Journeys are editable; the server refuses removing a
  // stage students already started. Only an archived Journey is read-only.
  const structuralLocked = draft?.status === "ARCHIVED";
  const published = draft?.status === "PUBLISHED";
  const chapterCount = new Set((draft?.stages ?? []).map(stage => stage.sectionId || stage.sectionTitle || "__default")).size;
  useEffect(() => {
    setReleaseInput(draft?.releasedChapterCount == null ? "auto" : String(draft.releasedChapterCount));
  }, [draft?.id, draft?.releasedChapterCount]);
  const stageGroups = useMemo(() => {
    if (!draft) return [];
    const groups = new Map<string, { key: string; title: string; entries: Array<{ stage: DraftStage; index: number }> }>();
    draft.stages.forEach((stage, index) => {
      const key = stage.sectionId || stage.sectionTitle || "default";
      const title = stage.sectionTitle || "Jornada principal";
      const group = groups.get(key) ?? { key, title, entries: [] };
      group.entries.push({ stage, index });
      groups.set(key, group);
    });
    return [...groups.values()];
  }, [draft]);

  function selectJourney(journey: Journey) { setDraft(toDraft(journey)); setMoreOpen(false); }

  const openedInitialRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!initialJourneyId || openedInitialRef.current === initialJourneyId) return;
    const target = journeys.find((journey) => journey.id === initialJourneyId);
    if (!target) return;
    openedInitialRef.current = initialJourneyId;
    setDraft(toDraft(target));
  }, [initialJourneyId, journeys]);
  function newJourney() { onCreate(); }

  function startBlankJourney() {
    setDraft(emptyDraft());
  }

  async function useContentDraft(contentDraft: ContentDraft) {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await materializeContentDraft(classroomId, contentDraft);
      setJourneys((current) => [saved, ...current.filter((journey) => journey.id !== saved.id)]);
      setDraft(toDraft(saved));
        notify("Estrutura criada como rascunho. Revise antes de publicar.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar a jornada a partir do rascunho.", "error");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function addStage(sectionTitle?: string, sectionId?: string) {
    if (!draft || structuralLocked) return;
    const first = draft.stages.length === 0;
    setDraft({
      ...draft,
      stages: [...draft.stages, {
        title: "Novo conteúdo",
        description: "",
        unlockRule: first ? "IMMEDIATE" : "PREVIOUS_STAGE_COMPLETED",
        completionRule: "MANUAL",
        itemType: "CONTENT",
        sectionId,
        sectionTitle: sectionTitle ?? draft.stages.at(-1)?.sectionTitle ?? "Módulo 1",
      }],
    });
  }

  async function openLibrary(sectionTitle?: string) {
    if (!draft || structuralLocked) return;
    setLibraryTargetModule(sectionTitle);
    setLibraryOpen(true);
    try { setLibraryResources(await fetchContentLibrary()); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível carregar a Biblioteca.", "error"); }
  }

  function addFromLibrary(resource: LearningResource) {
    if (!draft || structuralLocked) return;
    const first = draft.stages.length === 0;
    setDraft({
      ...draft,
      stages: [...draft.stages, {
        title: resource.title,
        description: resource.summary ?? "",
        unlockRule: first ? "IMMEDIATE" : "PREVIOUS_STAGE_COMPLETED",
        completionRule: "MANUAL",
        itemType: "CONTENT",
        sectionTitle: libraryTargetModule ?? draft.stages.at(-1)?.sectionTitle ?? "Módulo 1",
        learningResourceId: resource.id,
      }],
    });
    setLibraryOpen(false);
    notify(`${resource.title} foi adicionado ao rascunho. O snapshot será criado ao salvar a Jornada.`);
  }

  function addModule() {
    if (!draft || structuralLocked) return;
    const moduleCount = new Set(draft.stages.map((stage) => stage.sectionTitle).filter(Boolean)).size;
    addStage(`Módulo ${moduleCount + 1}`);
  }

  function patchStage(index: number, patch: Partial<DraftStage>) {
    if (!draft || structuralLocked) return;
    const stages = draft.stages.map((stage, current) => current === index ? { ...stage, ...patch } : stage);
    if (stages[0]) stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function moveStageTo(index: number, targetIndex: number) {
    if (!draft || structuralLocked || index === targetIndex || targetIndex < 0 || targetIndex >= draft.stages.length) return;
    const stages = [...draft.stages];
    const [moved] = stages.splice(index, 1);
    stages.splice(targetIndex, 0, moved);
    stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function moveModule(groupIndex: number, delta: number) {
    if (!draft || structuralLocked) return;
    const next = groupIndex + delta;
    if (next < 0 || next >= stageGroups.length) return;
    const groups = stageGroups.map((group) => group.entries.map(({ stage }) => stage));
    [groups[groupIndex], groups[next]] = [groups[next], groups[groupIndex]];
    const stages = groups.flat();
    if (stages[0]) stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function removeStage(index: number) {
    if (!draft || structuralLocked) return;
    const stages = draft.stages.filter((_, current) => current !== index);
    if (stages[0]) stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function renameModule(groupKey: string, title: string) {
    if (!draft || structuralLocked) return;
    const stages = draft.stages.map((stage) => {
      const key = stage.sectionId || stage.sectionTitle || "default";
      return key === groupKey ? { ...stage, sectionTitle: title } : stage;
    });
    setDraft({ ...draft, stages });
  }

  function input(): JourneyInput | null {
    if (!draft || !draft.title.trim()) {
      notify("Defina um título para a jornada.");
      return null;
    }
    if (draft.stages.some((stage) => !stage.title.trim())) {
      notify("Todos os conteúdos precisam de título.");
      return null;
    }
    return {
      classroomId,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      copyProtected: draft.copyProtected,
      stages: draft.stages.map((stage, index) => ({
        id: stage.id,
        title: stage.title.trim(),
        description: stage.description?.trim() || undefined,
        activityId: undefined,
        unlockRule: index === 0 ? "IMMEDIATE" : "PREVIOUS_STAGE_COMPLETED",
        completionRule: "MANUAL",
        sectionId: stage.sectionId ?? undefined,
        sectionTitle: stage.sectionTitle ?? undefined,
        itemType: "CONTENT",
        learningResourceId: stage.learningResourceId ?? undefined,
      })),
    };
  }

  async function save() {
    const payload = input();
    if (!payload || !draft || busy) return;
    setBusy(true);
    try {
      const saved = draft.id ? await updateJourney(draft.id, payload) : await createJourney(payload);
      setJourneys((current) => [saved, ...current.filter((journey) => journey.id !== saved.id)]);
      setDraft(toDraft(saved));
      notify(draft.id ? "Jornada atualizada." : "Jornada criada como rascunho.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar a jornada.", "error");
    } finally { setBusy(false); }
  }

  async function saveToLibrary() {
    if (!draft?.id || busy) return;
    setBusy(true);
    try {
      const result = await saveJourneyToLibrary(draft.id);
      const skipped = result.withoutContent ? ` ${result.withoutContent === 1 ? "1 etapa sem conteúdo ficou" : `${result.withoutContent} etapas sem conteúdo ficaram`} de fora.` : "";
      notify(result.created
        ? `Jornada salva na Biblioteca como um material.${skipped} A Jornada não foi alterada.`
        : result.alreadyInLibrary
          ? "Esta versão da jornada já está na Biblioteca."
          : "A jornada ainda não tem conteúdo para salvar na Biblioteca.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar a jornada na Biblioteca.", "error");
    } finally { setBusy(false); }
  }

  // A setting, not structure: it also changes after publishing, saved at once.
  async function changeCopyProtection(copyProtected: boolean) {
    if (!draft?.id || busy) return;
    setBusy(true);
    try {
      const saved = await updateJourney(draft.id, {
        classroomId, title: draft.title, description: draft.description || undefined, copyProtected,
      });
      setJourneys((current) => current.map((journey) => journey.id === saved.id ? saved : journey));
      setDraft(toDraft(saved));
      notify(copyProtected ? "Cópia do conteúdo desativada para os alunos." : "Cópia do conteúdo liberada para os alunos.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível alterar a proteção contra cópia.", "error");
    } finally { setBusy(false); }
  }

  async function saveRelease() {
    if (!draft?.id || !published || busy) return;
    const requested = releaseInput === "auto" ? null : releaseInput.trim() === "" ? NaN : Number(releaseInput);
    if (requested !== null && (!Number.isInteger(requested) || requested < 0 || requested > chapterCount)) {
      notify("Informe uma quantidade entre 0 e " + chapterCount + " capítulos.", "error");
      return;
    }
    if (requested === draft.releasedChapterCount) return;
    // Never unexpectedly hide content from students who may already have viewed it.
    if (requested !== null && (draft.releasedChapterCount === null || requested < draft.releasedChapterCount)
        && !window.confirm("A nova liberação poderá bloquear capítulos que alunos já acessaram. O progresso salvo será preservado. Continuar?")) return;
    setBusy(true);
    try {
      const saved = await changeJourneyRelease(draft.id, requested);
      setJourneys(current => current.map(journey => journey.id === saved.id ? saved : journey));
      setDraft(toDraft(saved));
      notify(requested === null
        ? "Progressão original restaurada."
        : requested === 0
          ? "Todos os capítulos foram bloqueados para os alunos."
          : "Primeiros " + requested + " capítulos liberados para a turma.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível atualizar a liberação.", "error");
    } finally { setBusy(false); }
  }

  async function openTextEditor(stageId: string) {
    if (!draft?.id || busy) return;
    setBusy(true);
    try {
      const content = await fetchJourneyStageContent(draft.id, stageId);
      setTextEditor({ content, body: content.body ?? "" });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível abrir o texto do conteúdo.", "error");
    } finally { setBusy(false); }
  }

  async function saveText() {
    if (!draft?.id || !textEditor || busy) return;
    setBusy(true);
    try {
      const saved = await updateJourneyStageContent(draft.id, textEditor.content.stageId, textEditor.body);
      // Only the text changed; unsaved edits to titles and order stay in the draft.
      setJourneys((current) => current.map((journey) => journey.id === saved.id ? saved : journey));
      setTextEditor(null);
      notify(saved.status === "PUBLISHED" ? "Texto atualizado. Os alunos já veem a versão corrigida e mantêm o progresso." : "Texto atualizado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o texto.", "error");
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!draft?.id || draft.status !== "DRAFT" || busy) return;
    if (selected && JSON.stringify(toDraft(selected)) !== JSON.stringify(draft)) {
      notify("Salve as alterações antes de publicar.");
      return;
    }
    setBusy(true);
    try {
      const published = await publishJourney(draft.id);
      setJourneys((current) => current.map((journey) => journey.id === published.id ? published : journey));
      setDraft(toDraft(published));
      notify("Jornada publicada. Você ainda pode corrigir textos e acrescentar conteúdos sem apagar o progresso dos alunos.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível publicar a jornada.", "error");
    } finally { setBusy(false); }
  }

  async function archive() {
    if (!draft?.id || draft.status === "ARCHIVED" || busy) return;
    setBusy(true);
    try {
      const archived = await archiveJourney(draft.id);
      setJourneys((current) => current.map((journey) => journey.id === archived.id ? archived : journey));
      setDraft(toDraft(archived));
      notify("Jornada arquivada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível arquivar a jornada.", "error");
    } finally { setBusy(false); }
  }

  if (creating) {
    return (
      <div className={styles.workspace}>
        <JourneyCreationWizard
          classroomId={classroomId}
          classroomName={classroomName}
          onClose={onCloseCreation}
          onBlank={startBlankJourney}
          onUseDraft={useContentDraft}
          notify={notify}
        />
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>JORNADAS · CONTEÚDOS</span>
          <h2>Jornadas de aprendizagem</h2>
          <p>Comece do zero, use um modelo ou transforme o material que você já possui em um rascunho de jornada.</p>
        </div>
        <button className={styles.primary} type="button" onClick={newJourney}>+ Nova jornada</button>
      </header>

      <div className={styles.grid}>
        <aside className={styles.catalog} aria-label="Jornadas da turma">
          {loading ? (
            <div className={styles.emptyCatalog}>Carregando jornadas...</div>
          ) : journeys.length === 0 ? (
            <div className={styles.emptyCatalog}>Nenhuma jornada criada para {classroomName}.</div>
          ) : journeys.map((journey) => (
            <button key={journey.id} type="button" className={`${styles.card} ${draft?.id === journey.id ? styles.active : ""}`} onClick={() => selectJourney(journey)}>
              <div className={styles.cardTop}>
                <h3>{journey.title}</h3>
                <span className={`${styles.status} ${styles[journey.status.toLowerCase()]}`}>{statusLabel(journey.status)}</span>
              </div>
              <p>{journey.description || "Sem descrição."}</p>
              <div className={styles.cardMeta}><span>{journey.stages.length} conteúdo(s)</span><span>Atualizada {new Date(journey.updatedAt).toLocaleDateString("pt-BR")}</span></div>
            </button>
          ))}
        </aside>

        <section className={styles.editor}>
          {!draft ? (
            <div className={styles.editorEmpty}><strong>Selecione ou crie uma jornada</strong><span>O Journey Core começa pela estrutura e pelas regras de progressão.</span></div>
          ) : (
            <>
              <div className={styles.editorHead}>
                <div>
                  <h3>{draft.id ? draft.title || "Jornada sem título" : "Nova jornada"}</h3>
                  <p>{structuralLocked
                    ? "Jornada arquivada: somente leitura."
                    : published
                      ? "Publicada e editável. Os alunos mantêm o progresso; um conteúdo que algum aluno já começou não pode ser removido."
                      : "Rascunho editável. Organize módulos e conteúdos; as regras de progressão são aplicadas automaticamente."}</p>
                </div>
                <div className={styles.actions}>
                  {draft.id && <a className={styles.secondary} href={`/learn/journeys/${draft.id}?preview=teacher`}>Ver jornada</a>}
                  {draft.status !== "ARCHIVED" && <button className={styles.primary} type="button" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : published ? "Salvar alterações" : "Salvar"}</button>}
                  {draft.id && draft.status === "DRAFT" && <button className={styles.ghost} type="button" disabled={busy || draft.stages.length === 0} onClick={() => void publish()}>Publicar</button>}
                  <div className={styles.moreActions}><button className={styles.secondary} type="button" aria-label="Mais ações" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>•••</button>{moreOpen && <div className={styles.moreMenu}><button type="button" onClick={() => { setDraft(null); setMoreOpen(false); }}>Fechar painel</button>{draft.id && draft.stages.length > 0 && <button type="button" disabled={busy} onClick={() => { setMoreOpen(false); void saveToLibrary(); }}>Salvar jornada na Biblioteca</button>}{draft.id && draft.status !== "ARCHIVED" && <button className={styles.moreDanger} type="button" disabled={busy} onClick={() => { setMoreOpen(false); void archive(); }}>Arquivar jornada</button>}</div>}</div>
                </div>
              </div>

              {draft.status !== "DRAFT" ? (
                    <div className={styles.publishedSummary}>
                      {published ? (
                        <div className={styles.fields}>
                          <label className={styles.field}><span>Título</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                          <label className={`${styles.field} ${styles.full}`}><span>Descrição</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Objetivo e contexto da jornada." /></label>
                        </div>
                      ) : (
                        <>
                          <div className={styles.publishedTitle}><strong>{draft.title}</strong><span className={`${styles.status} ${styles[draft.status.toLowerCase()]}`}>{statusLabel(draft.status)}</span></div>
                          <p>{draft.description || "Sem descrição."}</p>
                        </>
                      )}
                      <label className={`${styles.field} ${styles.copyToggle}`}>
                        <input type="checkbox" checked={draft.copyProtected} disabled={busy} onChange={(event) => void changeCopyProtection(event.target.checked)} />
                        <span>Impedir cópia do conteúdo
                          <small>Vale imediatamente para os alunos. Desencoraja a cópia, mas não impede captura de tela.</small>
                        </span>
                      </label>
                      {published && <section className={styles.releasePanel} aria-label="Liberação gradual de capítulos">
                        <div><strong>Liberação gradual</strong><p>Escolha quantos capítulos iniciais ficarão disponíveis para a turma. Todos os conteúdos desses capítulos poderão ser estudados; os demais ficam bloqueados até sua liberação. O progresso é preservado.</p></div>
                        <div className={styles.releaseControls}>
                          <label htmlFor="journey-release-count">Modo de liberação</label>
                          <select id="journey-release-count" disabled={busy} value={releaseInput === "auto" ? "auto" : "teacher"} onChange={event => setReleaseInput(event.target.value === "auto" ? "auto" : String(draft.releasedChapterCount ?? Math.min(1, chapterCount)))}>
                            <option value="auto">Progressão original (por conclusão)</option>
                            <option value="teacher">Controlar por quantidade</option>
                          </select>
                          {releaseInput !== "auto" && <label className={styles.releaseCountField} htmlFor="journey-released-amount">Liberar os primeiros
                            <input id="journey-released-amount" type="number" inputMode="numeric" min={0} max={chapterCount} step={1} value={releaseInput} disabled={busy} onChange={event => setReleaseInput(event.target.value)} />
                            <span>de {chapterCount} capítulos</span>
                          </label>}
                          <button className={styles.secondary} type="button" disabled={busy || releaseInput === (draft.releasedChapterCount == null ? "auto" : String(draft.releasedChapterCount))} onClick={() => void saveRelease()}>Aplicar liberação</button>
                        </div>
                      </section>}
                      <div className={styles.publishedMeta}><span>{stageGroups.length} {stageGroups.length === 1 ? "módulo" : "módulos"}</span><span>{draft.stages.length} {draft.stages.length === 1 ? "conteúdo" : "conteúdos"}</span></div>
                      <div className={styles.redemptionBox}>
                        <div><span>ACESSO POR CÓDIGO</span><strong>{redemption?.active && redemption.code ? redemption.code : "Não disponibilizado"}</strong><small>{redemption?.redeemedCount ?? 0} resgate(s) · o código adiciona a Jornada ao perfil do aluno.</small></div>
                        <div className={styles.redemptionActions}>
                          {!redemption?.active && <button type="button" className={styles.secondary} disabled={busy} onClick={async()=>{if(!draft.id)return;setBusy(true);try{setRedemption(await enableJourneyRedemption(draft.id));notify("Código da Jornada disponibilizado.");}catch(e){notify(e instanceof Error?e.message:"Não foi possível gerar o código.", "error");}finally{setBusy(false);}}}>Gerar código</button>}
                          {redemption?.active && <><button type="button" className={styles.secondary} disabled={busy} onClick={async()=>{if(!draft.id||!window.confirm("Gerar um novo código? O anterior deixará de aceitar novos resgates."))return;setBusy(true);try{setRedemption(await regenerateJourneyRedemption(draft.id));notify("Código regenerado. Acessos existentes foram preservados.");}catch(e){notify(e instanceof Error?e.message:"Não foi possível regenerar o código.", "error");}finally{setBusy(false);}}}>Regenerar</button><button type="button" className={styles.ghost} disabled={busy} onClick={async()=>{if(!draft.id)return;setBusy(true);try{await disableJourneyRedemption(draft.id);setRedemption(redemption?{...redemption,active:false}:null);notify("Novos resgates foram desativados. Acessos existentes permanecem.");}catch(e){notify(e instanceof Error?e.message:"Não foi possível desativar o código.", "error");}finally{setBusy(false);}}}>Desativar</button></>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fields}>
                      <label className={styles.field}><span>Título</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Fundamentos de Backend" /></label>
                      <label className={`${styles.field} ${styles.full}`}><span>Descrição</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Objetivo e contexto da jornada." /></label>
                      <label className={`${styles.field} ${styles.full} ${styles.copyToggle}`}>
                        <input type="checkbox" checked={draft.copyProtected} onChange={(event) => setDraft({ ...draft, copyProtected: event.target.checked })} />
                        <span>Impedir cópia do conteúdo
                          <small>Os alunos não conseguem selecionar, copiar nem usar o botão direito no leitor. Desencoraja a cópia, mas não impede captura de tela.</small>
                        </span>
                      </label>
                    </div>
                  )}

                  <div className={styles.builderSection}>
                    <div className={styles.builderHeader}>
                      <div>
                        <h4>Estrutura da jornada</h4>
                        <span>Organize o material em módulos e conteúdos, na mesma ordem em que o aluno estudará.</span>
                      </div>
                      {!structuralLocked && (
                        <div className={styles.builderActions}>
                          <button className={styles.secondary} type="button" onClick={()=>void openLibrary()}>Biblioteca</button><button className={styles.secondary} type="button" onClick={addModule}>+ Adicionar módulo</button>
                        </div>
                      )}
                    </div>

                    <div className={styles.moduleList}>
                      {stageGroups.map((group, groupIndex) => (
                        <section className={styles.moduleCard} key={group.key}>
                          <header className={styles.moduleHeader}>
                            <div className={styles.moduleNumber}>{String(groupIndex + 1).padStart(2, "0")}</div>
                            <div className={styles.moduleIdentity}>
                              <span>MÓDULO {String(groupIndex + 1).padStart(2, "0")}</span>
                              {structuralLocked ? (
                                <h4>{group.title}</h4>
                              ) : (
                                <input
                                  value={group.title}
                                  aria-label={`Título do módulo ${groupIndex + 1}`}
                                  onChange={(event) => renameModule(group.key, event.target.value)}
                                />
                              )}
                            </div>
                            <div className={styles.moduleMeta}>
                              <span>{group.entries.length} {group.entries.length === 1 ? "conteúdo" : "conteúdos"}</span>
                              {!structuralLocked && (
                                <div className={styles.moduleControls}>
                                  <button type="button" title="Mover módulo para cima" disabled={groupIndex === 0} onClick={() => moveModule(groupIndex, -1)}>↑</button>
                                  <button type="button" title="Mover módulo para baixo" disabled={groupIndex === stageGroups.length - 1} onClick={() => moveModule(groupIndex, 1)}>↓</button>
                                  <button type="button" onClick={() => void openLibrary(group.title)}>Biblioteca</button><button type="button" onClick={() => addStage(group.title, group.entries[0]?.stage.sectionId)}>+ Adicionar conteúdo</button>
                                </div>
                              )}
                            </div>
                          </header>

                          <div className={styles.moduleItems}>
                            {group.entries.map(({ stage, index }, entryIndex) => (
                              structuralLocked ? (
                                <article className={styles.builderItemReadOnly} key={stage.id ?? `new-${index}`}>
                                  <div className={styles.contentHandle} aria-hidden="true">≡</div>
                                  <div className={styles.itemMain}>
                                    <strong>{stage.title}</strong>
                                    {stage.description && <p>{stage.description}</p>}
                                  </div>
                                </article>
                              ) : (
                                <article className={styles.builderItem} key={stage.id ?? `new-${index}`}>
                                  <div className={styles.contentHandle} aria-hidden="true">≡</div>
                                  <div className={styles.itemMain}>
                                    <input
                                      className={styles.itemTitleInput}
                                      value={stage.title}
                                      aria-label={`Título do conteúdo ${index + 1}`}
                                      onChange={(event) => patchStage(index, { title: event.target.value })}
                                      placeholder="Título do conteúdo"
                                    />
                                    <input
                                      className={styles.itemDescriptionInput}
                                      value={stage.description ?? ""}
                                      aria-label={`Descrição do conteúdo ${index + 1}`}
                                      onChange={(event) => patchStage(index, { description: event.target.value })}
                                      placeholder="Descrição opcional"
                                    />
                                  </div>
                                  <div className={styles.itemActions} aria-label={`Organizar conteúdo ${index + 1}`}>
                                    {stage.id && stage.learningResourceId && (
                                      <button type="button" className={styles.editText} disabled={busy} onClick={() => void openTextEditor(stage.id!)}>Editar texto</button>
                                    )}
                                    <button type="button" title="Mover para cima" disabled={entryIndex === 0} onClick={() => moveStageTo(index, group.entries[entryIndex - 1]?.index ?? index)}>↑</button>
                                    <button type="button" title="Mover para baixo" disabled={entryIndex === group.entries.length - 1} onClick={() => moveStageTo(index, group.entries[entryIndex + 1]?.index ?? index)}>↓</button>
                                    <button type="button" title="Remover conteúdo" onClick={() => removeStage(index)}>×</button>
                                  </div>
                                </article>
                              )
                            ))}
                          </div>
                        </section>
                      ))}

                      {draft.stages.length === 0 && (
                        <div className={styles.builderEmpty}>
                          <strong>Sua jornada ainda está vazia.</strong>
                          <span>Comece criando o primeiro módulo da jornada.</span>
                          {!structuralLocked && <button className={styles.primary} type="button" onClick={addModule}>Criar primeiro módulo</button>}
                        </div>
                      )}
                    </div>
                  </div>
            </>
          )}
        </section>
      </div>
      {libraryOpen && (
        <div className={styles.libraryBackdrop}>
          <section ref={libraryDialogRef} tabIndex={-1} className={styles.libraryPicker} role="dialog" aria-modal="true" aria-labelledby="library-picker-title">
            <header><div><span>BIBLIOTECA</span><h3 id="library-picker-title">Adicionar material</h3><p>Escolha um material reutilizável. A Journey receberá um snapshot ao ser salva.</p></div><DialogCloseButton ref={libraryCloseRef} label="Fechar biblioteca" onClick={() => setLibraryOpen(false)} /></header>
            <input className={styles.librarySearch} value={libraryQuery} onChange={(event)=>setLibraryQuery(event.target.value)} placeholder="Buscar materiais..." aria-label="Buscar materiais na Biblioteca"/>
            <div className={styles.libraryResults}>
              {libraryResources.filter((resource)=>[resource.title,resource.summary??""].join(" ").toLowerCase().includes(libraryQuery.toLowerCase())).map((resource)=>(
                <button type="button" key={resource.id} onClick={()=>addFromLibrary(resource)}>
                  <span><strong>{resource.title}</strong><small>{resource.summary || "Sem descrição."}</small></span>
                  <em>Revisão {resource.revision}</em>
                </button>
              ))}
              {libraryResources.length===0 && <p className={styles.libraryEmpty}>Sua Biblioteca ainda está vazia.</p>}
            </div>
          </section>
        </div>
      )}
      {textEditor && (
        <div className={styles.libraryBackdrop}>
          <section ref={textDialogRef} tabIndex={-1} className={`${styles.libraryPicker} ${styles.textEditor}`} role="dialog" aria-modal="true" aria-labelledby="stage-text-title">
            <header><div><span>CONTEÚDO DA ETAPA</span><h3 id="stage-text-title">{textEditor.content.title}</h3><p>{textEditor.content.libraryMaterial ? "Este texto vem de um material da Biblioteca. Salvar também atualiza o material na Biblioteca." : "Corrija ou melhore o texto. O progresso dos alunos é mantido."}</p></div><DialogCloseButton ref={textCloseRef} label="Fechar editor de texto" onClick={() => setTextEditor(null)} /></header>
            <textarea className={styles.textEditorBody} value={textEditor.body} readOnly={textEditor.content.readOnly} aria-label="Texto do conteúdo" onChange={(event) => setTextEditor((current) => current ? { ...current, body: event.target.value } : current)} />
            <div className={styles.textEditorActions}>
              <button className={styles.secondary} type="button" onClick={() => setTextEditor(null)}>Cancelar</button>
              {!textEditor.content.readOnly && <button className={styles.primary} type="button" disabled={busy || !textEditor.body.trim()} onClick={() => void saveText()}>{busy ? "Salvando..." : "Salvar texto"}</button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
