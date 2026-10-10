"use client";

import { useState } from "react";
import SessionAccessCard from "@/components/SessionAccessCard";
import type { JoinCode } from "@/lib/realtime-api";
import { wordCloudParticipationMetrics } from "@/lib/word-cloud-metrics";
import {
  closeWordCloud,
  createWordCloud,
  revealWordCloud,
  type WordCloudState,
} from "@/lib/word-cloud-api";
import styles from "./WordCloudPanel.module.css";
import DynamicHeader from "@/components/arena/dynamics/DynamicHeader";
import QuestionComposer from "@/components/arena/dynamics/QuestionComposer";
import ToggleField from "@/components/arena/dynamics/ToggleField";
import DynamicSection from "@/components/arena/dynamics/DynamicSection";

type Props = {
  sessionId: string;
  state: WordCloudState;
  onStateChange: (state: WordCloudState) => void;
  notify: (message: string) => void;
  joinCode: JoinCode | null;
  publicBaseUrl: string;
  realtimeStatus: "offline" | "connecting" | "online";
  connectedCount: number;
  presentCount: number;
  showAccessCard?: boolean;
};

function statusLabel(status: string) {
  if (status === "COLLECTING") return "AO VIVO";
  if (status === "REVEALED") return "RESULTADO";
  return "ENCERRADO";
}

export default function WordCloudPanel({
  sessionId,
  state,
  onStateChange,
  notify,
  joinCode,
  publicBaseUrl,
  realtimeStatus,
  connectedCount,
  presentCount,
  showAccessCard = true,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [liveReveal, setLiveReveal] = useState(false);
  const [maxWords, setMaxWords] = useState(3);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(!state.round);

  const round = state.round;
  const showForm = !round || creating;
  const participation = round
    ? wordCloudParticipationMetrics(
        presentCount,
        round.participantCount,
        round.submissionCount,
      )
    : wordCloudParticipationMetrics(presentCount, 0, 0);
  const participationProgress = participation.presentCount > 0
    ? Math.min(100, Math.round((participation.answeredCount / participation.presentCount) * 100))
    : 0;

  async function create() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const next = await createWordCloud(sessionId, {
        prompt: prompt.trim(),
        liveReveal,
        maxWordsPerParticipant: maxWords,
      });
      onStateChange(next);
      setCreating(false);
      setPrompt("");
      notify("Nuvem de Palavras aberta para participação.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar a Nuvem de Palavras.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (!round || busy) return;
    setBusy(true);
    try {
      const next = await revealWordCloud(sessionId, round.id);
      onStateChange(next);
      notify("Respostas reveladas.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível revelar as respostas.");
    } finally {
      setBusy(false);
    }
  }

  async function endRound() {
    if (!round || busy || round.status === "CLOSED") return;
    if (round.status === "COLLECTING" && participation.pendingCount > 0) {
      const confirmed = window.confirm(
        `${participation.answeredCount} de ${participation.presentCount} aluno(s) responderam. ` +
        `${participation.pendingCount} ainda não responderam. Encerrar a rodada mesmo assim?`,
      );
      if (!confirmed) return;
    }
    setBusy(true);
    try {
      onStateChange(await closeWordCloud(sessionId, round.id));
      notify("Rodada da Nuvem de Palavras encerrada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível encerrar a rodada.");
    } finally {
      setBusy(false);
    }
  }

  const accessCard = showAccessCard ? (
    <SessionAccessCard
      sessionId={sessionId}
      joinCode={joinCode}
      publicBaseUrl={publicBaseUrl}
      notify={notify}
      realtimeStatus={realtimeStatus}
      connectedCount={connectedCount}
      compact
      title="Participação da Nuvem"
      subtitle="Compartilhe uma única vez. Os alunos usam o mesmo /join durante toda a aula."
    />
  ) : null;

  if (showForm) {
    return (
      <div>
        {accessCard}
        <section className={`${styles.shell} ${styles.prepareShell}`}>
          <DynamicHeader dynamic="wordcloud"
            title="Nuvem de Palavras"
            description="Transforme respostas curtas da turma em um painel visual coletivo."
            status="PREPARAR"
            secondaryActions={(
              <div className={styles.headerRevealControl}>
                <ToggleField
                  compact
                  label="Exibir resultados ao vivo"
                  checked={liveReveal}
                  onChange={setLiveReveal}
                />
              </div>
            )}
            actions={round?.status === "CLOSED" ? (
              <button className={styles.secondary} onClick={() => setCreating(false)}>Ver rodada anterior</button>
            ) : undefined}
          />

          <div className={styles.prepareGrid}>
            <DynamicSection className={styles.composeCard}>
              <QuestionComposer
                label="Pergunta para a turma"
                labelAccessory={(
                  <label className={styles.inlineWords}>
                    <span>Respostas por aluno</span>
                    <select
                      aria-label="Respostas por aluno"
                      value={maxWords}
                      onChange={(event) => setMaxWords(Number(event.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                )}
                value={prompt}
                onChange={setPrompt}
                maxLength={280}
                placeholder="Ex.: Qual palavra melhor resume o conceito de API?"
              />

            </DynamicSection>

            <DynamicSection className={styles.stagePreviewCard} ariaLabel="Prévia da Nuvem de Palavras">
              <div className={styles.stagePreviewCopy}>
                <div className={styles.previewCloudOrb} aria-hidden="true">
                  <span>API</span>
                  <b>REST</b>
                  <em>JSON</em>
                  <small>HTTP</small>
                </div>
                <div>
                  <span className={styles.cardLabel}>PRÉVIA DO PALCO</span>
                  <strong>{presentCount} aluno(s) presente(s)</strong>
                  <p>As palavras ganham destaque conforme a frequência aumenta.</p>
                </div>
              </div>
              <button
                className={styles.primary}
                disabled={busy || !prompt.trim()}
                onClick={() => void create()}
              >
                {busy ? "Criando..." : "Abrir Nuvem"}
              </button>
            </DynamicSection>
          </div>
        </section>
      </div>
    );
  }

  if (!round) return accessCard;

  return (
    <div>
      {accessCard}
      <section className={`${styles.shell} ${styles.liveShell}`}>
        <DynamicHeader dynamic="wordcloud"
          title="Nuvem de Palavras"
          description={round.prompt}
          status={statusLabel(round.status)}
        />

        <div className={styles.liveGrid}>
          <section className={styles.participationCard}>
            <div className={styles.participationHead}>
              <span className={styles.cardLabel}>PARTICIPAÇÃO</span>
              <strong>{participation.answeredCount}/{participation.presentCount}</strong>
            </div>

            <div className={styles.participationTrack}>
              <span style={{ width: `${participationProgress}%` }} />
            </div>
            <small>{participation.pendingCount} pendente(s) · {participationProgress}% da turma participou</small>

            <div className={styles.stats}>
              <div><strong>{participation.presentCount}</strong><span>presentes</span></div>
              <div><strong>{participation.answeredCount}</strong><span>responderam</span></div>
              <div><strong>{participation.pendingCount}</strong><span>pendentes</span></div>
              <div><strong>{participation.submissionCount}</strong><span>respostas</span></div>
            </div>

            <div className={styles.roundPolicy}>
              <span>{round.liveReveal ? "☁ Exibição ao vivo" : round.status === "REVEALED" ? "☁ Respostas reveladas" : "☁ Coleta protegida"}</span>
              <small>Máximo de {round.maxWordsPerParticipant} resposta(s) por aluno.</small>
            </div>
          </section>

          <section className={styles.cloudStage}>
            <div className={styles.cloudStageHead}>
              <div>
                <span className={styles.cardLabel}>NUVEM DA TURMA</span>
                <h3>{round.terms.length > 0 ? "Ideias em destaque" : "Aguardando respostas"}</h3>
              </div>
              <span>{round.terms.length} termo(s)</span>
            </div>

            {round.terms.length > 0 ? (
              <div className={styles.preview}>
                {round.terms.slice(0, 30).map((term, index) => (
                  <span
                    key={term.normalizedText}
                    className={index < 3 ? styles.topTerm : undefined}
                    style={{ fontSize: `${Math.min(42, 15 + term.count * 4)}px` }}
                  >
                    {term.text}<b>×{term.count}</b>
                  </span>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span aria-hidden="true">☁</span>
                <strong>
                  {round.status === "COLLECTING" && !round.liveReveal
                    ? "As respostas estão chegando"
                    : round.status === "COLLECTING"
                      ? "Esperando as primeiras palavras"
                      : "Nenhuma resposta registrada"}
                </strong>
                <p>
                  {round.status === "COLLECTING" && !round.liveReveal
                    ? `${round.submissionCount} resposta(s) recebida(s), ainda ocultas até você revelar.`
                    : "A nuvem aparecerá aqui assim que houver termos disponíveis."}
                </p>
              </div>
            )}
          </section>
        </div>

        <div className={styles.actions}>
          {round.status === "COLLECTING" && !round.liveReveal && (
            <button className={styles.primary} disabled={busy} onClick={() => void reveal()}>
              Revelar respostas
            </button>
          )}
          {round.status !== "CLOSED" && (
            <button className={styles.danger} disabled={busy} onClick={() => void endRound()}>
              Encerrar rodada
            </button>
          )}
          {round.status === "CLOSED" && (
            <button className={styles.primary} onClick={() => setCreating(true)}>
              Nova rodada
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
