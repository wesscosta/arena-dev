"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentJoinAccess } from "@/lib/realtime-api";
import {
  fetchParticipantActivities,
  saveParticipantSubmissionItem,
  startParticipantActivity,
  submitParticipantActivity,
  type ParticipantActivity,
  type ParticipantQuestion,
  type ParticipantSubmissionKind,
} from "@/lib/participant-submission-api";
import styles from "./StudentActivitiesPanel.module.css";

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
      setOpenId(next.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a atividade.");
    } finally { setBusy(false); }
  }

  async function saveQuestion(question: ParticipantQuestion, value: string) {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS") return;
    setBusy(true); setError("");
    try {
      const existing = open.items.find((item) => item.questionId === question.id);
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, open.id, open.submissionId,
        existing?.id ?? crypto.randomUUID(),
        { kind: "QUESTION_RESPONSE", questionId: question.id, position: question.position, content: { value } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha no autosave."); }
    finally { setBusy(false); }
  }

  async function saveGeneric() {
    if (!open?.submissionId || open.submissionStatus !== "IN_PROGRESS") return;
    setBusy(true); setError("");
    try {
      const existing = genericItem(open);
      const next = await saveParticipantSubmissionItem(
        access.code, access.token, open.id, open.submissionId,
        existing?.id ?? crypto.randomUUID(),
        { kind: genericKind, position: 1000, content: { value: drafts.generic ?? "" } },
      );
      replaceActivity(next);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha no autosave."); }
    finally { setBusy(false); }
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
      <button type="button" className={styles.refresh} disabled={busy} onClick={() => void load()}>{busy ? "Atualizando..." : "Atualizar"}</button>
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

        {open?.id === activity.id && <div className={styles.detail}>
          {open.questions.map((question) => {
            const key = `q:${question.id}`;
            const options = optionsOf(question);
            const editable = open.submissionStatus === "IN_PROGRESS";
            return <div className={styles.question} key={question.id}>
              <strong>{question.position + 1}. {question.statement}</strong>
              {question.code && <pre className={styles.code}><code>{question.code}</code></pre>}
              {options.length ? <div className={styles.options}>{options.map((option) => <label className={styles.option} key={option.id}><input type="radio" name={key} value={option.id} checked={(drafts[key] ?? "") === option.id} disabled={!editable || busy} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [key]: value })); void saveQuestion(question, value); }} /><span>{option.text}</span></label>)}</div> : <label className={styles.field}><span>Sua resposta</span><textarea className={styles.textarea} value={drafts[key] ?? ""} disabled={!editable || busy} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} onBlur={() => void saveQuestion(question, drafts[key] ?? "")} /></label>}
            </div>;
          })}

          <div className={styles.question}>
            <strong>Entrega complementar</strong>
            <div className={styles.meta}><span>Use quando a atividade pedir pesquisa, texto, link ou código além das questões.</span></div>
            <label className={styles.field}><span>Tipo de conteúdo</span><select className={styles.select} value={genericKind} disabled={open.submissionStatus !== "IN_PROGRESS" || busy} onChange={(event) => setGenericKind(event.target.value as ParticipantSubmissionKind)}><option value="TEXT">Texto / pesquisa</option><option value="CODE">Código</option><option value="LINK">Link</option><option value="ARTIFACT">Referência de artefato</option></select></label>
            <label className={styles.field}><span>Conteúdo</span><textarea className={styles.textarea} value={drafts.generic ?? ""} disabled={open.submissionStatus !== "IN_PROGRESS" || busy} onChange={(event) => setDrafts((current) => ({ ...current, generic: event.target.value }))} onBlur={() => void saveGeneric()} placeholder={genericKind === "CODE" ? "Cole seu código ou descreva o repositório..." : genericKind === "LINK" ? "https://..." : "Digite ou descreva sua entrega..."} /></label>
          </div>

          <div className={styles.foot}>
            <span className={styles.saved}>{savedAt ? `Salvo às ${savedAt}` : open.submissionStatus === "IN_PROGRESS" ? "As respostas são salvas ao sair de cada campo." : `Status: ${statusLabel(open.submissionStatus)}`}</span>
            {open.submissionStatus === "IN_PROGRESS" && <button type="button" className={`${styles.action} ${styles.primary}`} disabled={busy} onClick={() => void submit()}>{busy ? "Salvando..." : "Enviar atividade"}</button>}
          </div>
        </div>}
      </article>)}
      {!activities.length && !busy && <div className={styles.empty}>Nenhuma atividade disponível nesta turma.</div>}
    </div>
  </section>;
}
