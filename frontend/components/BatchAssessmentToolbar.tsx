"use client";
import { useEffect, useState } from "react";
import { fetchAssessmentQueue, prepareBatchAiSuggestions, type AssessmentQueue } from "@/lib/assessment-batch-api";
import styles from "./BatchAssessmentToolbar.module.css";

export default function BatchAssessmentToolbar({activityId,selectedIds,onSelectSuggested,onOpenSubmission,onChanged}:{activityId:string;selectedIds:string[];onSelectSuggested:(ids:string[])=>void;onOpenSubmission:(id:string)=>void;onChanged:()=>Promise<void>|void}){
  const [queue,setQueue]=useState<AssessmentQueue|null>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  async function load(){ try{setQueue(await fetchAssessmentQueue(activityId));}catch(c){setError(c instanceof Error?c.message:"Não foi possível carregar a fila.");} }
  useEffect(()=>{void load();},[activityId]);
  const selectable=queue?.items.map(i=>i.submissionId)??[]; const nextId=queue?.items[0]?.submissionId;
  async function prepare(){ if(!selectedIds.length||busy)return; setBusy(true);setError("");setMessage(""); try{const r=await prepareBatchAiSuggestions(activityId,selectedIds);setMessage(`${r.succeeded} sugestão(ões) preparada(s) · ${r.failed} falha(s). Nenhuma nota ou feedback foi publicado.`);await load();await onChanged();onSelectSuggested([]);}catch(c){setError(c instanceof Error?c.message:"Não foi possível processar o lote.");}finally{setBusy(false);} }
  return <section className={styles.shell} aria-label="Triagem e correção em lote"><div className={styles.head}><div><strong>Fila de correção</strong><small>{queue?`${queue.waiting} aguardando · ${queue.inReview} em correção`:"Carregando prioridade..."}</small></div><div className={styles.actions}><button type="button" className={styles.button} disabled={!selectable.length||busy} onClick={()=>onSelectSuggested(selectable.slice(0,20))}>Selecionar fila</button><button type="button" className={styles.button} disabled={!nextId||busy} onClick={()=>nextId&&onOpenSubmission(nextId)}>Corrigir próxima</button><button type="button" className={`${styles.button} ${styles.primary}`} disabled={!selectedIds.length||busy} onClick={()=>void prepare()}>{busy?"Preparando...":`Preparar IA (${selectedIds.length})`}</button></div></div><div className={styles.result}>A ação em lote só prepara rascunhos da IA. Não aplica pontuação, não conclui correção e não publica feedback.</div>{message&&<div className={styles.result} role="status">{message}</div>}{error&&<div className={styles.error} role="alert">{error}</div>}</section>;
}
