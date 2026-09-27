"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity } from "@/lib/types";
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

type Draft = {
  id?: string;
  title: string;
  description: string;
  status: Journey["status"];
  stages: JourneyStageInput[];
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

export default function JourneyManager({ classroomId, classroomName, activities, notify }: Props) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  function selectJourney(journey: Journey) { setDraft(toDraft(journey)); }
  function newJourney() { setDraft(emptyDraft()); }

  function addStage() {
    if (!draft || structuralLocked) return;
    const first = draft.stages.length === 0;
    setDraft({
      ...draft,
      stages: [...draft.stages, {
        title: "",
        description: "",
        unlockRule: first ? "IMMEDIATE" : "PREVIOUS_STAGE_COMPLETED",
        completionRule: "MANUAL",
      }],
    });
  }

  function patchStage(index: number, patch: Partial<JourneyStageInput>) {
    if (!draft || structuralLocked) return;
    const stages = draft.stages.map((stage, current) => current === index ? { ...stage, ...patch } : stage);
    if (stages[0]) stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function moveStage(index: number, delta: number) {
    if (!draft || structuralLocked) return;
    const next = index + delta;
    if (next < 0 || next >= draft.stages.length) return;
    const stages = [...draft.stages];
    [stages[index], stages[next]] = [stages[next], stages[index]];
    stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
    setDraft({ ...draft, stages });
  }

  function removeStage(index: number) {
    if (!draft || structuralLocked) return;
    const stages = draft.stages.filter((_, current) => current !== index);
    if (stages[0]) stages[0] = { ...stages[0], unlockRule: "IMMEDIATE" };
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
        ...stage,
        title: stage.title.trim(),
        description: stage.description?.trim() || undefined,
        unlockRule: index === 0 ? "IMMEDIATE" : stage.unlockRule,
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
          <span className={styles.eyebrow}>JOURNEY CORE · 16.1</span>
          <h2>Jornadas de aprendizagem</h2>
          <p>Estruture a sequência da turma, defina como cada etapa é desbloqueada e qual evidência conclui o avanço.</p>
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
                  <button className={styles.secondary} type="button" disabled={busy} onClick={() => setDraft(null)}>Fechar</button>
                  {draft.status === "DRAFT" && <button className={styles.primary} type="button" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : "Salvar"}</button>}
                  {draft.id && draft.status === "DRAFT" && <button className={styles.ghost} type="button" disabled={busy || draft.stages.length === 0} onClick={() => void publish()}>Publicar</button>}
                  {draft.id && draft.status !== "ARCHIVED" && <button className={styles.danger} type="button" disabled={busy} onClick={() => void archive()}>Arquivar</button>}
                </div>
              </div>

              <div className={styles.fields}>
                <label className={styles.field}><span>Título</span><input value={draft.title} disabled={structuralLocked} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Fundamentos de Backend" /></label>
                <label className={`${styles.field} ${styles.full}`}><span>Descrição</span><textarea value={draft.description} disabled={structuralLocked} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Objetivo e contexto da jornada." /></label>
              </div>

              <div className={styles.stageSection}>
                <div className={styles.stageHeader}>
                  <div><h4>Etapas</h4><span className={styles.ruleHint}>A ordem define a progressão. Regras baseadas em atividade usam a entrega existente como fonte de verdade.</span></div>
                  <button className={styles.secondary} type="button" disabled={structuralLocked} onClick={addStage}>+ Adicionar etapa</button>
                </div>

                <div className={styles.stageList}>
                  {draft.stages.map((stage, index) => (
                    <article className={styles.stage} key={stage.id ?? `new-${index}`}>
                      <div className={styles.stageIndex}>{index + 1}</div>
                      <div className={styles.stageBody}>
                        <label className={styles.field}><span>Título da etapa</span><input value={stage.title} disabled={structuralLocked} onChange={(event) => patchStage(index, { title: event.target.value })} /></label>
                        <div className={styles.stageGrid}>
                          <label className={styles.field}><span>Atividade vinculada</span><select value={stage.activityId ?? ""} disabled={structuralLocked} onChange={(event) => patchStage(index, { activityId: event.target.value || undefined })}><option value="">Nenhuma</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
                          <label className={styles.field}><span>Critério de conclusão</span><select value={stage.completionRule} disabled={structuralLocked} onChange={(event) => patchStage(index, { completionRule: event.target.value as JourneyCompletionRule })}><option value="MANUAL">Manual</option><option value="ACTIVITY_SUBMITTED">Atividade enviada</option><option value="ACTIVITY_GRADED">Atividade corrigida</option></select></label>
                          <label className={styles.field}><span>Desbloqueio</span><select value={index === 0 ? "IMMEDIATE" : stage.unlockRule} disabled={structuralLocked || index === 0} onChange={(event) => patchStage(index, { unlockRule: event.target.value as JourneyUnlockRule })}><option value="IMMEDIATE">Imediato</option><option value="PREVIOUS_STAGE_COMPLETED">Após etapa anterior</option></select></label>
                          <label className={styles.field}><span>Descrição opcional</span><input value={stage.description ?? ""} disabled={structuralLocked} onChange={(event) => patchStage(index, { description: event.target.value })} /></label>
                        </div>
                      </div>
                      <div className={styles.stageActions} aria-label={`Organizar etapa ${index + 1}`}>
                        <button type="button" title="Mover para cima" disabled={structuralLocked || index === 0} onClick={() => moveStage(index, -1)}>↑</button>
                        <button type="button" title="Mover para baixo" disabled={structuralLocked || index === draft.stages.length - 1} onClick={() => moveStage(index, 1)}>↓</button>
                        <button type="button" title="Remover etapa" disabled={structuralLocked} onClick={() => removeStage(index)}>×</button>
                      </div>
                    </article>
                  ))}
                  {draft.stages.length === 0 && <div className={styles.emptyCatalog}>Adicione a primeira etapa para definir o início da jornada.</div>}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
