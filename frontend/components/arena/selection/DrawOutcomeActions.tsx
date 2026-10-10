"use client";

import { useState } from "react";
import styles from "./DrawOutcomeActions.module.css";

/** A draw always records an outcome. XP is an explicit optional part of CONFIRMED. */
export default function DrawOutcomeActions({
  busy,
  onResolve,
}: {
  busy: boolean;
  onResolve: (outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) => void;
}) {
  const [awardXp, setAwardXp] = useState(false);
  const [points, setPoints] = useState(5);
  const validPoints = Number.isInteger(points) && points >= 1 && points <= 100;

  return (
    <div className={styles.actions} role="group" aria-label="Registrar desfecho do sorteio">
      <div className={styles.scoreChoice}>
        <label className={styles.xpToggle}>
          <input
            type="checkbox"
            checked={awardXp}
            disabled={busy}
            onChange={(event) => setAwardXp(event.target.checked)}
            data-testid="draw-award-xp"
          />
          <span className={styles.xpCopy}>
            <strong>Conceder XP</strong>
            <small>{awardXp ? "Pontuação intencional nesta chamada" : "Desativado · confirmar não gera XP"}</small>
          </span>
        </label>
        {awardXp && (
          <label className={styles.xpAmount}>
            <span>Quantidade de XP</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              value={Number.isFinite(points) ? points : ""}
              disabled={busy}
              onChange={(event) => setPoints(event.target.value === "" ? NaN : Number(event.target.value))}
              aria-invalid={!validPoints}
              data-testid="draw-xp-points"
            />
          </label>
        )}
      </div>

      <button
        type="button"
        data-testid="draw-confirm-outcome"
        disabled={busy || (awardXp && !validPoints)}
        className={styles.primary}
        onClick={() => onResolve("CONFIRMED", awardXp ? points : undefined)}
      >
        {awardXp ? `Confirmar +${validPoints ? points : "?"} XP` : "Confirmar sem XP"}
      </button>

      <div className={styles.alternativeActions} role="group" aria-label="Outros desfechos">
        <div className={styles.alternative}>
          <button type="button" disabled={busy} onClick={() => onResolve("PASSED")}>
            Passar a vez
          </button>
          <small>Conta como chamado nesta rodada.</small>
        </div>
        <div className={styles.alternative}>
          <button type="button" disabled={busy} className={styles.void} onClick={() => onResolve("VOIDED")}>
            Anular sorteio
          </button>
          <small>Desfaz a chamada; poderá ser sorteado novamente.</small>
        </div>
      </div>
    </div>
  );
}
