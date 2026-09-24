"use client";

import { useEffect, useState } from "react";
import SessionAccessCard from "@/components/SessionAccessCard";
import type { JoinCode } from "@/lib/realtime-api";
import { closePoll, createPoll, revealPoll, type PollState } from "@/lib/poll-api";
import styles from "./PollPanel.module.css";

type Props = {
  sessionId: string;
  state: PollState;
  onStateChange: (state: PollState) => void;
  notify: (message: string) => void;
  joinCode: JoinCode | null;
  publicBaseUrl: string;
  realtimeStatus: "offline" | "connecting" | "online";
  connectedCount: number;
  presentCount: number;
  showAccessCard?: boolean;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function statusLabel(status: string) {
  if (status === "OPEN") return "Aberta";
  if (status === "REVEALED") return "Revelada";
  return "Encerrada";
}

export default function PollPanel({ sessionId, state, onStateChange, notify, joinCode, publicBaseUrl, realtimeStatus, connectedCount, presentCount, showAccessCard = true }: Props) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [liveResults, setLiveResults] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(!state.round);
  const round = state.round;

  useEffect(() => {
    if (!round) setCreating(true);
  }, [round?.id]);

  const validOptions = options.map((item) => item.trim()).filter(Boolean);
  const pending = Math.max(0, presentCount - (round?.totalVotes ?? 0));
  const voteProgress = presentCount > 0
    ? Math.min(100, Math.round(((round?.totalVotes ?? 0) / presentCount) * 100))
    : 0;

  async function create() {
    if (busy || !prompt.trim() || validOptions.length < 2 || validOptions.length !== options.length) return;
    setBusy(true);
    try {
      const next = await createPoll(sessionId, { prompt: prompt.trim(), options: validOptions, liveResults });
      onStateChange(next);
      setCreating(false);
      setPrompt("");
      setOptions(["", ""]);
      notify("Votação aberta para a turma.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível abrir a votação.");
    } finally { setBusy(false); }
  }

  async function reveal() {
    if (!round || busy) return;
    setBusy(true);
    try { onStateChange(await revealPoll(sessionId, round.id)); notify("Resultados revelados para a turma."); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível revelar os resultados."); }
    finally { setBusy(false); }
  }

  async function close() {
    if (!round || busy) return;
    if (round.status !== "CLOSED" && presentCount > 0 && pending > 0) {
      const confirmed = window.confirm(`${round.totalVotes} de ${presentCount} aluno(s) presente(s) votaram. ${pending} ainda não votaram.\n\nDeseja encerrar mesmo assim?`);
      if (!confirmed) return;
    }
    setBusy(true);
    try { onStateChange(await closePoll(sessionId, round.id)); notify("Votação encerrada."); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível encerrar a votação."); }
    finally { setBusy(false); }
  }

  function project() {
    if (!joinCode) return notify("Aguarde a geração do código da sessão.");
    window.open(`/projector?code=${encodeURIComponent(joinCode.code)}`, "_blank", "noopener,noreferrer");
  }

  const accessCard = showAccessCard ? <SessionAccessCard sessionId={sessionId} joinCode={joinCode} publicBaseUrl={publicBaseUrl} notify={notify} realtimeStatus={realtimeStatus} connectedCount={connectedCount} compact title="Participação da Votação" subtitle="Os alunos usam o mesmo /join durante toda a aula." /> : null;

  if (!round || creating) {
    return (
      <div>
        {accessCard}
        <section className={`${styles.shell} ${styles.prepareShell}`}>
          <div className={styles.heroHeader}>
            <div>
              <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
              <h2>Votação</h2>
              <p>Crie uma decisão rápida da turma com leitura visual imediata.</p>
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
                <span>Pergunta</span>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ex.: Qual abordagem faz mais sentido para este problema?"
                />
                <small>{prompt.length}/280</small>
              </label>

              <div className={styles.options}>
                {options.map((option, index) => (
                  <div className={styles.optionRow} key={index}>
                    <span className={styles.optionIndex}>{LETTERS[index]}</span>
                    <input
                      maxLength={160}
                      value={option}
                      onChange={(event) => setOptions((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? event.target.value : item)
                      )}
                      placeholder={`Opção ${LETTERS[index]}`}
                    />
                    <button
                      className={styles.remove}
                      type="button"
                      aria-label={`Remover opção ${LETTERS[index]}`}
                      disabled={options.length <= 2}
                      onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {options.length < 6 && (
                  <button className={styles.add} type="button" onClick={() => setOptions((current) => [...current, ""])}>
                    + Adicionar opção
                  </button>
                )}
              </div>
            </section>

            <aside className={styles.modeCard}>
              <span className={styles.cardLabel}>EXIBIÇÃO DOS RESULTADOS</span>
              <button type="button" className={!liveResults ? styles.modeActive : styles.mode} onClick={() => setLiveResults(false)}>
                <b>Revelar depois</b>
                <small>Mostra apenas a participação até você liberar o resultado.</small>
              </button>
              <button type="button" className={liveResults ? styles.modeActive : styles.mode} onClick={() => setLiveResults(true)}>
                <b>Resultados ao vivo</b>
                <small>A distribuição muda conforme os votos chegam.</small>
              </button>
              <div className={styles.prepareOrb} aria-hidden="true">◉</div>
              <strong>{presentCount} aluno(s) presente(s)</strong>
              <button
                className={styles.primary}
                disabled={busy || !prompt.trim() || validOptions.length < 2 || validOptions.length !== options.length}
                onClick={() => void create()}
              >
                {busy ? "Abrindo..." : "Abrir votação"}
              </button>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      {accessCard}
      <section className={`${styles.shell} ${styles.liveShell}`}>
        <div className={styles.heroHeader}>
          <div>
            <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
            <h2>Votação</h2>
            <p>{round.prompt}</p>
          </div>
          <span className={`${styles.status} ${styles[round.status.toLowerCase()]}`}>{statusLabel(round.status)}</span>
        </div>

        <div className={styles.liveGrid}>
          <section className={styles.voteStage}>
            <div className={styles.voteStageHead}>
              <span className={styles.cardLabel}>PARTICIPAÇÃO DA TURMA</span>
              <strong>{round.totalVotes}/{presentCount}</strong>
            </div>
            <div className={styles.voteTrack}><span style={{ width: `${voteProgress}%` }} /></div>
            <small>{pending} pendente(s) · {voteProgress}% da turma votou</small>

            <div className={styles.stats}>
              <div><strong>{presentCount}</strong><span>presentes</span></div>
              <div><strong>{round.totalVotes}</strong><span>votos</span></div>
              <div><strong>{pending}</strong><span>pendentes</span></div>
            </div>

            <div className={styles.voteModeInfo}>
              <span>{round.liveResults ? "◉ Resultados ao vivo" : round.publicResultsVisible ? "◉ Resultados liberados" : "◉ Resultados protegidos"}</span>
              <small>
                {round.liveResults
                  ? "A distribuição é atualizada em tempo real."
                  : round.publicResultsVisible
                    ? "A turma já pode visualizar a distribuição."
                    : "Só você acompanha o resultado até decidir revelar."}
              </small>
            </div>
          </section>

          <section className={styles.resultsCard}>
            <div className={styles.resultsHeader}>
              <div>
                <span className={styles.cardLabel}>DISTRIBUIÇÃO</span>
                <h3>Como a turma votou</h3>
              </div>
              <span>{round.options.length} opções</span>
            </div>

            <div className={styles.results}>
              {round.options.map((option) => (
                <div className={styles.result} key={option.id}>
                  <div className={styles.resultHead}>
                    <span>
                      <b>{LETTERS[option.position] ?? option.position + 1}</b>
                      {option.label}
                    </span>
                    <strong>{option.voteCount ?? 0} · {(option.percentage ?? 0).toFixed(0)}%</strong>
                  </div>
                  <div className={styles.bar}><span style={{ width: `${option.percentage ?? 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.actions}>
          {round.status === "OPEN" && !round.publicResultsVisible && (
            <button className={styles.secondary} disabled={busy} onClick={() => void reveal()}>Revelar resultados</button>
          )}
          <button className={styles.secondary} onClick={project}>Abrir Projetor</button>
          {round.status !== "CLOSED"
            ? <button className={styles.danger} disabled={busy} onClick={() => void close()}>Encerrar votação</button>
            : <button className={styles.primary} onClick={() => setCreating(true)}>Nova votação</button>}
        </div>
      </section>
    </div>
  );
}
