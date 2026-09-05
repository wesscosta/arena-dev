"use client";

import { useState } from "react";
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
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [liveReveal, setLiveReveal] = useState(false);
  const [maxWords, setMaxWords] = useState(3);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(!state.round);

  const round = state.round;
  const showForm = !round || creating;

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

  async function close() {
    if (!round || busy) return;
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

  if (showForm) {
    return (
      <section className={styles.shell}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
            <h3>Criar Nuvem de Palavras</h3>
            <p>Faça uma pergunta curta e deixe a turma responder pelo mesmo /join da sessão.</p>
          </div>
          {round?.status === "CLOSED" && (
            <button className={styles.secondary} onClick={() => setCreating(false)}>Voltar à rodada anterior</button>
          )}
        </div>

        <label className={styles.field}>
          <span>Pergunta para a turma</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={280}
            rows={3}
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
            <button
              type="button"
              className={!liveReveal ? styles.modeActive : styles.mode}
              onClick={() => setLiveReveal(false)}
            >
              <b>Coletar e revelar</b>
              <small>As respostas ficam ocultas até você liberar.</small>
            </button>
            <button
              type="button"
              className={liveReveal ? styles.modeActive : styles.mode}
              onClick={() => setLiveReveal(true)}
            >
              <b>Ao vivo</b>
              <small>A frequência aparece conforme a turma responde.</small>
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={busy || !prompt.trim()}
            onClick={() => void create()}
          >
            {busy ? "Criando..." : "Abrir Nuvem de Palavras"}
          </button>
        </div>
      </section>
    );
  }

  if (!round) return null;

  return (
    <section className={styles.shell}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>NUVEM DE PALAVRAS</span>
          <h3>{round.prompt}</h3>
          <p>{round.liveReveal ? "Exibição ao vivo" : "Coleta protegida até a revelação"}</p>
        </div>
        <span className={`${styles.status} ${styles[round.status.toLowerCase()]}`}>
          {statusLabel(round.status)}
        </span>
      </div>

      <div className={styles.stats}>
        <div><strong>{round.participantCount}</strong><span>participantes</span></div>
        <div><strong>{round.submissionCount}</strong><span>respostas</span></div>
        <div><strong>{round.maxWordsPerParticipant}</strong><span>máx. por aluno</span></div>
      </div>

      {round.terms.length > 0 ? (
        <div className={styles.preview}>
          {round.terms.slice(0, 24).map((term) => (
            <span
              key={term.normalizedText}
              style={{ fontSize: `${Math.min(34, 15 + term.count * 4)}px` }}
            >
              {term.text}<b>×{term.count}</b>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {round.status === "COLLECTING" && !round.liveReveal
            ? `As respostas estão chegando, mas permanecem ocultas. ${round.submissionCount} recebida(s).`
            : round.status === "COLLECTING"
              ? "Aguardando as primeiras respostas da turma."
              : "Nenhuma resposta foi registrada nesta rodada."}
        </div>
      )}

      <div className={styles.actions}>
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
  );
}
