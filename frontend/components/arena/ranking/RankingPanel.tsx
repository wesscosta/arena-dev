"use client";

import { useMemo, useState } from "react";
import type {
  RankingLimit,
  RankingPresentationInput,
  SessionRankingState,
} from "@/lib/ranking-api";
import styles from "./RankingPanel.module.css";

type Props = {
  state: SessionRankingState | null;
  busy?: boolean;
  onPresentationChange: (input: RankingPresentationInput) => Promise<void> | void;
};

function pointsLabel(value: number) {
  return `${value} ${Math.abs(value) === 1 ? "pt" : "pts"}`;
}

export default function RankingPanel({
  state,
  busy = false,
  onPresentationChange,
}: Props) {
  const [draftViewMode, setDraftViewMode] = useState<RankingLimit | null>(null);
  const [draftAnonymized, setDraftAnonymized] = useState<boolean | null>(null);
  const viewMode = draftViewMode ?? state?.presentation.limit ?? "TOP_5";
  const anonymized = draftAnonymized ?? state?.presentation.anonymized ?? true;

  const visibleEntries = useMemo(() => {
    if (!state) return [];
    if (viewMode === "ALL") return state.entries;
    return state.entries.filter((entry) => entry.hasScoreEvents).slice(0, 5);
  }, [state, viewMode]);

  const projected = Boolean(state?.presentation.visible);
  const canProject = Boolean(state?.hasScoreEvents);

  async function publish() {
    await onPresentationChange({
      visible: true,
      anonymized,
      limit: viewMode,
    });
    setDraftViewMode(null);
    setDraftAnonymized(null);
  }

  return (
    <div className={styles.panel} data-testid="arena-session-ranking">
      <div className={styles.summary}>
        <div>
          <span className={styles.kicker}>PONTUAÇÃO DA SESSÃO</span>
          <strong>
            {state?.hasScoreEvents
              ? `${state.scoredParticipantCount} participante(s) pontuado(s)`
              : "Ainda sem pontuação"}
          </strong>
          <small>O ranking soma o XP desta aula (participação e acertos registrados), não mede domínio de aprendizagem. No projetor aparecem só participantes já pontuados.</small>
        </div>
        <span
          className={projected ? styles.publicStatus : styles.privateStatus}
          aria-label={projected ? "Ranking visível no projetor" : "Ranking privado"}
        >
          {projected ? "NO PROJETOR" : "PRIVADO"}
        </span>
      </div>

      <div className={styles.controls}>
        <div className={styles.segmented} aria-label="Quantidade de posições exibidas">
          <button
            type="button"
            className={viewMode === "TOP_5" ? styles.active : undefined}
            aria-pressed={viewMode === "TOP_5"}
            onClick={() => setDraftViewMode("TOP_5")}
          >
            Top 5
          </button>
          <button
            type="button"
            className={viewMode === "ALL" ? styles.active : undefined}
            aria-pressed={viewMode === "ALL"}
            onClick={() => setDraftViewMode("ALL")}
          >
            Todos
          </button>
        </div>

        <label className={styles.privacy}>
          <input
            type="checkbox"
            checked={anonymized}
            onChange={(event) => setDraftAnonymized(event.target.checked)}
          />
          <span>
            <strong>Ocultar nomes no projetor</strong>
            <small>O professor continua vendo a identificação completa.</small>
          </span>
        </label>
      </div>

      <section className={styles.listSection} aria-labelledby="session-ranking-heading">
        <div className={styles.listHead}>
          <div>
            <h3 id="session-ranking-heading">
              {viewMode === "TOP_5" ? "Top 5 da sessão" : "Todos os participantes"}
            </h3>
            <p>Empates compartilham a mesma colocação.</p>
          </div>
          <span>{visibleEntries.length} exibido(s)</span>
        </div>

        {visibleEntries.length > 0 ? (
          <ol className={styles.list}>
            {visibleEntries.map((entry) => (
              <li key={entry.studentId} className={styles.row}>
                <span className={styles.position} aria-label={`Posição ${entry.position}`}>
                  #{entry.position}
                </span>
                <div className={styles.person}>
                  <strong title={entry.fullName}>{entry.fullName}</strong>
                </div>
                <strong className={styles.score}>{pointsLabel(entry.score)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            <strong>Ainda não há pontuação nesta sessão.</strong>
            <p>O ranking será formado quando os pontos forem registrados nas dinâmicas da Arena.</p>
          </div>
        )}
      </section>

      <div className={styles.actions}>
        {projected ? (
          <>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => void onPresentationChange({ visible: false })}
            >
              {busy ? "Atualizando..." : "Ocultar do projetor"}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || !canProject}
              onClick={() => void publish()}
            >
              {busy ? "Atualizando..." : "Atualizar projetor"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !canProject}
            onClick={() => void publish()}
          >
            {busy ? "Exibindo..." : "Exibir no projetor"}
          </button>
        )}
      </div>

      {projected ? (
        <p className={styles.statusNote} role="status">
          O projetor está exibindo {state?.presentation.limit === "TOP_5" ? "o Top 5" : "todos"}
          {state?.presentation.anonymized ? " com nomes ocultos." : " com nomes visíveis."}
        </p>
      ) : null}
    </div>
  );
}
