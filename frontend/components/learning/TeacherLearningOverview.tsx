"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { fetchSessionLearningOverview, type SessionLearningOverview } from "@/lib/session-learning-overview-api";
import { recoveryGuidance } from "@/lib/learning-recovery";
import styles from "./TeacherLearningOverview.module.css";
import { DialogCloseButton } from "@/components/ui";

export default function TeacherLearningOverview({ sessionId, onOpenLearningCheck }: {
  sessionId: string;
  onOpenLearningCheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SessionLearningOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const trigger = triggerRef.current;
    modalRef.current?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {event.preventDefault(); setOpen(false);return;}
      if (event.key !== "Tab" || !modalRef.current) return;
      const elements = [...modalRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]),a[href],input:not([disabled])",
      )].filter((element)=>element.getClientRects().length > 0);
      if (!elements.length) {event.preventDefault();return;}
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();elements[elements.length-1].focus();
      } else if (!event.shiftKey && document.activeElement === elements[elements.length-1]) {
        event.preventDefault();elements[0].focus();
      }
    };
    document.addEventListener("keydown",handleKey);
    return () => {
      document.removeEventListener("keydown",handleKey);
      (trigger??previous)?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active=true;
    void fetchSessionLearningOverview(sessionId)
      .then((value)=>{if(active)setData(value);})
      .catch((reason)=>{if(active)setError(reason instanceof Error?reason.message:"Falha ao consultar o painel.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  }, [open,sessionId]);

  function show() {
    setData(null);
    setError(null);
    setLoading(true);
    setOpen(true);
  }

  async function refresh() {
    if (loading) return;
    setLoading(true);setError(null);
    try {setData(await fetchSessionLearningOverview(sessionId));}
    catch (reason) {setError(reason instanceof Error?reason.message:"Falha ao atualizar os dados.");}
    finally {setLoading(false);}
  }

  const statusLabel={DIAGNOSED:"Diagnóstico registrado",INTERVENED:"Aguardando verificação",VERIFIED:"Comparação disponível"};
  return <>
    <button type="button" ref={triggerRef} className={styles.trigger}
      aria-haspopup="dialog" aria-expanded={open} onClick={show}>
      Painel pedagógico
    </button>
    {open && typeof document !== "undefined" && createPortal(
      <div className={styles.overlay}>
        <section ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <header className={styles.header}>
            <div>
              <h2 id={titleId}>Evidências da sessão</h2>
              <p>Decisões pedagógicas a partir de respostas avaliadas, não de XP.</p>
            </div>
            <DialogCloseButton onClick={() => setOpen(false)} label="Fechar painel pedagógico" />
          </header>
          <div className={styles.content}>
            {loading && <p role="status">Atualizando evidências…</p>}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {data && <>
              <div className={styles.kpis} aria-label="Resumo da sessão">
                <div><strong>{data.presentNow}</strong><span>Presentes marcados</span></div>
                <div><strong>{data.absentNow}</strong><span>Ausentes marcados</span></div>
                <div><strong>{data.cycles}</strong><span>Ciclos registrados</span></div>
                <div><strong>{data.verifiedCycles}</strong><span>Com duas verificações</span></div>
              </div>
              <p className={styles.context}>Presença atual: {data.presentNow}/{data.enrolledInSession} matriculados nesta sessão. Respostas e comparações são amostras distintas dessa presença.</p>
              {data.rows.length===0 ? <div className={styles.empty}>
                <strong>Sem ciclos de aprendizagem registrados nesta sessão.</strong>
                <p>Inicie uma Verificação de aprendizagem vinculada a um objetivo, conclua o diagnóstico e registre a intervenção.</p>
              </div> : <div className={styles.rows}>
                {data.rows.map((row)=><article key={row.cycleId} className={styles.cycle}>
                  <div className={styles.cycleHead}>
                    <h3>{row.learningTargetTitle}</h3>
                    <span>{statusLabel[row.status]}</span>
                  </div>
                  <p>Intervenção: {row.interventionNote
                    ? row.interventionType==="PEER_DISCUSSION"?"Discussão em pares":"Explicação docente"
                    :"Ainda não registrada"}</p>
                  {row.interventionNote && <details className={styles.intervention}>
                    <summary>Consultar registro da intervenção</summary>
                    <p>{row.interventionNote}</p>
                  </details>}
                  {row.comparison ? <>
                    <dl className={styles.counts}>
                      <div><dt>Respostas iniciais</dt><dd>{row.comparison.baseline.responses}</dd></div>
                      <div><dt>Respostas finais</dt><dd>{row.comparison.followup.responses}</dd></div>
                      <div><dt>Pares comparáveis</dt><dd>{row.comparison.paired}</dd></div>
                      <div><dt>Acerto → acerto</dt><dd>{row.comparison.transitions.correctToCorrect}</dd></div>
                      <div><dt>Erro → acerto</dt><dd>{row.comparison.transitions.incorrectToCorrect}</dd></div>
                      <div><dt>Erro → erro</dt><dd>{row.comparison.transitions.incorrectToIncorrect}</dd></div>
                      <div><dt>Acerto → erro</dt><dd>{row.comparison.transitions.correctToIncorrect}</dd></div>
                    </dl>
                    <p className={styles.note}>Fora do pareamento: {row.comparison.baselineOnly} apenas no diagnóstico; {row.comparison.followupOnly} apenas na verificação.</p>
                    <div className={styles.next}><strong>{recoveryGuidance(row.comparison).title}</strong>
                      <p>{recoveryGuidance(row.comparison).nextStep}</p></div>
                  </> : <p className={styles.next}>{row.status==="DIAGNOSED"
                    ?"Registre a intervenção para avançar; não há comparação antes/depois."
                    :"Aplique e encerre uma segunda verificação para comparar as mesmas pessoas."}</p>}
                </article>)}
              </div>}
              <p className={styles.disclaimer}>{data.disclaimer}</p>
            </>}
          </div>
          <footer className={styles.footer}>
            <button type="button" className={styles.secondaryAction} onClick={() => { void refresh(); }} disabled={loading}>Atualizar dados</button>
            <button type="button" className={styles.primaryAction} onClick={() => { setOpen(false); onOpenLearningCheck(); }}>Abrir verificação</button>
          </footer>
        </section>
      </div>,document.body)}
  </>;
}
