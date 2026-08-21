"use client";

import { useEffect, useMemo, useState } from "react";
import { EXTERNAL_PLATFORM_LABEL, parseExternalResultFile, type ExternalResultPlatform, type ParsedExternalReport } from "@/lib/external-results";
import { applyStudentOverrides, fetchExternalResultImports, importExternalResults, mapImportedScoreEvents, previewExternalResults, type ExternalResultImportSummary, type ExternalResultPreview } from "@/lib/external-results-api";
import type { Activity, ScoreEvent, Student } from "@/lib/types";

type Props = {
  open: boolean;
  activity?: Activity;
  students: Student[];
  onClose: () => void;
  onImported: (events: ScoreEvent[]) => void;
  notify: (message: string) => void;
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatScore(value?: number) {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export default function ExternalResultImportModal({ open, activity, students, onClose, onImported, notify }: Props) {
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ParsedExternalReport>();
  const [platform, setPlatform] = useState<ExternalResultPlatform>("AUTO");
  const [fallbackMaxScore, setFallbackMaxScore] = useState<number | undefined>();
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<ExternalResultPreview>();
  const [history, setHistory] = useState<ExternalResultImportSummary[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !activity) return;
    setFileName("");
    setReport(undefined);
    setPlatform(activity.resource?.platform ? "AUTO" : "GENERIC_CSV");
    setFallbackMaxScore(undefined);
    setOverrides({});
    setPreview(undefined);
    void fetchExternalResultImports(activity.id).then(setHistory).catch(() => setHistory([]));
  }, [open, activity?.id]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const needsFallbackMax = useMemo(() => report?.rows.some((row) => row.score !== undefined && row.percentage === undefined && row.maxScore === undefined) ?? false, [report]);
  const effectivePlatform = platform === "AUTO" ? report?.detectedPlatform ?? "GENERIC_CSV" : platform;

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseExternalResultFile(text);
      setFileName(file.name);
      setReport(parsed);
      setPlatform("AUTO");
      setFallbackMaxScore(parsed.detectedMaxScore);
      setOverrides({});
      setPreview(undefined);
      notify(`${parsed.rows.length} resultado(s) reconhecido(s) no arquivo.`);
    } catch (error) {
      setReport(undefined);
      setPreview(undefined);
      notify(error instanceof Error ? error.message : "Não foi possível ler o relatório.");
    }
  }

  function buildRequest() {
    if (!report) throw new Error("Selecione um relatório CSV/TSV.");
    return {
      platform: effectivePlatform,
      sourceName: fileName,
      fallbackMaxScore,
      rows: applyStudentOverrides(report.rows, overrides, students),
    };
  }

  async function validateReport() {
    if (!activity || !report || busy) return;
    if (needsFallbackMax && (!fallbackMaxScore || fallbackMaxScore <= 0)) {
      notify("Informe a pontuação máxima do relatório para calcular o XP proporcional.");
      return;
    }
    setBusy(true);
    try {
      const result = await previewExternalResults(activity.id, buildRequest());
      setPreview(result);
      if (result.duplicateImport) notify("Este mesmo relatório já foi importado anteriormente.");
      else if (result.unresolvedCount || result.duplicateStudentCount || result.scoreIssueCount) notify("Revise as linhas destacadas antes de importar.");
      else notify("Relatório validado. O XP pode ser importado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao validar o relatório.");
    } finally {
      setBusy(false);
    }
  }

  function changeOverride(rowIndex: number, studentId: string) {
    setOverrides((current) => ({ ...current, [rowIndex]: studentId }));
    setPreview(undefined);
  }

  async function executeImport() {
    if (!activity || !preview || busy) return;
    if (preview.duplicateImport || preview.unresolvedCount || preview.duplicateStudentCount || preview.scoreIssueCount) return;
    setBusy(true);
    try {
      const result = await importExternalResults(activity.id, buildRequest());
      const events = mapImportedScoreEvents(result.scoreEvents);
      onImported(events);
      setHistory(await fetchExternalResultImports(activity.id));
      notify(`Relatório importado: ${result.matchedCount} aluno(s), ${events.length} lançamento(s) de XP.`);
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao importar o relatório.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !activity) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="modal-card large" role="dialog" aria-modal="true" aria-labelledby="external-results-title">
        <header className="modal-header">
          <div><h2 id="external-results-title">Importar resultados externos</h2><p>{activity.title} · XP proporcional ao desempenho</p></div>
          <button className="modal-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>
        <div className="modal-body external-results-modal">
          <div className="external-import-grid">
            <section className="external-import-config">
              <div className="context-lock"><span>Atividade</span><strong>{activity.title}</strong><small>Até {activity.points} XP por aluno · resultado vinculado à turma atual.</small></div>
              <label className="external-file-drop">
                <strong>{fileName || "Selecionar relatório CSV / TSV"}</strong>
                <small>Exports de Wayground/Quizizz, Microsoft Forms, Google Forms, Kahoot ou CSV genérico.</small>
                <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => { void readFile(event.target.files?.[0]); }} />
              </label>
              {report && <>
                <div className="form-two">
                  <label>Formato<select className="select full" value={platform} onChange={(event) => { setPlatform(event.target.value as ExternalResultPlatform); setPreview(undefined); }}>{Object.entries(EXTERNAL_PLATFORM_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label>Pontuação máxima{needsFallbackMax ? " *" : ""}<input className="input" type="number" min="0.01" step="0.01" value={fallbackMaxScore ?? ""} onChange={(event) => { setFallbackMaxScore(event.target.value ? Number(event.target.value) : undefined); setPreview(undefined); }} placeholder={report.hasPercentage ? "Percentual já detectado" : "Ex.: 20"} /></label>
                </div>
                <div className="external-detection-line"><span>{report.rows.length} linhas</span><span>{report.headers.length} colunas</span><span>Detectado: {EXTERNAL_PLATFORM_LABEL[report.detectedPlatform]}</span></div>
                <button className="button primary full-button" disabled={busy} onClick={() => { void validateReport(); }}>{preview ? "Revalidar relatório" : "Validar relatório"}</button>
              </>}
              {history.length > 0 && <div className="external-import-history"><strong>Importações recentes</strong>{history.slice(0, 3).map((item) => <div key={item.id}><span>{item.sourceName || item.platform || "Relatório"}</span><small>{item.matchedCount} alunos · {dateTime(item.createdAt)}</small></div>)}</div>}
            </section>

            <section className="external-import-preview">
              {!report && <div className="external-preview-empty"><strong>Fluxo seguro de importação</strong><p>O Arena Dev identifica colunas, cruza nome/matrícula com os alunos desta turma, mostra o XP calculado e só grava após sua validação.</p></div>}
              {report && !preview && <div className="external-preview-empty"><strong>Arquivo carregado</strong><p>Valide o relatório para conferir o vínculo de cada linha com os alunos da turma antes de gerar XP.</p></div>}
              {preview && <>
                <div className="external-preview-summary">
                  <div><span>Linhas</span><strong>{preview.rowCount}</strong></div>
                  <div><span>Associadas</span><strong>{preview.matchedCount}</strong></div>
                  <div><span>Pendências</span><strong>{preview.unresolvedCount + preview.duplicateStudentCount + preview.scoreIssueCount}</strong></div>
                  <div><span>XP máximo</span><strong>{activity.points}</strong></div>
                </div>
                {preview.duplicateImport && <div className="external-import-warning danger">Este conteúdo já foi importado para esta atividade. A duplicação foi bloqueada.</div>}
                <div className="external-result-table-wrap">
                  <table className="external-result-table">
                    <thead><tr><th>Origem</th><th>Aluno da turma</th><th>Resultado</th><th>XP</th></tr></thead>
                    <tbody>{preview.rows.map((row) => {
                      const needsMapping = row.status === "UNMATCHED" || row.status === "DUPLICATE";
                      return <tr key={row.rowIndex} className={row.status === "MATCHED" ? "" : "has-issue"}>
                        <td><strong>{row.participantName || row.participantRegistration || `Linha ${row.rowIndex}`}</strong>{row.participantRegistration && row.participantName && <small>{row.participantRegistration}</small>}</td>
                        <td>{needsMapping ? <select className="select compact" value={overrides[row.rowIndex] ?? ""} onChange={(event) => changeOverride(row.rowIndex, event.target.value)}><option value="">Selecionar aluno…</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select> : <><strong>{row.studentName || "—"}</strong>{row.note && <small>{row.note}</small>}</>}</td>
                        <td><strong>{row.percentage !== undefined ? `${formatScore(row.percentage)}%` : formatScore(row.score)}</strong><small>{row.score !== undefined && row.maxScore !== undefined ? `${formatScore(row.score)} / ${formatScore(row.maxScore)}` : row.status === "SCORE_UNRESOLVED" ? row.note : ""}</small></td>
                        <td><b className="positive">+{row.xpAwarded} XP</b></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              </>}
            </section>
          </div>
          <div className="modal-footer">
            <button className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button primary" disabled={!preview || busy || preview.duplicateImport || preview.unresolvedCount > 0 || preview.duplicateStudentCount > 0 || preview.scoreIssueCount > 0} onClick={() => { void executeImport(); }}>Importar resultados e XP</button>
          </div>
        </div>
      </section>
    </div>
  );
}
