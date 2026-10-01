"use client";

import type { Student } from "@/lib/types";
import { ArenaGlyph } from "@/components/arena/live/ArenaLiveChrome";
import type { ParticipantSelectionPhase } from "./selection.types";
import styles from "./ParticipantSelectionExperience.module.css";

type ParticipantSelectionExperienceProps = {
  students: Student[];
  presentStudentIds: string[];
  drawCounts: Record<string, number>;
  selectedStudentId?: string;
  phase: ParticipantSelectionPhase;
  onDraw: () => void;
  onConfirm: () => void;
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
  onConfirm,
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

  return (
    <section className={styles.experience} aria-label="Seleção de participante" data-testid="participant-selection-experience">
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden="true">
            <ArenaGlyph name="draw" />
          </span>
          <div>
            <span className={styles.eyebrow}>DINÂMICA AO VIVO</span>
            <h2>Sorteio da turma</h2>
            <p>Seleção equilibrada entre os participantes presentes.</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div
            className={styles.progress}
            aria-label={`${drawnIds.size} de ${presentStudentIds.length} participantes já sorteados`}
          >
            <strong>{drawnIds.size} de {presentStudentIds.length}</strong>
            <span>já sorteados</span>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            type="button"
            className={styles.settings}
            onClick={onOpenSettings}
          >
            ⚙ Ajustes
          </button>
          <button
            type="button"
            className={styles.drawButton}
            onClick={onDraw}
            disabled={phase === "selecting" || presentStudentIds.length === 0}
          >
            {phase === "selecting" ? "Selecionando..." : "Sortear participante"}
          </button>
        </div>
      </header>

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
                    <span className={styles.presenceDot} aria-label="Presente" />
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

      {phase === "revealed" && selected && (
        <div className={styles.spotlightLayer} role="dialog" aria-modal="false" aria-labelledby="spotlight-participant-name" data-testid="spotlight-reveal">
          <div className={styles.spotlightCard}>
            <span className={styles.spotlightEyebrow}>PARTICIPANTE SELECIONADO</span>
            <div className={styles.spotlightAvatar}>{initials(selected.name)}</div>
            <h3 id="spotlight-participant-name">{participantLabel(selected)}</h3>
            {selected.nickname && selected.nickname !== selected.name && (
              <p>{selected.name}</p>
            )}
            <span className={styles.spotlightMeta}>
              Participações nesta sessão: {drawCounts[selected.id] ?? 0}
            </span>
            <div className={styles.spotlightActions}>
              <button type="button" className={styles.confirmButton} onClick={onConfirm} autoFocus>
                Continuar para pontuação
              </button>
              <small className={styles.scoringHint}>
                A pontuação é opcional e permanece separada do sorteio.
              </small>
            </div>
          </div>
          <div className={styles.liveAnnouncement} aria-live="assertive">
            {participantLabel(selected)} foi selecionado.
          </div>
        </div>
      )}
    </section>
  );
}
