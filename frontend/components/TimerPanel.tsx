"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cancelTimer,
  createTimer,
  extendTimer,
  fetchTimerState,
  finishTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  type SessionTimer,
  type TimerState,
} from "@/lib/timer-api";
import {
  effectiveTimerStatus,
  formatTimer,
  splitTimerDuration,
  TIMER_PRESETS,
  timerDurationFromParts,
  timerRemainingSeconds,
  timerStatusLabel,
} from "@/lib/timer-clock";

type Props = {
  sessionId: string;
  state: TimerState;
  onStateChange: (state: TimerState) => void;
  notify: (message: string) => void;
};

type DurationPart = "hours" | "minutes" | "seconds";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação do Timer.";
}

export default function TimerPanel({ sessionId, state, onStateChange, notify }: Props) {
  const [title, setTitle] = useState("Atividade cronometrada");
  const [instructions, setInstructions] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(600);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [focusOpen, setFocusOpen] = useState(false);
  const [openFocusOnStart, setOpenFocusOnStart] = useState(true);
  const [alerts, setAlerts] = useState({ five: true, one: true, end: true });
  const previousRemaining = useRef<number | null>(null);

  const timer = state.timer;
  const remaining = useMemo(
    () => timerRemainingSeconds(state, nowMs),
    [state, nowMs],
  );
  const effectiveStatus = timer
    ? effectiveTimerStatus(timer, remaining)
    : undefined;
  const durationParts = useMemo(
    () => splitTimerDuration(durationSeconds),
    [durationSeconds],
  );
  const progress = timer?.durationSeconds
    ? Math.max(0, Math.min(100, (remaining / timer.durationSeconds) * 100))
    : 0;

  useEffect(() => {
    let active = true;
    void fetchTimerState(sessionId)
      .then((next) => {
        if (active) onStateChange(next);
      })
      .catch((error) => {
        if (active) notify(message(error));
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    setNowMs(Date.now());
    previousRemaining.current = null;
  }, [timer?.id]);

  useEffect(() => {
    if (timer?.status !== "RUNNING") return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timer?.id, timer?.status]);

  useEffect(() => {
    if (!focusOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [focusOpen]);

  useEffect(() => {
    if (!timer || timer.status !== "RUNNING") {
      previousRemaining.current = remaining;
      return;
    }

    const previous = previousRemaining.current;
    if (previous !== null) {
      if (
        alerts.five &&
        timer.durationSeconds > 300 &&
        previous > 300 &&
        remaining <= 300
      ) {
        notify("Timer: faltam 5 minutos.");
      }
      if (
        alerts.one &&
        timer.durationSeconds > 60 &&
        previous > 60 &&
        remaining <= 60
      ) {
        notify("Timer: falta 1 minuto.");
      }
      if (alerts.end && previous > 0 && remaining <= 0) {
        notify("Timer encerrado.");
      }
    }

    previousRemaining.current = remaining;
  }, [
    alerts.end,
    alerts.five,
    alerts.one,
    notify,
    remaining,
    timer?.durationSeconds,
    timer?.id,
    timer?.status,
  ]);

  async function execute(
    action: () => Promise<SessionTimer>,
    options: { openFocus?: boolean; closeFocus?: boolean } = {},
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await action();
      onStateChange({ ...state, timer: next });
      setNowMs(Date.now());
      if (options.openFocus) setFocusOpen(true);
      if (options.closeFocus) setFocusOpen(false);
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function prepareTimer() {
    if (busy || durationSeconds < 1) return;
    setBusy(true);
    try {
      const created = await createTimer(sessionId, {
        title: title.trim() || "Atividade cronometrada",
        instructions: instructions.trim() || undefined,
        durationSeconds,
      });
      onStateChange({ ...state, timer: created });
      setNowMs(Date.now());
      notify(`Timer de ${formatTimer(durationSeconds)} preparado.`);
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function createAndStartTimer() {
    if (busy || durationSeconds < 1) return;
    setBusy(true);
    try {
      const created = await createTimer(sessionId, {
        title: title.trim() || "Atividade cronometrada",
        instructions: instructions.trim() || undefined,
        durationSeconds,
      });
      const running = await startTimer(sessionId, created.id);
      onStateChange({ ...state, timer: running });
      setNowMs(Date.now());
      if (openFocusOnStart) setFocusOpen(true);
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
    }
  }

  function choosePreset(seconds: number) {
    setDurationSeconds(seconds);
  }

  function updateDurationPart(part: DurationPart, value: number) {
    setDurationSeconds(
      timerDurationFromParts({
        ...durationParts,
        [part]: Number.isFinite(value) ? value : 0,
      }),
    );
  }

  function renderTimerControls(inFocus = false) {
    if (!timer) return null;

    return (
      <div className={inFocus ? "timer-focus-controls" : "timer-action-row"}>
        {timer.status === "READY" && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void execute(() => startTimer(sessionId, timer.id), {
                openFocus: openFocusOnStart,
              })
            }
          >
            Iniciar
          </button>
        )}

        {timer.status === "RUNNING" && remaining > 0 && (
          <button
            className="button"
            disabled={busy}
            onClick={() => void execute(() => pauseTimer(sessionId, timer.id))}
          >
            Pausar
          </button>
        )}

        {timer.status === "PAUSED" && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void execute(() => resumeTimer(sessionId, timer.id))}
          >
            Retomar
          </button>
        )}

        {(timer.status === "RUNNING" || timer.status === "PAUSED") && remaining > 0 && (
          <>
            <button
              className="button ghost"
              disabled={busy}
              onClick={() => void execute(() => extendTimer(sessionId, timer.id, 30))}
            >
              +30 s
            </button>
            <button
              className="button ghost"
              disabled={busy}
              onClick={() => void execute(() => extendTimer(sessionId, timer.id, 60))}
            >
              +1 min
            </button>
            <button
              className="button ghost"
              disabled={busy}
              onClick={() => void execute(() => extendTimer(sessionId, timer.id, 300))}
            >
              +5 min
            </button>
            <button
              className="button danger-outline"
              disabled={busy}
              onClick={() =>
                void execute(() => finishTimer(sessionId, timer.id), {
                  closeFocus: inFocus,
                })
              }
            >
              Finalizar
            </button>
          </>
        )}

        {(timer.status === "READY" || timer.status === "PAUSED") && !inFocus && (
          <button
            className="button danger-outline"
            disabled={busy}
            onClick={() => void execute(() => cancelTimer(sessionId, timer.id))}
          >
            Cancelar
          </button>
        )}

        {inFocus && (effectiveStatus === "FINISHED" || effectiveStatus === "CANCELLED") && (
          <button className="button primary" onClick={() => setFocusOpen(false)}>
            Fechar
          </button>
        )}
      </div>
    );
  }

  const showCreate =
    !timer ||
    effectiveStatus === "FINISHED" ||
    effectiveStatus === "CANCELLED";

  return (
    <div className="stack-lg arena-tab-content timer-workspace">
      {timer && (
        <section className="timer-active-card">
          <div className="timer-active-toolbar">
            <div>
              <span className="eyebrow accent">CONTROLE DE TEMPO</span>
              <strong>{timer.title}</strong>
            </div>
            <button
              type="button"
              className="button ghost timer-focus-launch"
              onClick={() => setFocusOpen(true)}
            >
              ⛶ Tela cheia
            </button>
          </div>

          <div className="timer-active-display">
            <span className="live-pill">
              <span />
              {effectiveStatus ? timerStatusLabel(effectiveStatus) : "Pronto"}
            </span>
            <strong aria-label={`Tempo restante ${formatTimer(remaining)}`}>
              {formatTimer(remaining)}
            </strong>
            {timer.instructions && <p>{timer.instructions}</p>}
          </div>

          <div className="timer-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>

          {renderTimerControls()}
        </section>
      )}

      {showCreate && (
        <section className="timer-setup-card">
          <div className="timer-setup-heading">
            <div>
              <span className="eyebrow accent">NOVO TEMPORIZADOR</span>
              <h3>{timer ? "Preparar o próximo tempo" : "Defina o tempo da atividade"}</h3>
              <p>
                Configure horas, minutos e segundos ou escolha um atalho. O Timer continua
                vinculado à sessão atual.
              </p>
            </div>
            <div className="timer-selected-duration">
              <small>DURAÇÃO</small>
              <strong>{formatTimer(durationSeconds)}</strong>
            </div>
          </div>

          <div className="timer-setup-grid">
            <div className="timer-duration-box">
              <span className="field-label">Contagem regressiva</span>
              <div className="timer-duration-editor" aria-label="Duração do temporizador">
                <DurationSegment
                  label="Horas"
                  value={durationParts.hours}
                  max={24}
                  onChange={(value) => updateDurationPart("hours", value)}
                  onDecrease={() => updateDurationPart("hours", durationParts.hours - 1)}
                  onIncrease={() => updateDurationPart("hours", durationParts.hours + 1)}
                />
                <span className="timer-duration-colon">:</span>
                <DurationSegment
                  label="Minutos"
                  value={durationParts.minutes}
                  max={59}
                  onChange={(value) => updateDurationPart("minutes", value)}
                  onDecrease={() => updateDurationPart("minutes", durationParts.minutes - 1)}
                  onIncrease={() => updateDurationPart("minutes", durationParts.minutes + 1)}
                />
                <span className="timer-duration-colon">:</span>
                <DurationSegment
                  label="Segundos"
                  value={durationParts.seconds}
                  max={59}
                  onChange={(value) => updateDurationPart("seconds", value)}
                  onDecrease={() => updateDurationPart("seconds", durationParts.seconds - 1)}
                  onIncrease={() => updateDurationPart("seconds", durationParts.seconds + 1)}
                />
              </div>

              <div className="timer-preset-chips" aria-label="Atalhos de duração">
                {TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.seconds}
                    type="button"
                    className={durationSeconds === preset.seconds ? "active" : ""}
                    onClick={() => choosePreset(preset.seconds)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="timer-details-box">
              <label className="field">
                <span>Título</span>
                <input
                  className="input"
                  value={title}
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Pesquisa OSI × TCP/IP"
                />
              </label>

              <label className="field">
                <span>Instruções opcionais</span>
                <textarea
                  className="textarea"
                  value={instructions}
                  maxLength={500}
                  rows={4}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Ex.: Pesquisem e preparem uma síntese para apresentação."
                />
              </label>

              <label className="timer-option-row">
                <input
                  type="checkbox"
                  checked={openFocusOnStart}
                  onChange={(event) => setOpenFocusOnStart(event.target.checked)}
                />
                <div>
                  <strong>Abrir em tela cheia ao iniciar</strong>
                  <small>O professor pode minimizar sem interromper o Timer.</small>
                </div>
              </label>
            </div>
          </div>

          <div className="timer-setup-actions">
            <button
              className="button ghost"
              disabled={busy || durationSeconds < 1}
              onClick={() => void prepareTimer()}
            >
              Apenas preparar
            </button>
            <button
              className="button primary large"
              disabled={busy || durationSeconds < 1}
              onClick={() => void createAndStartTimer()}
            >
              {busy ? "Iniciando..." : "Iniciar agora"}
            </button>
          </div>
        </section>
      )}

      <details className="timer-settings-panel">
        <summary>
          <div>
            <strong>Alertas locais</strong>
            <span>5 min · 1 min · encerramento</span>
          </div>
          <span>Configurar</span>
        </summary>
        <div className="timer-settings-content">
          <label className="timer-option-row">
            <input
              type="checkbox"
              checked={alerts.five}
              onChange={(event) =>
                setAlerts((current) => ({ ...current, five: event.target.checked }))
              }
            />
            <span>Avisar quando faltarem 5 minutos</span>
          </label>
          <label className="timer-option-row">
            <input
              type="checkbox"
              checked={alerts.one}
              onChange={(event) =>
                setAlerts((current) => ({ ...current, one: event.target.checked }))
              }
            />
            <span>Avisar quando faltar 1 minuto</span>
          </label>
          <label className="timer-option-row">
            <input
              type="checkbox"
              checked={alerts.end}
              onChange={(event) =>
                setAlerts((current) => ({ ...current, end: event.target.checked }))
              }
            />
            <span>Avisar ao encerrar</span>
          </label>
        </div>
      </details>

      {focusOpen && timer && (
        <div
          className="timer-focus-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Temporizador ${timer.title}`}
        >
          <header className="timer-focus-header">
            <div>
              <span className="brand-mark">A</span>
              <div>
                <strong>ARENA DEV</strong>
                <small>Tempo da atividade</small>
              </div>
            </div>
            <button
              type="button"
              className="button ghost"
              onClick={() => setFocusOpen(false)}
              aria-label="Minimizar temporizador"
            >
              Minimizar ×
            </button>
          </header>

          <main className="timer-focus-main">
            <span className="live-pill">
              <span />
              {effectiveStatus ? timerStatusLabel(effectiveStatus) : "Pronto"}
            </span>
            <div className="timer-focus-time">{formatTimer(remaining)}</div>
            <h2>{timer.title}</h2>
            {timer.instructions && <p>{timer.instructions}</p>}
            <div className="timer-focus-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </main>

          <footer className="timer-focus-footer">
            {renderTimerControls(true)}
            <small>ESC minimiza a tela sem interromper a contagem.</small>
          </footer>
        </div>
      )}
    </div>
  );
}

function DurationSegment({
  label,
  value,
  max,
  onChange,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <label className="timer-duration-segment">
      <span>{label}</span>
      <div>
        <button type="button" onClick={onDecrease} aria-label={`Diminuir ${label.toLowerCase()}`}>
          −
        </button>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
        <button type="button" onClick={onIncrease} aria-label={`Aumentar ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </label>
  );
}
