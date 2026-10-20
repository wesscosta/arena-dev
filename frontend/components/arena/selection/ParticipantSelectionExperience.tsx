"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Student } from "@/lib/types";
import type { ParticipantSelectionPhase } from "./selection.types";
import styles from "./ParticipantSelectionExperience.module.css";
import DynamicHeader from "@/components/arena/dynamics/DynamicHeader";
import DrawOutcomeActions from "./DrawOutcomeActions";

type ParticipantSelectionExperienceProps = {
  students: Student[];
  presentStudentIds: string[];
  drawCounts: Record<string, number>;
  selectedStudentId?: string;
  phase: ParticipantSelectionPhase;
  onDraw: () => void;
  onResolve: (outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) => void;
  busy: boolean;
  canStartNextRound: boolean;
  onNextRound: () => void;
  onOpenSettings: () => void;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function participantLabel(student: Student) {
  return student.nickname?.trim() || student.name;
}

export default function ParticipantSelectionExperience({
  students,
  presentStudentIds,
  drawCounts,
  selectedStudentId,
  phase,
  onDraw,
  onResolve,
  busy,
  canStartNextRound,
  onNextRound,
  onOpenSettings,
}: ParticipantSelectionExperienceProps) {
  const presentSet = new Set(presentStudentIds);
  const selected = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId)
    : undefined;
  const drawnIds = new Set(
    Object.entries(drawCounts)
      .filter(([studentId, count]) => count > 0 && presentSet.has(studentId))
      .map(([studentId]) => studentId),
  );
  const presentStudents = students.filter((student) => presentSet.has(student.id));
  const absentStudents = students.filter((student) => !presentSet.has(student.id));
  const gridStudents = [...presentStudents, ...absentStudents];
  const progress = presentStudentIds.length
    ? Math.round((drawnIds.size / presentStudentIds.length) * 100)
    : 0;
  const drawButtonRef = useRef<HTMLButtonElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const previousPhaseRef = useRef<ParticipantSelectionPhase>(phase);
  // After the Spotlight resolves, focus returns to the draw command. The command
  // may still be disabled while the result is saved (slow networks), and a
  // disabled button cannot take focus, so the return waits until it is enabled.
  const focusReturnPendingRef = useRef(false);
  const drawDisabled = busy || phase === "revealed" || presentStudentIds.length === 0;

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase === "revealed" && selectedStudentId) {
      focusReturnPendingRef.current = false;
      window.requestAnimationFrame(() => {
        spotlightRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    if (previousPhase === "revealed" && phase === "ready") {
      focusReturnPendingRef.current = true;
    }
  }, [phase, selectedStudentId]);

  useEffect(() => {
    if (!focusReturnPendingRef.current || drawDisabled) return;
    const frame = window.requestAnimationFrame(() => {
      const button = drawButtonRef.current;
      if (!button || button.disabled) return;
      focusReturnPendingRef.current = false;
      button.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, drawDisabled]);

  useEffect(() => {
    if (phase !== "revealed" || !selectedStudentId) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const card = spotlightRef.current;
      if (!card) return;
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ));
      if (!focusable.length) {
        event.preventDefault();
        card.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!card.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", handleKeys);
    };
  }, [phase, selectedStudentId]);

  return (
    <section
      className={styles.experience}
      aria-label="Seleção de participante"
      aria-busy={phase === "selecting"}
      data-phase={phase}
      data-testid="participant-selection-experience"
    >
      <DynamicHeader dynamic="draw"
        title="Sorteio da turma"
        description="Seleção equilibrada entre os participantes presentes."
        status={phase === "selecting" ? "SORTEANDO" : phase === "revealed" ? "RESULTADO" : undefined}
        summary={(
          <div className={styles.progress} aria-label={`${drawnIds.size} de ${presentStudentIds.length} participantes já sorteados`}>
            <strong>{drawnIds.size} de {presentStudentIds.length} já sorteados</strong>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        secondaryActions={(
          <button type="button" className={styles.settings} onClick={onOpenSettings}>
            ⚙ Ajustes
          </button>
        )}
        primaryAction={canStartNextRound ? (
          <button type="button" className={styles.drawButton} disabled={busy} onClick={onNextRound}>
            Iniciar próxima rodada
          </button>
        ) : (
          <button
            ref={drawButtonRef}
            type="button"
            className={styles.drawButton}
            onClick={onDraw}
            disabled={drawDisabled}
          >
            {phase === "selecting" ? "Selecionando..." : "Sortear participante"}
          </button>
        )}
      />

      <div className={styles.gridViewport} data-testid="participant-grid-viewport">
        {gridStudents.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Nenhum participante disponível</strong>
            <span>Adicione alunos à turma e marque a presença para iniciar o sorteio.</span>
          </div>
        ) : (
          <div className={styles.grid} aria-label="Participantes da turma" data-testid="participant-grid">
            {gridStudents.map((student) => {
              const present = presentSet.has(student.id);
              const selectedNow = selectedStudentId === student.id && phase === "revealed";
              const drawn = drawnIds.has(student.id);
              const status = selectedNow
                ? "selected"
                : !present
                  ? "absent"
                  : drawn
                    ? "drawn"
                    : "available";
              const drawCount = drawCounts[student.id] ?? 0;

              return (
                <article
                  key={student.id}
                  className={styles.card}
                  data-status={status}
                  data-testid="participant-card"
                  aria-label={`${participantLabel(student)}: ${
                    selectedNow
                      ? "selecionado agora"
                      : !present
                        ? "ausente"
                        : drawn
                          ? `já sorteado ${drawCount} vez${drawCount === 1 ? "" : "es"}`
                          : "disponível"
                  }`}
                >
                  <div className={styles.avatar}>{initials(student.name)}</div>
                  <div className={styles.cardCopy}>
                    <strong title={student.name}>{participantLabel(student)}</strong>
                    <span>
                      {selectedNow
                        ? "Selecionado agora"
                        : !present
                          ? "Ausente"
                          : drawn
                            ? `✓ Já sorteado${drawCount > 1 ? ` · ${drawCount}x` : ""}`
                            : "Disponível"}
                    </span>
                  </div>
                  {present && !selectedNow && (
                    <span className={styles.presenceDot} aria-hidden="true" />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {phase === "selecting" && (
        <div className={styles.selectingLayer} role="status" aria-live="polite" data-testid="selection-progress">
          <span className={styles.selectingPulse} aria-hidden="true" />
          <strong>Selecionando participante...</strong>
          <small>Aplicando o balanceamento da sessão</small>
        </div>
      )}

      {phase === "revealed" && selected && typeof document !== "undefined" && createPortal(
        <div
          className={styles.spotlightLayer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotlight-participant-name"
          aria-describedby="spotlight-participant-guidance"
          data-testid="spotlight-reveal"
        >
          <div
            className={styles.spotlightCard}
            ref={spotlightRef}
            tabIndex={-1}
            data-testid="spotlight-card"
          >
            <span className={styles.spotlightEyebrow}>PARTICIPANTE SELECIONADO</span>
            <div className={styles.spotlightAvatar}>{initials(selected.name)}</div>
            <h3 id="spotlight-participant-name">{participantLabel(selected)}</h3>
            {selected.nickname && selected.nickname !== selected.name && (
              <p>{selected.name}</p>
            )}
            <p id="spotlight-participant-guidance" className={styles.spotlightGuidance}>
              Registre o resultado desta chamada.
            </p>
            <div className={styles.spotlightActions}>
              <DrawOutcomeActions busy={busy} onResolve={onResolve} />
            </div>
          </div>
          <div className={styles.liveAnnouncement} aria-live="assertive">
            {participantLabel(selected)} foi selecionado.
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
