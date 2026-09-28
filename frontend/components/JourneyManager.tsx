"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity } from "@/lib/types";
import { materializeContentDraft, type ContentDraft } from "@/lib/content-ingestion-api";
import JourneyCreationWizard from "@/components/JourneyCreationWizard";
import JourneyMapPreview from "@/components/JourneyMapPreview";
import {
  archiveJourney,
  createJourney,
  fetchJourneys,
  publishJourney,
  updateJourney,
  type Journey,
  type JourneyCompletionRule,
  type JourneyInput,
  type JourneyStageInput,
  type JourneyUnlockRule,
} from "@/lib/journey-api";
import styles from "./JourneyManager.module.css";

type Props = {
  classroomId: string;
  classroomName: string;
  activities: Activity[];
  notify: (message: string) => void;
};

type DraftStage = JourneyStageInput & {
  itemType?: Journey["stages"][number]["itemType"];
};

type Draft = {
  id?: string;
  title: string;
  description: string;
  status: Journey["status"];
  stages: DraftStage[];
};

function toDraft(journey: Journey): Draft {
  return {
    id: journey.id,
    title: journey.title,
    description: journey.description ?? "",
    status: journey.status,
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
  return { title: "", description: "", status: "DRAFT", stages: [] };
}

function statusLabel(status: Journey["status"]) {
  if (status === "PUBLISHED") return "PUBLICADA";
  if (status === "ARCHIVED") return "ARQUIVADA";
  return "RASCUNHO";
}

function completionLabel(rule: JourneyCompletionRule) {
  if (rule === "ACTIVITY_SUBMITTED") return "Atividade enviada";
  if (rule === "ACTIVITY_GRADED") return "Atividade corrigida";
  return "Conclusão manual";
}

function unlockLabel(rule: JourneyUnlockRule) {
  return rule === "IMMEDIATE" ? "Disponível imediatamente" : "Após concluir a etapa anterior";
}

function itemTypeLabel(type: DraftStage["itemType"]) {
  if (type === "CONTENT") return "Conteúdo";
  if (type === "QUIZ") return "Quiz";
  if (type === "CHALLENGE") return "Desafio";
  if (type === "CHECKPOINT") return "Checkpoint";
  if (type === "EXTERNAL_RESOURCE") return "Recurso externo";
  return "Atividade";
}

export default function JourneyManager({ classroomId, classroomName, activities, notify }: Props) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creationOpen, setCreationOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"structure" | "preview">("structure");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchJourneys(classroomId)
      .then((rows) => { if (active) setJourneys(rows); })
      .catch((error) => { if (active) notify(error instanceof Error ? error.message : "Não foi possível carregar as jornadas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId, notify]);

  const selected = useMemo(() => draft?.id ? journeys.find((journey) => journey.id === draft.id) : undefined, [draft?.id, journeys]);
  const structuralLocked = draft?.status !== "DRAFT";
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

  function selectJourney(journey: Journey) { setDraft(toDraft(journey)); setViewMode("structure"); }
  function newJourney() { setCreationOpen(true); }

  function startBlankJourney() {
    setDraft(emptyDraft());
    setViewMode("structure");
  }

  async function useContentDraft(contentDraft: ContentDraft) {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await materializeContentDraft(classroomId, contentDraft);
      setJourneys((current) => [saved, ...current.filter((journey) => journey.id !== saved.id)]);
      setDraft(toDraft(saved));
      setViewMode("structure");
      notify("Estrutura criada como rascunho. Revise antes de publicar.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar a jornada a partir do rascunho.");
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
        title: "Nova etapa",
        description: "",
        unlockRule: first ? "IMMEDIATE" : "PREVIOUS_STAGE_COMPLETED",
        completionRule: "MANUAL",
        itemType: "CONTENT",
        sectionId,
        sectionTitle: sectionTitle ?? draft.stages.at(-1)?.sectionTitle ?? "Módulo 1",
      }],
    });
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
      notify("Todas as etapas precisam de título.");
      return null;
    }
    if (draft.stages.some((stage) => stage.completionRule !== "MANUAL" && !stage.activityId)) {
      notify("Etapas com conclusão por atividade precisam apontar para uma atividade.");
      return null;
    }
    return {
      classroomId,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      stages: draft.stages.map((stage, index) => ({
        id: stage.id,
        title: stage.title.trim(),
        description: stage.description?.trim() || undefined,
        activityId: stage.activityId,
        unlockRule: index === 0 ? "IMMEDIATE" : stage.unlockRule,
        completionRule: stage.completionRule,
        sectionId: stage.sectionId ?? undefined,
        sectionTitle: stage.sectionTitle ?? undefined,
        itemType: stage.itemType ?? "ACTIVITY",
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
      notify(error instanceof Error ? error.message : "Não foi possível salvar a jornada.");
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
      notify("Jornada publicada. A estrutura agora está protegida para preservar o progresso dos alunos.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível publicar a jornada.");
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
      notify(error instanceof Error ? error.message : "Não foi possível arquivar a jornada.");
    } finally { setBusy(false); }
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>JORNADAS · CONTEÚDOS · 16.2</span>
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
              <div className={styles.cardMeta}><span>{journey.stages.length} etapa(s)</span><span>Atualizada {new Date(journey.updatedAt).toLocaleDateString("pt-BR")}</span></div>
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
                  <p>{structuralLocked ? "Estrutura protegida após publicação para preservar o progresso." : "Rascunho editável. A primeira etapa fica disponível imediatamente."}</p>
                </div>
                <div className={styles.actions}>
                  {draft.id && <a className={styles.secondary} href={`/learn/journeys/${draft.id}?preview=teacher`}>Ver jornada</a>}
                  <button className={styles.secondary} type="button" disabled={busy} onClick={() => setDraft(null)}>Fechar</button>
                  {draft.status === "DRAFT" && <button className={styles.primary} type="button" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : "Salvar"}</button>}
                  {draft.id && draft.status === "DRAFT" && <button className={styles.ghost} type="button" disabled={busy || draft.stages.length === 0} onClick={() => void publish()}>Publicar</button>}
                  {draft.id && draft.status !== "ARCHIVED" && <button className={styles.danger} type="button" disabled={busy} onClick={() => void archive()}>Arquivar</button>}
                </div>
              </div>

              <div className={styles.viewTabs} role="tablist" aria-label="Visualização da jornada">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "structure"}
                  className={viewMode === "structure" ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setViewMode("structure")}
                >
                  Estrutura
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "preview"}
                  className={viewMode === "preview" ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setViewMode("preview")}
                >
                  Visualizar como aluno
                </button>
              </div>

              {viewMode === "preview" ? (
                <JourneyMapPreview
                  title={draft.title}
                  description={draft.description}
                  stages={draft.stages.map((stage, index) => ({
                    id: stage.id ?? `draft-${index}`,
                    title: stage.title,
                    description: stage.description ?? null,
                    sectionId: stage.sectionId ?? null,
                    sectionTitle: stage.sectionTitle ?? null,
                    itemType: stage.itemType ?? "ACTIVITY",
                  }))}
                />
              ) : (
                <>
                  {structuralLocked ? (
                    <div className={styles.publishedSummary}>
                      <div><span>Título</span><strong>{draft.title}</strong></div>
                      <div><span>Descrição</span><p>{draft.description || "Sem descrição."}</p></div>
                    </div>
                  ) : (
                    <div className={styles.fields}>
                      <label className={styles.field}><span>Título</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Fundamentos de Backend" /></label>
                      <label className={`${styles.field} ${styles.full}`}><span>Descrição</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Objetivo e contexto da jornada." /></label>
                    </div>
                  )}

                  <div className={styles.builderSection}>
                    <div className={styles.builderHeader}>
                      <div>
                        <h4>Estrutura da jornada</h4>
                        <span>Organize por módulos. Cada item pode ser conteúdo, atividade, quiz, desafio, checkpoint ou recurso.</span>
                      </div>
                      {!structuralLocked && (
                        <div className={styles.builderActions}>
                          <button className={styles.secondary} type="button" onClick={() => addStage()}>+ Item</button>
                          <button className={styles.primary} type="button" onClick={addModule}>+ Módulo</button>
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
                              <span>{group.entries.length} {group.entries.length === 1 ? "item" : "itens"}</span>
                              {!structuralLocked && (
                                <div className={styles.moduleControls}>
                                  <button type="button" title="Mover módulo para cima" disabled={groupIndex === 0} onClick={() => moveModule(groupIndex, -1)}>↑</button>
                                  <button type="button" title="Mover módulo para baixo" disabled={groupIndex === stageGroups.length - 1} onClick={() => moveModule(groupIndex, 1)}>↓</button>
                                  <button type="button" onClick={() => addStage(group.title, group.entries[0]?.stage.sectionId)}>+ adicionar item</button>
                                </div>
                              )}
                            </div>
                          </header>

                          <div className={styles.moduleItems}>
                            {group.entries.map(({ stage, index }, entryIndex) => {
                              const activity = activities.find((item) => item.id === stage.activityId);
                              return structuralLocked ? (
                                <article className={styles.builderItemReadOnly} key={stage.id ?? `new-${index}`}>
                                  <div className={styles.itemTypeIcon}>{itemTypeLabel(stage.itemType)}</div>
                                  <div className={styles.itemMain}>
                                    <strong>{stage.title}</strong>
                                    {stage.description && <p>{stage.description}</p>}
                                    <div className={styles.itemMetaLine}>
                                      <span>{completionLabel(stage.completionRule)}</span>
                                      <span>{unlockLabel(index === 0 ? "IMMEDIATE" : stage.unlockRule)}</span>
                                      {activity && <span>{activity.title}</span>}
                                    </div>
                                  </div>
                                </article>
                              ) : (
                                <article className={styles.builderItem} key={stage.id ?? `new-${index}`}>
                                  <div className={styles.itemOrder}>{index + 1}</div>
                                  <div className={styles.itemMain}>
                                    <div className={styles.itemTopRow}>
                                      <select
                                        className={styles.itemTypeSelect}
                                        value={stage.itemType ?? "CONTENT"}
                                        aria-label={`Tipo do item ${index + 1}`}
                                        onChange={(event) => patchStage(index, { itemType: event.target.value as DraftStage["itemType"] })}
                                      >
                                        <option value="CONTENT">Conteúdo</option>
                                        <option value="ACTIVITY">Atividade</option>
                                        <option value="QUIZ">Quiz</option>
                                        <option value="CHALLENGE">Desafio</option>
                                        <option value="CHECKPOINT">Checkpoint</option>
                                        <option value="EXTERNAL_RESOURCE">Recurso externo</option>
                                      </select>
                                      <input
                                        className={styles.itemTitleInput}
                                        value={stage.title}
                                        aria-label={`Título do item ${index + 1}`}
                                        onChange={(event) => patchStage(index, { title: event.target.value })}
                                      />
                                    </div>
                                    <input
                                      className={styles.itemDescriptionInput}
                                      value={stage.description ?? ""}
                                      aria-label={`Descrição do item ${index + 1}`}
                                      onChange={(event) => patchStage(index, { description: event.target.value })}
                                      placeholder="Descrição opcional"
                                    />
                                    <details className={styles.itemAdvanced}>
                                      <summary>Regras e vínculo</summary>
                                      <div className={styles.itemAdvancedGrid}>
                                        <label className={styles.field}><span>Atividade vinculada</span><select value={stage.activityId ?? ""} onChange={(event) => patchStage(index, { activityId: event.target.value || undefined })}><option value="">Nenhuma</option>{activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                                        <label className={styles.field}><span>Critério de conclusão</span><select value={stage.completionRule} onChange={(event) => patchStage(index, { completionRule: event.target.value as JourneyCompletionRule })}><option value="MANUAL">Manual</option><option value="ACTIVITY_SUBMITTED">Atividade enviada</option><option value="ACTIVITY_GRADED">Atividade corrigida</option></select></label>
                                        <label className={styles.field}><span>Desbloqueio</span><select value={index === 0 ? "IMMEDIATE" : stage.unlockRule} disabled={index === 0} onChange={(event) => patchStage(index, { unlockRule: event.target.value as JourneyUnlockRule })}><option value="IMMEDIATE">Imediato</option><option value="PREVIOUS_STAGE_COMPLETED">Após etapa anterior</option></select></label>
                                      </div>
                                    </details>
                                  </div>
                                  <div className={styles.itemActions} aria-label={`Organizar item ${index + 1}`}>
                                    <button
                                      type="button"
                                      title="Mover para cima"
                                      disabled={entryIndex === 0}
                                      onClick={() => moveStageTo(index, group.entries[entryIndex - 1]?.index ?? index)}
                                    >↑</button>
                                    <button
                                      type="button"
                                      title="Mover para baixo"
                                      disabled={entryIndex === group.entries.length - 1}
                                      onClick={() => moveStageTo(index, group.entries[entryIndex + 1]?.index ?? index)}
                                    >↓</button>
                                    <button type="button" title="Remover item" onClick={() => removeStage(index)}>×</button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      ))}

                      {draft.stages.length === 0 && (
                        <div className={styles.builderEmpty}>
                          <strong>Sua jornada ainda está vazia.</strong>
                          <span>Comece criando um módulo ou adicionando o primeiro item.</span>
                          {!structuralLocked && <button className={styles.primary} type="button" onClick={addModule}>Criar primeiro módulo</button>}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
      <JourneyCreationWizard
        open={creationOpen}
        classroomId={classroomId}
        onClose={() => setCreationOpen(false)}
        onBlank={startBlankJourney}
        onUseDraft={useContentDraft}
        notify={notify}
      />
    </div>
  );
}
