"use client";

import { secureId } from "@/lib/secure-id";

import { useEffect, useMemo, useState } from "react";
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
import { DialogCloseButton } from "@/components/ui";

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

  async function load() {
    setBusy(true); setError("");
    try { setActivities(await fetchParticipantActivities(access.code, access.token)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar as atividades."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [access.code, access.token]);

  const open = useMemo(() => activities.find((activity) => activity.id === openId) ?? null, [activities, openId]);

  function replaceActivity(next: ParticipantActivity) {
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
      setQuestionIndex(0);
      setSaveState("idle");
      setSavedAt("");
      setOpenId(next.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a atividade.");
    } finally { setBusy(false); }
  }

  async function saveQuestion(question: ParticipantQuestion, value: string) {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS") return;
    setBusy(true); setError(""); setSaveState("saving");
    try {
      const existing = open.items.find((item) => item.questionId === question.id);
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, open.id, open.submissionId,
        existing?.id ?? secureId(),
        { kind: "QUESTION_RESPONSE", questionId: question.id, position: question.position, content: { value } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setSaveState("saved");
    } catch (caught) { setSaveState("error"); setError(caught instanceof Error ? caught.message : "Falha no autosave."); }
    finally { setBusy(false); }
  }

  async function saveGeneric() {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS") return;
    setBusy(true); setError("");
    try {
      const existing = genericItem(open);
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, open.id, open.submissionId,
        existing?.id ?? secureId(),
        { kind: genericKind, position: 1000, content: { value: drafts.generic ?? "" } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha no autosave."); }
    finally { setBusy(false); }
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
    if (!open || open.submissionStatus !== "IN_PROGRESS") return;
    const question = open.questions[questionIndex];
    if (!question || optionsOf(question).length) return;
    await saveQuestion(question, drafts[`q:${question.id}`] ?? "");
  }

  async function goToQuestion(nextIndex: number) {
    if (!open || busy || nextIndex < 0 || nextIndex >= open.questions.length) return;
    await persistCurrentQuestion();
    setQuestionIndex(nextIndex);
  }

  async function submit() {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS") return;
    if (!window.confirm("Enviar esta atividade? Depois do envio, esta tentativa deixa de aceitar alterações.")) return;
    setBusy(true); setError("");
    try {
      if ((drafts.generic ?? "").trim()) await saveGeneric();
      const next = await submitParticipantActivity(access.code, access.token, open.id, open.submissionId);
      replaceActivity(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível enviar a atividade."); }
    finally { setBusy(false); }
  }

  return <section className={styles.shell}>
    <header className={styles.head}>
      <div><span className={styles.kicker}>MINHAS ATIVIDADES</span><h2>Entregas da turma</h2><p>Abra, continue e envie atividades sem sair da experiência do aluno.</p></div>
      <button type="button" className={styles.refresh} disabled={busy} onClick={() => void load()}>{busy ? "Atualizando..." : "↻ Atualizar"}</button>
    </header>

    {error && <div className={styles.error} role="alert">{error}</div>}

    <div className={styles.list}>
      {activities.map((activity) => <article className={styles.card} key={activity.id}>
        <div className={styles.cardHead}>
          <div><h3>{activity.title}</h3><div className={styles.meta}><span>{activity.topic || "Atividade"}</span><span>{activity.points} XP previsto</span><span>{activity.questions.length} questão(ões)</span></div></div>
          <span className={styles.status}>{statusLabel(activity.submissionStatus)}</span>
        </div>
        <button type="button" className={`${styles.action} ${activity.submissionStatus === "NOT_STARTED" ? styles.primary : ""}`} disabled={disabled || busy} onClick={() => void openActivity(activity)}>
          {activity.submissionStatus === "NOT_STARTED" ? "Iniciar atividade" : activity.submissionStatus === "IN_PROGRESS" ? "Continuar atividade" : "Visualizar entrega"}
        </button>

        {open?.id === activity.id && (() => {
          const question = open.questions[questionIndex] ?? null;
          const key = question ? `q:${question.id}` : "";
          const options = question ? optionsOf(question) : [];
          const editable = open.submissionStatus === "IN_PROGRESS";
          const total = open.questions.length;
          const isLast = questionIndex === total - 1;
          return <div className={styles.runner} role="dialog" aria-modal="true" aria-label={`Atividade ${open.title}`}>
            <header className={styles.runnerTop}>
              <div className={styles.runnerBrand}><span>A</span><div><strong>ARENA DEV</strong><small>{access.classroomName}</small></div></div>
              <div className={styles.runnerTitle}><span>ATIVIDADE</span><strong>{open.title}</strong></div>
              <DialogCloseButton className={styles.runnerClose} onClick={() => setOpenId(null)} label="Fechar atividade" />
            </header>

            <main className={styles.runnerMain}>
              <div className={styles.runnerProgress}>
                <div><strong>{questionIndex + 1}</strong><span>/ {total}</span></div>
                <div className={styles.runnerTrack}><span style={{ width: `${total ? ((questionIndex + 1) / total) * 100 : 0}%` }} /></div>
                <small className={styles.saveState} role="status" aria-live="polite">{!editable ? statusLabel(open.submissionStatus) : saveState === "saving" ? "Salvando…" : saveState === "error" ? "Falha ao salvar" : saveState === "saved" ? `✓ Salvo${savedAt ? ` às ${savedAt}` : ""}` : "✓ Autosave ativo"}</small>
              </div>

              {question ? <section className={styles.runnerQuestion}>
                <div className={styles.questionLabel}>QUESTÃO {String(questionIndex + 1).padStart(2, "0")}</div>
                <p className={styles.runnerStatement}>{question.statement}</p>
                {question.code && <figure className={styles.runnerCodeBlock}>{question.language && <figcaption>{question.language}</figcaption>}<pre className={styles.runnerCode}><code data-language={question.language || undefined}>{question.code}</code></pre></figure>}
                {options.length ? <div className={styles.runnerOptions} role="radiogroup" aria-label={`Alternativas da questão ${String(questionIndex + 1).padStart(2, "0")}`}>{options.map((option, index) => <label className={`${styles.runnerOption} ${(drafts[key] ?? "") === option.id ? styles.selectedOption : ""}`} key={option.id}><input type="radio" name={key} value={option.id} checked={(drafts[key] ?? "") === option.id} disabled={!editable || busy} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [key]: value })); void saveQuestion(question, value); }} /><b>{String.fromCharCode(65 + index)}</b><span>{option.text}</span></label>)}</div> : <label className={styles.runnerField}><span>Sua resposta</span><textarea value={drafts[key] ?? ""} disabled={!editable || busy} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} onPaste={(event) => registerPaste(open.items.find((item) => item.questionId === question.id)?.id ?? null, event.clipboardData.getData("text").length)} placeholder="Digite sua resposta..." /></label>}
              </section> : <div className={styles.empty}>Esta atividade não possui questões objetivas. Use a entrega complementar quando solicitada.</div>}
            </main>

            <footer className={styles.runnerFooter}>
              <button type="button" className={styles.runnerSecondary} disabled={busy || questionIndex === 0} onClick={() => void goToQuestion(questionIndex - 1)}>← Anterior</button>
              <span aria-hidden="true" />
              {!isLast ? <button type="button" className={styles.runnerPrimary} disabled={busy} onClick={() => void goToQuestion(questionIndex + 1)}>Próxima →</button> : editable ? <button type="button" className={styles.runnerPrimary} disabled={busy} onClick={async () => { await persistCurrentQuestion(); void submit(); }}>{busy ? "Salvando..." : "Revisar e enviar"}</button> : <button type="button" className={styles.runnerPrimary} onClick={() => setOpenId(null)}>Concluir</button>}
            </footer>
          </div>;
        })()}

      </article>)}
      {!activities.length && !busy && <div className={styles.empty}>Nenhuma atividade disponível nesta turma.</div>}
    </div>
  </section>;
}
