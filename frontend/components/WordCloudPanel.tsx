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
  if (status === "COLLECTING") return "Coletando";
  if (status === "REVEALED") return "Revelada";
  return "Encerrada";
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

  function projectWordCloud() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }

    window.open(
      `/projector?code=${encodeURIComponent(joinCode.code)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function close() {
    if (!round || busy) return;

    if (
      round.status === "COLLECTING"
      && participation.presentCount > 0
      && participation.pendingCount > 0
    ) {
      const confirmed = window.confirm(
        `${participation.answeredCount} de ${participation.presentCount} aluno(s) presente(s) responderam. `
          + `${participation.pendingCount} ainda não participaram.\n\n`
          + "Deseja encerrar a rodada mesmo assim?",
      );
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      const next = await closeWordCloud(sessionId, round.id);
      onStateChange(next);
      notify("Rodada de Nuvem de Palavras encerrada.");
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
          <div className={styles.heroHeader}>
            <div>
              <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
              <h2>Nuvem de Palavras</h2>
              <p>Transforme respostas curtas da turma em um painel visual coletivo.</p>
            </div>
            {round?.status === "CLOSED" && (
              <button className={styles.secondary} onClick={() => setCreating(false)}>
                Ver rodada anterior
              </button>
            )}
          </div>

          <div className={styles.prepareGrid}>
            <section className={styles.composeCard}>
              <span className={styles.cardLabel}>PERGUNTA DA RODADA</span>
              <label className={styles.field}>
                <span>Pergunta para a turma</span>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Ex.: Qual palavra melhor resume o conceito de API?"
                />
                <small>{prompt.length}/280</small>
              </label>

              <div className={styles.configGrid}>
                <div className={styles.field}>
                  <span>Respostas por aluno</span>
                  <select value={maxWords} onChange={(event) => setMaxWords(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>

                <div className={styles.modeGroup}>
                  <span>Como exibir</span>
                  <button type="button" className={!liveReveal ? styles.modeActive : styles.mode} onClick={() => setLiveReveal(false)}>
                    <b>Coletar e revelar</b>
                    <small>As respostas ficam ocultas até você liberar.</small>
                  </button>
                  <button type="button" className={liveReveal ? styles.modeActive : styles.mode} onClick={() => setLiveReveal(true)}>
                    <b>Ao vivo</b>
                    <small>A frequência aparece conforme a turma responde.</small>
                  </button>
                </div>
              </div>
            </section>

            <aside className={styles.stagePreviewCard}>
              <span className={styles.cardLabel}>PALCO DA TURMA</span>
              <div className={styles.previewCloudOrb} aria-hidden="true">
                <span>API</span>
                <b>REST</b>
                <em>JSON</em>
                <small>HTTP</small>
              </div>
              <strong>{presentCount} aluno(s) presente(s)</strong>
              <p>As palavras ganham destaque conforme a frequência aumenta.</p>
              <button
                className={styles.primary}
                disabled={busy || !prompt.trim()}
                onClick={() => void create()}
              >
                {busy ? "Criando..." : "Abrir Nuvem"}
              </button>
            </aside>
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
        <div className={styles.heroHeader}>
          <div>
            <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
            <h2>Nuvem de Palavras</h2>
            <p>{round.prompt}</p>
          </div>
          <span className={`${styles.status} ${styles[round.status.toLowerCase()]}`}>
            {statusLabel(round.status)}
          </span>
        </div>

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
          <button className={styles.secondary} disabled={!joinCode} onClick={projectWordCloud}>
            Projetar Nuvem ↗
          </button>
          {round.status === "COLLECTING" && !round.liveReveal && (
            <button className={styles.primary} disabled={busy} onClick={() => void reveal()}>
              Revelar respostas
            </button>
          )}
          {round.status !== "CLOSED" && (
            <button className={styles.danger} disabled={busy} onClick={() => void close()}>
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
