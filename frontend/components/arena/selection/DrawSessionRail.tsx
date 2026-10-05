"use client";

import type { Student } from "@/lib/types";
import styles from "./DrawSessionRail.module.css";

export type DrawHistoryItem = {
  id: string;
  studentId: string;
  occurredAt: string;
};

export default function DrawSessionRail({
  students,
  presentCount,
  totalCount,
  drawnCount,
  history,
  onOpenAttendance,
}: {
  students: Student[];
  presentCount: number;
  totalCount: number;
  drawnCount: number;
  history: DrawHistoryItem[];
  onOpenAttendance: () => void;
}) {
  return (
    <section className={styles.card} aria-label="Resumo do sorteio" data-testid="draw-session-rail">
      <header className={styles.header}>
        <div>
          <span>SESSÃO</span>
          <strong>Resumo do sorteio</strong>
        </div>
        <button type="button" onClick={onOpenAttendance}>Presença</button>
      </header>

      <div className={styles.metrics}>
        <div>
          <strong>{presentCount}</strong>
          <span>presentes</span>
        </div>
        <div>
          <strong>{drawnCount}</strong>
          <span>já sorteados</span>
        </div>
        <div>
          <strong>{totalCount}</strong>
          <span>na turma</span>
        </div>
      </div>

      <div className={styles.history}>
        <div className={styles.historyTitle}>
          <strong>Últimos sorteados</strong>
          <span>{history.length ? `${Math.min(history.length, 6)} recentes` : "sem histórico"}</span>
        </div>

        <div className={styles.historyList}>
          {history.length === 0 ? (
            <div className={styles.empty}>
              <strong>Nenhum sorteio ainda</strong>
              <span>O histórico da sessão aparecerá aqui.</span>
            </div>
          ) : (
            history.slice(0, 6).map((item, index) => {
              const student = students.find((candidate) => candidate.id === item.studentId);
              const displayName = student?.nickname?.trim() || student?.name || "Aluno";
              return (
                <div className={styles.historyRow} key={item.id}>
                  <span className={styles.sequence}>{index + 1}</span>
                  <div>
                    <strong title={student?.name}>{displayName}</strong>
                    <span>{new Date(item.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
