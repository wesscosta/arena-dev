"use client";

import { useState } from "react";
import styles from "./DrawOutcomeActions.module.css";

export default function DrawOutcomeActions({
  busy,
  onResolve,
}: {
  busy: boolean;
  onResolve: (outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) => void;
}) {
  const [points, setPoints] = useState(5);
  return (
    <div className={styles.actions} role="group" aria-label="Registrar desfecho do sorteio">
      <button
        type="button"
        disabled={busy}
        className={styles.primary}
        onClick={() => onResolve("CONFIRMED")}
      >
        Confirmar participação
      </button>
      <div className={styles.scoreRow}>
        <label>
          XP{" "}
          <input
            type="number"
            min={1}
            max={100}
            value={points}
            disabled={busy}
            onChange={(event) => setPoints(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          disabled={busy || !Number.isInteger(points) || points < 1 || points > 100}
          onClick={() => onResolve("CONFIRMED", points)}
        >
          Confirmar e pontuar
        </button>
      </div>
      <div className={styles.secondaryRow}>
        <button type="button" disabled={busy} onClick={() => onResolve("PASSED")}>
          Passar a vez
        </button>
        <button type="button" disabled={busy} onClick={() => onResolve("VOIDED")}>
          Anular sorteio
        </button>
      </div>
      <small>O sorteio não concede XP automaticamente. O professor registra o desfecho.</small>
    </div>
  );
}
