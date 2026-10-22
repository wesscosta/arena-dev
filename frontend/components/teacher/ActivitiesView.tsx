import { useMemo, useState } from "react";
import ActivityQuestionBuilder from "@/components/ActivityQuestionBuilder";
import ActivityStepEditor from "@/components/ActivityStepEditor";
import ActivitySubmissionDashboard from "@/components/ActivitySubmissionDashboard";
import ExternalResultImportModal from "@/components/ExternalResultImportModal";
import { type Notify } from "@/components/ui";
import { copyActivity as copyActivityApi, createActivity as createActivityApi, updateActivity as updateActivityApi, type ActivityUpsertInput } from "@/lib/activity-api";
import { fetchActivitySteps, replaceActivitySteps } from "@/lib/activity-step-api";
import { validateActivitySteps } from "@/lib/activity-steps";
import { createScoreEvents as createScoreEventsApi, type CreateScoreEventInput } from "@/lib/score-api";
import { errorMessage } from "./format";
import { Avatar, EmptyState, Metric, MiniEmpty, Modal, Panel } from "./ui";
import type { Activity, ActivityQuestion, ActivityStep, ArenaData, Student } from "@/lib/types";

export function ActivitiesView({ data, classroomId, classroomName, students, onUseInArena, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  classroomName: string;
  students: Student[];
  onUseInArena: (activityId: string) => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: Notify;
}) {
  type ActivityModal = "editor" | "delivery" | "import" | "external-results" | null;
  type EditorTab = "general" | "questions" | "flow";

  const [modal, setModal] = useState<ActivityModal>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [activityId, setActivityId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState(10);
  const [bonus, setBonus] = useState(5);
  const [resourceKind, setResourceKind] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [platform, setPlatform] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([]);
  const [stepsActivityId, setStepsActivityId] = useState<string | undefined>();
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsDirty, setStepsDirty] = useState(false);
  const [deliveryActivityId, setDeliveryActivityId] = useState<string | undefined>();
  const [dashboardActivityId, setDashboardActivityId] = useState<string | undefined>();
  const [externalResultActivityId, setExternalResultActivityId] = useState<string | undefined>();
  const [delivered, setDelivered] = useState<string[]>([]);
  const [onTime, setOnTime] = useState<string[]>([]);
  const [sourceClassroomId, setSourceClassroomId] = useState("");
  const [sourceActivityId, setSourceActivityId] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId).slice().sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [data.activities, classroomId],
  );
  const otherClassrooms = data.classrooms.filter((classroom) => classroom.id !== classroomId);
  const sourceActivities = data.activities.filter((activity) => activity.classroomId === sourceClassroomId);
  const deliveryActivity = classActivities.find((activity) => activity.id === deliveryActivityId);
  const dashboardActivity = classActivities.find((activity) => activity.id === dashboardActivityId);
  const externalResultActivity = classActivities.find((activity) => activity.id === externalResultActivityId);
  const activityEvents = data.scoreEvents.filter((event) => event.classroomId === classroomId && (event.source === "ACTIVITY" || event.category === "SUBMISSION"));
  const totalQuestions = classActivities.reduce((sum, activity) => sum + (activity.questions?.length ?? 0), 0);
  const activityXp = activityEvents.reduce((sum, event) => sum + event.points, 0);

  function draftInput(): ActivityUpsertInput {
    return {
      classroomId,
      title: title.trim(),
      topic: topic.trim() || undefined,
      points,
      onTimeBonus: bonus,
      resource: {
        kind: resourceKind,
        platform: resourceKind === "EXTERNAL" ? platform.trim() || undefined : undefined,
        url: resourceKind === "EXTERNAL" ? resourceUrl.trim() || undefined : undefined,
      },
      questions,
    };
  }

  function resetDraft() {
    setActivityId(undefined);
    setTitle("");
    setTopic("");
    setPoints(10);
    setBonus(5);
    setResourceKind("INTERNAL");
    setPlatform("");
    setResourceUrl("");
    setQuestions([]);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab("general");
  }

  function openNewActivity() {
    resetDraft();
    setModal("editor");
  }

  function openActivity(activity: Activity, tab: EditorTab = "general") {
    setActivityId(activity.id);
    setTitle(activity.title);
    setTopic(activity.topic ?? "");
    setPoints(activity.points);
    setBonus(activity.onTimeBonus);
    setResourceKind(activity.resource?.kind ?? "INTERNAL");
    setPlatform(activity.resource?.platform ?? "");
    setResourceUrl(activity.resource?.url ?? "");
    setQuestions(activity.questions ?? []);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab(tab);
    setModal("editor");
  }

  function validateDraft() {
    if (!title.trim()) {
      notify("Informe o título da atividade.");
      return false;
    }
    if (resourceKind === "EXTERNAL" && resourceUrl.trim()) {
      try {
        new URL(resourceUrl.trim());
      } catch {
        notify("Informe um link externo válido.", "error");
        return false;
      }
    }
    return true;
  }

  async function saveActivity(closeAfter = true): Promise<Activity | undefined> {
    if (!validateDraft() || activityBusy) return undefined;
    setActivityBusy(true);
    try {
      const existing = activityId ? data.activities.find((activity) => activity.id === activityId) : undefined;
      const saved = existing
        ? await updateActivityApi(existing.id, draftInput())
        : await createActivityApi(draftInput());
      patch((current) => ({
        ...current,
        activities: existing
          ? current.activities.map((item) => item.id === saved.id ? saved : item)
          : [...current.activities, saved],
      }));
      setActivityId(saved.id);
      setQuestions(saved.questions ?? []);
      notify(existing ? "Atividade atualizada no PostgreSQL." : "Atividade criada no PostgreSQL.");
      if (closeAfter) setModal(null);
      return saved;
    } catch (error) {
      notify(errorMessage(error), "error");
      return undefined;
    } finally {
      setActivityBusy(false);
    }
  }

  async function loadFlow(activityIdToLoad: string) {
    setStepsLoading(true);
    try {
      const steps = await fetchActivitySteps(activityIdToLoad);
      setActivitySteps(steps);
      setStepsActivityId(activityIdToLoad);
      setStepsDirty(false);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setStepsLoading(false);
    }
  }

  async function openFlowTab() {
    if (activityBusy || stepsLoading) return;

    const saved = await saveActivity(false);
    if (!saved) return;

    if (stepsActivityId !== saved.id) {
      await loadFlow(saved.id);
    }

    setEditorTab("flow");
  }

  async function saveFlow() {
    if (!activityId || activityBusy || stepsLoading) return;

    const errors = validateActivitySteps(activitySteps, questions);
    if (errors.length) {
      notify(errors[0], "error");
      return;
    }

    setActivityBusy(true);
    try {
      const saved = await replaceActivitySteps(activityId, activitySteps);
      setActivitySteps(saved);
      setStepsActivityId(activityId);
      setStepsDirty(false);
      notify("Roteiro ao Vivo salvo no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setActivityBusy(false);
    }
  }

  function openDelivery(activity: Activity) {
    setDeliveryActivityId(activity.id);
    setDelivered([]);
    setOnTime([]);
    setModal("delivery");
  }

  async function registerDelivery() {
    if (!deliveryActivity || !delivered.length) return;
    try {
      const inputs = delivered.flatMap((studentId) => {
        const rows: CreateScoreEventInput[] = [];
        if (deliveryActivity.points) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.points,
            category: "SUBMISSION" as const,
            description: `Entrega: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        if (onTime.includes(studentId) && deliveryActivity.onTimeBonus) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.onTimeBonus,
            category: "BONUS" as const,
            description: `Bônus no prazo: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        return rows;
      });
      if (!inputs.length) {
        notify("A atividade não possui XP configurado para registrar.");
        return;
      }
      const events = await createScoreEventsApi(inputs);
      patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
      setModal(null);
      notify(`XP persistido para ${delivered.length} aluno(s).`);
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  }


  function openExternalResults(activity: Activity) {
    setExternalResultActivityId(activity.id);
    setModal("external-results");
  }

  function handleExternalImported(events: ArenaData["scoreEvents"]) {
    if (!events.length) return;
    patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
  }

  function openImport() {
    const firstClassroom = otherClassrooms[0]?.id ?? "";
    setSourceClassroomId(firstClassroom);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === firstClassroom)?.id ?? "");
    setModal("import");
  }

  function changeSourceClassroom(nextClassroomId: string) {
    setSourceClassroomId(nextClassroomId);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === nextClassroomId)?.id ?? "");
  }

  async function importActivityCopy() {
    const source = data.activities.find((activity) => activity.id === sourceActivityId && activity.classroomId === sourceClassroomId);
    if (!source || activityBusy) {
      if (!source) notify("Selecione uma atividade de origem.");
      return;
    }
    setActivityBusy(true);
    try {
      const copy = await copyActivityApi(source.id, classroomId);
      patch((current) => ({ ...current, activities: [...current.activities, copy] }));
      setModal(null);
      notify(`Atividade "${source.title}" copiada para ${classroomName} no PostgreSQL.`);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setActivityBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-action-bar">
        <div>
          <span className="eyebrow accent">CONTEXTO DA TURMA</span>
          <h2>{classroomName}</h2>
          <p>Atividades, questões e XP desta página pertencem à turma selecionada no topo.</p>
        </div>
        <div className="page-action-buttons">
          <button className="button" onClick={openImport}>Importar atividade</button>
          <button className="button primary" onClick={openNewActivity}>+ Nova atividade</button>
        </div>
      </div>

      <div className="metrics-grid activity-metrics">
        <Metric label="Atividades" value={classActivities.length.toString()} hint="nesta turma" />
        <Metric label="Questões" value={totalQuestions.toString()} hint="conteúdo reutilizável na Arena" />
        <Metric label="XP de atividades" value={activityXp.toString()} hint="entregas e bônus registrados" />
        <Metric label="Integração" value="Arena" hint="atividades podem alimentar desafios" />
      </div>

      {dashboardActivity && (
        <ActivitySubmissionDashboard
          activityId={dashboardActivity.id}
          activityTitle={dashboardActivity.title}
          onClose={() => setDashboardActivityId(undefined)}
        />
      )}

      <Panel title="Atividades da turma" subtitle="Abra para editar, acompanhar entregas ou usar as questões diretamente na Arena">
        {classActivities.length ? (
          <div className="activity-catalog">
            {classActivities.map((activity) => {
              const submissionCount = new Set(activityEvents.filter((event) => event.activityId === activity.id && event.description.startsWith("Entrega:")).map((event) => event.studentId)).size;
              return (
                <article className="activity-catalog-card" key={activity.id}>
                  <div className="activity-card-head">
                    <div>
                      <div className="activity-card-kicker">{activity.resource?.kind === "EXTERNAL" ? activity.resource.platform || "Recurso externo" : "Atividade interna"}</div>
                      <h3>{activity.title}</h3>
                      <p>{activity.topic || "Sem tópico definido"}</p>
                    </div>
                    <div className="activity-xp"><strong>{activity.points} XP</strong><span>+{activity.onTimeBonus} prazo</span></div>
                  </div>
                  <div className="activity-card-stats">
                    <span>{activity.questions?.length ?? 0} questões</span>
                    <span>{submissionCount}/{students.length} entregaram</span>
                    {activity.copiedFromClassroomId && <span>Cópia reutilizada</span>}
                  </div>
                  {activity.resource?.kind === "EXTERNAL" && activity.resource.url && <a className="activity-resource-link" href={activity.resource.url} target="_blank" rel="noreferrer">Abrir recurso externo ↗</a>}
                  <div className="activity-card-actions">
                    <button className="button ghost" onClick={() => openActivity(activity)}>Abrir / editar</button>
                    <button className="button" onClick={() => setDashboardActivityId(activity.id)}>Entregas</button>
                    <button className="button" onClick={() => openDelivery(activity)}>Registrar XP manual</button>
                    {activity.resource?.kind === "EXTERNAL" && <button className="button" onClick={() => openExternalResults(activity)}>Importar resultados</button>}
                    <button className="button primary" disabled={!(activity.questions?.length)} onClick={() => onUseInArena(activity.id)}>Usar na Arena</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nenhuma atividade nesta turma" text="Crie uma atividade do zero ou importe uma cópia de outra turma. Questões podem ser reutilizadas depois na Arena." actionLabel="Criar atividade" onAction={openNewActivity} />
        )}
      </Panel>

      <Modal open={modal === "editor"} title={activityId ? "Editar atividade" : "Nova atividade"} subtitle={`Turma: ${classroomName}`} size="large" onClose={() => setModal(null)}>
        <div className="modal-tabs">
          <button className={editorTab === "general" ? "active" : ""} onClick={() => setEditorTab("general")}>Geral e XP</button>
          <button className={editorTab === "questions" ? "active" : ""} onClick={() => setEditorTab("questions")}>Questões <span>{questions.length}</span></button>
          <button
            className={editorTab === "flow" ? "active" : ""}
            disabled={activityBusy || stepsLoading}
            onClick={() => { void openFlowTab(); }}
          >
            Roteiro
            {stepsActivityId === activityId && <span>{activitySteps.length}</span>}
          </button>
        </div>
        {editorTab === "general" ? (
          <div className="modal-section-stack">
            <div className="context-lock"><span>Turma</span><strong>{classroomName}</strong><small>A atividade será salva somente neste contexto.</small></div>
            <div className="form-grid">
              <label className="field-label">Título</label>
              <input className="input" placeholder="Ex.: Atividade 07 — Funções" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="form-two">
                <label>Tema / tópico<input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Estruturas de repetição" /></label>
                <label>Tipo<select className="select full" value={resourceKind} onChange={(e) => setResourceKind(e.target.value as "INTERNAL" | "EXTERNAL")}><option value="INTERNAL">Atividade interna</option><option value="EXTERNAL">Atividade / recurso externo</option></select></label>
              </div>
              {resourceKind === "EXTERNAL" && <div className="form-two"><label>Plataforma<input className="input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Wayground, Forms, Kahoot..." /></label><label>Link<input className="input" type="url" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." /></label></div>}
              <div className="form-two"><label>XP da entrega<input className="input" type="number" min="0" value={points} onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))} /></label><label>Bônus no prazo<input className="input" type="number" min="0" value={bonus} onChange={(e) => setBonus(Math.max(0, Number(e.target.value) || 0))} /></label></div>
            </div>
            <div className="activity-summary-line"><span>{questions.length} questão(ões) vinculadas</span><button className="text-button" onClick={() => setEditorTab("questions")}>Gerenciar questões →</button></div>
          </div>
        ) : editorTab === "questions" ? (
          <ActivityQuestionBuilder questions={questions} setQuestions={setQuestions} defaultTheme={topic || title} notify={notify} />
        ) : stepsLoading ? (
          <div className="loading-screen compact">Carregando roteiro...</div>
        ) : (
          <ActivityStepEditor
            steps={activitySteps}
            questions={questions}
            disabled={activityBusy}
            onChange={(steps) => {
              setActivitySteps(steps);
              setStepsDirty(true);
            }}
          />
        )}
        <div className="modal-footer">
          <button className="button ghost" onClick={() => setModal(null)}>
            {editorTab === "flow" && stepsDirty ? "Fechar sem salvar" : "Cancelar"}
          </button>
          {editorTab === "flow" ? (
            <button
              className="button primary"
              disabled={!activityId || activityBusy || stepsLoading || !stepsDirty}
              onClick={() => { void saveFlow(); }}
            >
              {activityBusy ? "Salvando..." : stepsDirty ? "Salvar roteiro" : "Roteiro salvo"}
            </button>
          ) : (
            <button
              className="button primary"
              disabled={activityBusy}
              onClick={() => {
                if (!title.trim()) {
                  setEditorTab("general");
                  notify("As questões já estão no rascunho. Informe o título da atividade para salvar.");
                  return;
                }
                void saveActivity(true);
              }}
            >
              {activityBusy ? "Salvando..." : title.trim() ? "Salvar atividade" : "Definir título e salvar"}
            </button>
          )}
        </div>
      </Modal>

      <Modal open={modal === "delivery"} title="Registrar entrega / participação" subtitle={deliveryActivity?.title} size="medium" onClose={() => setModal(null)}>
        {deliveryActivity && <>
          <div className="delivery-summary"><div><span>XP da entrega</span><strong>+{deliveryActivity.points}</strong></div><div><span>Bônus no prazo</span><strong>+{deliveryActivity.onTimeBonus}</strong></div><div><span>Selecionados</span><strong>{delivered.length}</strong></div></div>
          <div className="delivery-list modal-delivery-list">
            {students.map((student) => (
              <div className="delivery-row" key={student.id}>
                <label><input type="checkbox" checked={delivered.includes(student.id)} onChange={(e) => { setDelivered((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)); if (!e.target.checked) setOnTime((current) => current.filter((id) => id !== student.id)); }} /><Avatar student={student} /><span>{student.name}</span></label>
                <label className="on-time"><input type="checkbox" disabled={!delivered.includes(student.id)} checked={onTime.includes(student.id)} onChange={(e) => setOnTime((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />No prazo</label>
              </div>
            ))}
          </div>
          <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!delivered.length} onClick={() => { void registerDelivery(); }}>Registrar e aplicar XP</button></div>
        </>}
      </Modal>

      <ExternalResultImportModal
        open={modal === "external-results"}
        activity={externalResultActivity}
        students={students}
        onClose={() => setModal(null)}
        onImported={handleExternalImported}
        notify={notify}
      />

      <Modal open={modal === "import"} title="Importar atividade de outra turma" subtitle={`Destino: ${classroomName}`} size="medium" onClose={() => setModal(null)}>
        {otherClassrooms.length ? (
          <div className="modal-section-stack">
            <div className="form-grid">
              <label className="field-label">Turma de origem</label>
              <select className="select full" value={sourceClassroomId} onChange={(e) => changeSourceClassroom(e.target.value)}>{otherClassrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
              <label className="field-label">Atividade</label>
              <select className="select full" value={sourceActivityId} onChange={(e) => setSourceActivityId(e.target.value)}><option value="">Selecione</option>{sourceActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}</select>
            </div>
            <div className="copy-policy"><strong>Será criada uma cópia independente.</strong><p>Conteúdo, questões, roteiro, XP e recurso externo são copiados. Entregas, alunos, resultados, ScoreEvents e histórico não são copiados.</p></div>
            <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!sourceActivityId || activityBusy} onClick={() => { void importActivityCopy(); }}>Importar cópia</button></div>
          </div>
        ) : <MiniEmpty text="Crie uma segunda turma para reutilizar atividades entre contextos. Em uma evolução futura, modelos também poderão vir de uma biblioteca." />}
      </Modal>
    </div>
  );
}
