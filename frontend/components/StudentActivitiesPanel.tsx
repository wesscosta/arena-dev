"use client";

import { secureId } from "@/lib/secure-id";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudentJoinAccess } from "@/lib/realtime-api";
import {
  fetchParticipantActivities,
  saveParticipantSubmissionItem,
  startParticipantActivity,
  submitParticipantActivity,
  recordParticipantPaste,
  type ParticipantActivity,
  type ParticipantQuestion,
  type ParticipantSubmissionKind,
} from "@/lib/participant-submission-api";
import styles from "./StudentActivitiesPanel.module.css";
import ParticipantDeadlineTimer from "./ParticipantDeadlineTimer";
import { DialogCloseButton } from "@/components/ui";
import StudentAccessibilityControls from "@/components/student/StudentAccessibilityControls";
import { persistChangedQuestionDrafts } from "@/lib/submission-drafts";

function contentValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object" && "value" in (value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>).value;
    return nested == null ? "" : String(nested);
  }
  return JSON.stringify(value);
}

function optionsOf(question: ParticipantQuestion): Array<{ id: string; text: string }> {
  if (!Array.isArray(question.options)) return [];
  return question.options
    .map((item) => item as { id?: unknown; text?: unknown; label?: unknown })
    .filter((item) => item.id != null)
    .map((item) => ({ id: String(item.id), text: String(item.text ?? item.label ?? item.id) }));
}

function existingValue(activity: ParticipantActivity, questionId: string) {
  return contentValue(activity.items.find((item) => item.questionId === questionId)?.content);
}

function genericItem(activity: ParticipantActivity) {
  return activity.items.find((item) => item.questionId == null);
}

function statusLabel(status: ParticipantActivity["submissionStatus"]) {
  return ({
    NOT_STARTED: "Não iniciada",
    IN_PROGRESS: "Em andamento",
    SUBMITTED: "Entregue",
    UNDER_REVIEW: "Em correção",
    GRADED: "Corrigida",
    RETURNED: "Devolvida",
  } as const)[status];
}

export default function StudentActivitiesPanel({ access, disabled }: { access: StudentJoinAccess; disabled?: boolean }) {
  const [activities, setActivities] = useState<ParticipantActivity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [genericKind, setGenericKind] = useState<ParticipantSubmissionKind>("TEXT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [questionIndex, setQuestionIndex] = useState(0);
  const activeActivityRef = useRef<ParticipantActivity | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const itemIdsRef = useRef(new Map<string, string>());

  async function load() {
    setBusy(true); setError("");
    try { setActivities(await fetchParticipantActivities(access.code, access.token)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar as atividades."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [access.code, access.token]);

  const refreshAfterDeadline = useCallback(async () => {
    try {
      const loaded = await fetchParticipantActivities(access.code, access.token);
      setActivities(loaded);
      const id = activeActivityRef.current?.id;
      const updated = loaded.find((activity) => activity.id === id);
      if (updated) {
        activeActivityRef.current = updated;
        if (updated.deadlineAt && updated.submissionStatus !== "IN_PROGRESS") {
          const restored: Record<string, string> = {};
          for (const question of updated.questions) restored["q:" + question.id] = existingValue(updated, question.id);
          restored.generic = contentValue(genericItem(updated)?.content);
          setDrafts(restored);
          setSaveState("saved");
          setError("Tempo encerrado. A tentativa foi finalizada com as respostas que o servidor havia salvado até o prazo. Rascunhos não salvos não foram enviados.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o status do prazo.");
    }
  }, [access.code, access.token]);
  const onDeadlineExpired = useCallback(() => { void refreshAfterDeadline(); }, [refreshAfterDeadline]);

  const open = useMemo(() => activities.find((activity) => activity.id === openId) ?? null, [activities, openId]);

  function replaceActivity(next: ParticipantActivity) {
    if (activeActivityRef.current?.id === next.id) activeActivityRef.current = next;
    setActivities((current) => current.map((activity) => activity.id === next.id ? next : activity));
  }

  async function ensureStarted(activity: ParticipantActivity) {
    if (activity.submissionId) return activity;
    const next = await startParticipantActivity(access.code, access.token, activity.id);
    replaceActivity(next);
    return next;
  }

  async function openActivity(activity: ParticipantActivity) {
    if (disabled) return;
    setBusy(true); setError("");
    try {
      const next = await ensureStarted(activity);
      const restored: Record<string, string> = {};
      for (const question of next.questions) restored[`q:${question.id}`] = existingValue(next, question.id);
      const generic = genericItem(next);
      restored.generic = contentValue(generic?.content);
      if (generic) setGenericKind(generic.kind);
      setDrafts(restored);
      activeActivityRef.current = next;
      itemIdsRef.current = new Map();
      saveQueueRef.current = Promise.resolve();
      setQuestionIndex(0);
      setSaveState("idle");
      setSavedAt("");
      setOpenId(next.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a atividade.");
    } finally { setBusy(false); }
  }

  async function saveQuestion(question: ParticipantQuestion, value: string): Promise<void> {
    const activity = activeActivityRef.current;
    if (!activity?.submissionId || activity.submissionStatus !== "IN_PROGRESS") {
      throw new Error("Esta atividade não aceita alterações.");
    }
    setSaveState("saving"); setError("");
    const key = "question:" + question.id;
    let itemId = activity.items.find((item) => item.questionId === question.id)?.id ?? itemIdsRef.current.get(key);
    if (!itemId) {
      itemId = secureId();
      itemIdsRef.current.set(key, itemId);
    }
    try {
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, activity.id, activity.submissionId,
        itemId,
        { kind: "QUESTION_RESPONSE", questionId: question.id, position: question.position, content: { value } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setSaveState("saved");
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : "Falha ao salvar sua resposta.");
      throw caught;
    }
  }

  async function saveGeneric(): Promise<void> {
    const activity = activeActivityRef.current;
    if (!activity?.submissionId || activity.submissionStatus !== "IN_PROGRESS") {
      throw new Error("Esta atividade não aceita alterações.");
    }
    const existing = genericItem(activity);
    let itemId = existing?.id ?? itemIdsRef.current.get("generic");
    if (!itemId) {
      itemId = secureId();
      itemIdsRef.current.set("generic", itemId);
    }
    try {
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, activity.id, activity.submissionId,
        itemId,
        { kind: genericKind, position: 1000, content: { value: drafts.generic ?? "" } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : "Falha ao salvar sua entrega complementar.");
      throw caught;
    }
  }

  function queueQuestionSave(question: ParticipantQuestion, value: string): Promise<void> {
    // Serialize writes to one attempt; a late response must never overwrite a newer answer.
    const pending = saveQueueRef.current.catch(() => undefined).then(() => saveQuestion(question, value));
    saveQueueRef.current = pending;
    return pending;
  }

  function registerPaste(itemId: string | null, characterCount: number) {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS" || characterCount <= 0) return;
    void recordParticipantPaste(
      access.code,
      access.token,
      open.id,
      open.submissionId,
      itemId,
      characterCount,
    ).catch(() => undefined);
  }

  async function persistCurrentQuestion() {
    const activity = activeActivityRef.current;
    if (!activity || activity.submissionStatus !== "IN_PROGRESS") return;
    // An earlier autosave error can be retried from the unsaved draft below.
    await saveQueueRef.current.catch(() => undefined);
    const question = activity.questions[questionIndex];
    if (!question) return;
    await persistChangedQuestionDrafts(
      [question], drafts,
      (id) => existingValue(activeActivityRef.current ?? activity, id),
      saveQuestion,
    );
  }

  async function closeActivity() {
    if (busy) return;
    setBusy(true);
    try {
      await persistCurrentQuestion();
      setOpenId(null);
      activeActivityRef.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar antes de fechar.");
    } finally {
      setBusy(false);
    }
  }

  async function goToQuestion(nextIndex: number) {
    if (!open || busy || nextIndex < 0 || nextIndex >= open.questions.length) return;
    setBusy(true);
    try {
      await persistCurrentQuestion();
      setQuestionIndex(nextIndex);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salve sua resposta antes de avançar.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS" || busy) return;
    if (!window.confirm("Enviar esta atividade? Depois do envio, esta tentativa deixa de aceitar alterações.")) return;
    setBusy(true); setError("");
    try {
      // Reconcile every draft with the last server response, including a failed option save.
      await saveQueueRef.current.catch(() => undefined);
      await persistChangedQuestionDrafts(
        open.questions, drafts,
        (id) => existingValue(activeActivityRef.current ?? open, id),
        saveQuestion,
      );
      const activity = activeActivityRef.current ?? open;
      if ((drafts.generic ?? "") !== contentValue(genericItem(activity)?.content)) await saveGeneric();
      const next = await submitParticipantActivity(access.code, access.token, open.id, open.submissionId);
      replaceActivity(next);
      setSaveState("saved");
    } catch (caught) {
      // Do not submit when even one pending write failed.
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar todas as respostas. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const question = open?.questions[questionIndex] ?? null;
  const questionKey = question ? "q:" + question.id : "";
  const options = question ? optionsOf(question) : [];
  const editable = open?.submissionStatus === "IN_PROGRESS";
  const total = open?.questions.length ?? 0;
  const isLast = questionIndex === total - 1;

  return <section className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.kicker}>MINHAS ATIVIDADES</span><h2>Entregas da turma</h2><p>Abra, continue e envie atividades sem sair da experiência do aluno.</p></div>
      <button type="button" className={styles.refresh} disabled={busy} onClick={() => void load()}>{busy ? "Atualizando..." : "↻ Atualizar"}</button>
    </header>

    {error && <div className={styles.error} role="alert">{error}</div>}

    <div className={styles.list}>
      {activities.map((activity) => <article className={styles.card} key={activity.id}>
        <div className={styles.cardHead}>
          <div><h3>{activity.title}</h3><div className={styles.meta}><span>{activity.topic || "Atividade"}</span><span>{activity.points} XP previsto</span><span>{activity.questions.length} questão(ões)</span>{activity.timeLimitMinutes != null && <span>{activity.timeLimitMinutes} min após iniciar</span>}</div></div>
          <span className={styles.status}>{statusLabel(activity.submissionStatus)}</span>
        </div>
        <button type="button" className={`${styles.action} ${activity.submissionStatus === "NOT_STARTED" ? styles.primary : ""}`} disabled={disabled || busy} onClick={() => void openActivity(activity)}>
          {activity.submissionStatus === "NOT_STARTED" ? "Iniciar atividade" : activity.submissionStatus === "IN_PROGRESS" ? "Continuar atividade" : "Visualizar entrega"}
        </button>

        {open?.id === activity.id && <div className={styles.runner} role="dialog" aria-modal="true" aria-label={`Atividade ${open.title}`}>
            <header className={styles.runnerTop}>
              <div className={styles.runnerBrand}><span>A</span><div><strong>ARENA DEV</strong><small>{access.classroomName}</small></div></div>
              <div className={styles.runnerTitle}><span>ATIVIDADE</span><strong>{open.title}</strong></div>
              <div className={styles.runnerActions}>
                <details className={styles.runnerAccessibility}><summary>Acessibilidade</summary><div className={styles.runnerAccessibilityPanel}><StudentAccessibilityControls compact /></div></details>
                <DialogCloseButton className={styles.runnerClose} onClick={() => void closeActivity()} label="Fechar atividade" />
              </div>
            </header>

            <main className={styles.runnerMain}>
              <div className={styles.runnerProgress}>
                <div><strong>{questionIndex + 1}</strong><span>/ {total}</span></div>
                <div className={styles.runnerTrack}><span style={{ width: `${total ? ((questionIndex + 1) / total) * 100 : 0}%` }} /></div>
                {open.deadlineAt && open.serverNow && open.submissionStatus === "IN_PROGRESS"
                  ? <ParticipantDeadlineTimer deadlineAt={open.deadlineAt} serverNow={open.serverNow} onExpire={onDeadlineExpired} />
                  : open.deadlineAt && open.submittedAt && <small>Prazo finalizado</small>}
                <small className={styles.saveState} role="status" aria-live="polite">{!editable ? statusLabel(open.submissionStatus) : saveState === "saving" ? "Salvando…" : saveState === "error" ? "Falha ao salvar" : saveState === "saved" ? `✓ Salvo${savedAt ? ` às ${savedAt}` : ""}` : "✓ Autosave ativo"}</small>
              </div>

              {error && <div className={styles.runnerError} role="alert">{error} Sua atividade permanece aberta para tentar novamente.</div>}
              {question ? <section className={styles.runnerQuestion}>
                <div className={styles.questionLabel}>QUESTÃO {String(questionIndex + 1).padStart(2, "0")}</div>
                <p className={styles.runnerStatement}>{question.statement}</p>
                {question.code && <figure className={styles.runnerCodeBlock}>{question.language && <figcaption>{question.language}</figcaption>}<pre className={styles.runnerCode}><code data-language={question.language || undefined}>{question.code}</code></pre></figure>}
                {options.length ? <div className={styles.runnerOptions} role="radiogroup" aria-label={`Alternativas da questão ${String(questionIndex + 1).padStart(2, "0")}`}>{options.map((option, index) => <label className={`${styles.runnerOption} ${(drafts[questionKey] ?? "") === option.id ? styles.selectedOption : ""}`} key={option.id}><input type="radio" name={questionKey} value={option.id} checked={(drafts[questionKey] ?? "") === option.id} disabled={!editable || busy} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [questionKey]: value })); void queueQuestionSave(question, value).catch(() => undefined); }} /><b>{String.fromCharCode(65 + index)}</b><span>{option.text}</span></label>)}</div> : <label className={styles.runnerField}><span>Sua resposta</span><textarea value={drafts[questionKey] ?? ""} disabled={!editable || busy} onChange={(event) => setDrafts((current) => ({ ...current, [questionKey]: event.target.value }))} onBlur={() => {
                  if (question && (drafts[questionKey] ?? "") !== existingValue(activeActivityRef.current ?? open, question.id)) {
                    void queueQuestionSave(question, drafts[questionKey] ?? "").catch(() => undefined);
                  }
                }} onPaste={(event) => registerPaste(open.items.find((item) => item.questionId === question.id)?.id ?? null, event.clipboardData.getData("text").length)} placeholder="Digite sua resposta..." /></label>}
              </section> : <div className={styles.empty}>Esta atividade não possui questões objetivas. Use a entrega complementar quando solicitada.</div>}
            </main>

            <footer className={styles.runnerFooter}>
              <button type="button" className={styles.runnerSecondary} disabled={busy || questionIndex === 0} onClick={() => void goToQuestion(questionIndex - 1)}>← Anterior</button>
              <span aria-hidden="true" />
              {!isLast ? <button type="button" className={styles.runnerPrimary} disabled={busy} onClick={() => void goToQuestion(questionIndex + 1)}>Próxima →</button> : editable ? <button type="button" className={styles.runnerPrimary} disabled={busy} onClick={() => void submit()}>{busy ? "Salvando..." : "Revisar e enviar"}</button> : <button type="button" className={styles.runnerPrimary} onClick={() => setOpenId(null)}>Concluir</button>}
            </footer>
          </div>}

      </article>)}
      {!activities.length && !busy && <div className={styles.empty}>Nenhuma atividade disponível nesta turma.</div>}
    </div>
  </section>;
}
