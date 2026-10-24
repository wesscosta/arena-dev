"use client";

import { useEffect, useState } from "react";
import { countdownSeconds, formatRemaining } from "@/lib/activity-deadline";

/** UI indicator only. Deadline enforcement and finalization are server-authoritative. */
export default function ParticipantDeadlineTimer({
  deadlineAt, serverNow, onExpire,
}: { deadlineAt: string; serverNow: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => countdownSeconds(deadlineAt, serverNow, 0));
  useEffect(() => {
    const origin = performance.now();
    let notified = false;
    function update() {
      const next = countdownSeconds(deadlineAt, serverNow, performance.now() - origin);
      setRemaining(next);
      if (next === 0 && !notified) {
        notified = true;
        onExpire();
      }
    }
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineAt, serverNow, onExpire]);
  return <span role="timer" aria-label="Tempo restante da atividade" title="O prazo é calculado pelo servidor; atualizar a página não reinicia a tentativa.">
    {remaining === 0 ? "Tempo encerrado" : "Tempo restante: " + formatRemaining(remaining)}
  </span>;
}
