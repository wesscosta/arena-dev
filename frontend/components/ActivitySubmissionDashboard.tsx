
"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSubmissionDashboard, type SubmissionDashboard, type SubmissionDashboardStatus } from "@/lib/submission-dashboard-api";
import SubmissionReviewPanel from "@/components/SubmissionReviewPanel";
import BatchAssessmentToolbar from "@/components/BatchAssessmentToolbar";
import IntegrationReadinessPanel from "@/components/IntegrationReadinessPanel";
import styles from "./ActivitySubmissionDashboard.module.css";

type Filter = "ALL" | SubmissionDashboardStatus;
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "ALL", label: "Todos" }, { id: "NOT_STARTED", label: "Pendentes" },
  { id: "IN_PROGRESS", label: "Em andamento" }, { id: "SUBMITTED", label: "Entregues" },
  { id: "UNDER_REVIEW", label: "Em correção" }, { id: "GRADED", label: "Corrigidos" },
  { id: "RETURNED", label: "Devolvidos" },
];
const STATUS_LABEL: Record<SubmissionDashboardStatus, string> = {
  NOT_STARTED: "Não iniciou", IN_PROGRESS: "Em andamento", SUBMITTED: "Entregue",
  UNDER_REVIEW: "Em correção", GRADED: "Corrigido", RETURNED: "Devolvido",
};

function statusClass(status: SubmissionDashboardStatus) {
  if (status === "NOT_STARTED") return styles.notStarted;
  if (status === "IN_PROGRESS") return styles.inProgress;
  if (status === "SUBMITTED") return styles.submitted;
  if (status === "UNDER_REVIEW") return styles.underReview;
  if (status === "GRADED") return styles.graded;
  return styles.returned;
}
function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function ActivitySubmissionDashboard({ activityId, activityTitle, onClose }: { activityId: string; activityTitle: string; onClose: () => void }) {
  const [dashboard, setDashboard] = useState<SubmissionDashboard | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function load() {
    setLoading(true); setError("");
    try { setDashboard(await fetchSubmissionDashboard(activityId)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar as entregas."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activityId]);

  const rows = useMemo(() => {
    const source = dashboard?.students ?? [];
    return filter === "ALL" ? source : source.filter((row) => row.status === filter);
  }, [dashboard, filter]);
  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    map.set("ALL", dashboard?.summary.total ?? 0);
    for (const item of FILTERS.slice(1)) map.set(item.id, dashboard?.students.filter((row) => row.status === item.id).length ?? 0);
    return map;
  }, [dashboard]);
  const summary = dashboard?.summary;
  const reviewableIds = (dashboard?.students ?? []).filter((row) => row.submissionId && ["SUBMITTED", "UNDER_REVIEW", "GRADED", "RETURNED"].includes(row.status)).map((row) => row.submissionId as string);
  const batchEligible = (dashboard?.students ?? []).filter((row) => row.submissionId && ["SUBMITTED", "UNDER_REVIEW"].includes(row.status)).map((row) => row.submissionId as string);
  function toggleSelected(id:string){ setSelectedIds(current=>current.includes(id)?current.filter(x=>x!==id):current.length>=20?current:[...current,id]); }

  if (reviewSubmissionId) return <SubmissionReviewPanel activityId={activityId} submissionIds={reviewableIds} initialSubmissionId={reviewSubmissionId} onClose={() => setReviewSubmissionId(null)} onChanged={load} />;

  return <section className={styles.shell}>
    <header className={styles.header}><div><span className={styles.kicker}>ENTREGAS DA ATIVIDADE</span><h3>{dashboard?.activityTitle || activityTitle}</h3><p>Acompanhe a turma inteira sem depender de controle paralelo.</p></div><div className={styles.actions}><button className={styles.button} type="button" disabled={loading} onClick={() => void load()}>{loading ? "Atualizando..." : "Atualizar"}</button><button className={styles.button} type="button" onClick={onClose}>Fechar</button></div></header>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <BatchAssessmentToolbar activityId={activityId} selectedIds={selectedIds} onSelectSuggested={(ids)=>setSelectedIds(ids.filter(id=>batchEligible.includes(id)).slice(0,20))} onOpenSubmission={setReviewSubmissionId} onChanged={load} />
    <IntegrationReadinessPanel activityId={activityId} />
    {summary && <div className={styles.metrics}><div className={styles.metric}><span>Alunos</span><strong>{summary.total}</strong></div><div className={styles.metric}><span>Pendentes</span><strong>{summary.notStarted}</strong></div><div className={styles.metric}><span>Aguardando correção</span><strong>{summary.submitted}</strong></div><div className={styles.metric}><span>Finalizados</span><strong>{summary.graded + summary.returned}</strong></div></div>}
    <div className={styles.filters} role="tablist" aria-label="Filtrar entregas por status">{FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`} onClick={() => setFilter(item.id)}>{item.label} · {counts.get(item.id) ?? 0}</button>)}</div>
    {loading && !dashboard ? <div className={styles.empty}>Carregando entregas...</div> : <div className={styles.table}><div className={`${styles.row} ${styles.head}`}><span aria-label="Seleção"></span><span>Aluno</span><span>Status</span><span>Itens</span><span>Tentativa</span><span>Última atualização</span><span>Ação</span></div>{rows.map((row) => <div className={styles.row} key={row.enrollmentId}><div className={styles.batchPick}>{row.submissionId && ["SUBMITTED", "UNDER_REVIEW"].includes(row.status) ? <input type="checkbox" aria-label={`Selecionar ${row.displayName}`} checked={selectedIds.includes(row.submissionId)} onChange={() => toggleSelected(row.submissionId as string)} /> : null}</div><div className={styles.student}><strong>{row.displayName}</strong><small>{row.studentName}{row.registration ? ` · ${row.registration}` : ""}</small></div><span className={`${styles.status} ${statusClass(row.status)}`}>{STATUS_LABEL[row.status]}</span><span className={styles.meta}>{row.itemCount}</span><span className={styles.meta}>{row.attemptNumber ?? "—"}</span><span className={styles.meta}>{dateTime(row.updatedAt)}</span>{row.submissionId && ["SUBMITTED", "UNDER_REVIEW", "GRADED", "RETURNED"].includes(row.status) && <button className={styles.button} type="button" onClick={() => setReviewSubmissionId(row.submissionId)}>Corrigir</button>}</div>)}{!rows.length && <div className={styles.empty}>Nenhum aluno neste filtro.</div>}</div>}
  </section>;
}
