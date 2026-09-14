
"use client";

import { useEffect, useMemo, useState } from "react";
import { openSubmissionReview, saveSubmissionReviewNotes, type SubmissionReview } from "@/lib/submission-review-api";

function renderContent(content: unknown) {
  if (content == null) return "—";
  if (typeof content === "string") return content;
  return JSON.stringify(content, null, 2);
}

export default function SubmissionReviewPanel({
  activityId,
  submissionIds,
  initialSubmissionId,
  onClose,
  onChanged,
}: {
  activityId: string;
  submissionIds: string[];
  initialSubmissionId: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [currentId, setCurrentId] = useState(initialSubmissionId);
  const [review, setReview] = useState<SubmissionReview | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const index = Math.max(0, submissionIds.indexOf(currentId));
  const previousId = index > 0 ? submissionIds[index - 1] : undefined;
  const nextId = index + 1 < submissionIds.length ? submissionIds[index + 1] : undefined;

  async function load(id: string) {
    setBusy(true); setError("");
    try {
      const next = await openSubmissionReview(activityId, id);
      setCurrentId(id); setReview(next); setNotes(next.teacherNotes ?? "");
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a entrega.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(initialSubmissionId); }, [activityId, initialSubmissionId]);

  const questionById = useMemo(() => new Map((review?.questions ?? []).map((q) => [q.id, q])), [review]);

  async function save(andNext = false) {
    if (!review) return;
    setBusy(true); setError("");
    try {
      const saved = await saveSubmissionReviewNotes(activityId, review.submissionId, notes);
      setReview(saved); setNotes(saved.teacherNotes ?? "");
      if (andNext && nextId) await load(nextId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho.");
    } finally { setBusy(false); }
  }

  if (!review) return <section className="classroom-settings-card"><p>{busy ? "Abrindo entrega..." : error || "Entrega indisponível."}</p><button className="button ghost" onClick={onClose}>Fechar</button></section>;

  return <section className="classroom-settings-card stack-lg">
    <div className="page-action-bar">
      <div><span className="eyebrow accent">CORREÇÃO INDIVIDUAL</span><h2>{review.displayName}</h2><p>{review.activityTitle} · tentativa {review.attemptNumber}</p></div>
      <div className="page-action-buttons"><button className="button ghost" disabled={!previousId || busy} onClick={() => previousId && void load(previousId)}>← Anterior</button><button className="button ghost" disabled={!nextId || busy} onClick={() => nextId && void load(nextId)}>Próximo →</button><button className="button" onClick={onClose}>Fechar</button></div>
    </div>
    {error && <div className="validation-box">{error}</div>}
    <div className="stack-lg">
      {review.items.map((item, i) => {
        const question = item.questionId ? questionById.get(item.questionId) : undefined;
        return <article className="question-preview-card" key={item.id}>
          <div className="question-order">{String(i + 1).padStart(2, "0")}</div>
          <div className="grow stack-sm">
            <div className="question-meta"><span>{item.kind}</span>{question && <span>{question.type}</span>}</div>
            {question && <><strong>{question.statement}</strong>{question.code && <pre>{question.code}</pre>}</>}
            <div><small>Entrega do aluno</small><pre>{renderContent(item.content)}</pre></div>
            {question?.expectedAnswer != null && <div><small>Resposta esperada / referência</small><pre>{renderContent(question.expectedAnswer)}</pre></div>}
            {question?.explanation && <div><small>Apoio ao professor</small><p>{question.explanation}</p></div>}
          </div>
        </article>;
      })}
      {!review.items.length && <div className="mini-empty">Esta entrega não possui itens persistidos.</div>}
    </div>
    <label className="field"><span>Anotações privadas da correção</span><textarea className="textarea" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Registre observações para continuar a correção. Ainda não é feedback publicado ao aluno." /></label>
    <div className="modal-footer"><button className="button ghost" disabled={busy} onClick={() => void save(false)}>{busy ? "Salvando..." : "Salvar rascunho"}</button><button className="button primary" disabled={busy || !nextId} onClick={() => void save(true)}>Salvar e revisar próxima</button></div>
  </section>;
}
