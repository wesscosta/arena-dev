"use client";

import { useMemo, useState } from "react";
import DrawSessionRail from "@/components/arena/selection/DrawSessionRail";
import type { ParticipantSelectorMode } from "@/components/arena/selection/selection.types";
import { joinQrImageUrl, type JoinCode } from "@/lib/realtime-api";
import type { SessionParticipant, Student } from "@/lib/types";
import type { ArenaDynamic } from "./ArenaLiveChrome";

type DrawHistoryItem = {
  id: string;
  studentId: string;
  occurredAt: string;
};

type ArenaContextRailProps = {
  activeDynamic: ArenaDynamic;
  selectorMode: ParticipantSelectorMode;
  students: Student[];
  presentStudentIds: string[];
  sessionParticipants: SessionParticipant[];
  drawnCount: number;
  drawHistory: DrawHistoryItem[];
  sessionId: string;
  joinCode: JoinCode | null;
  publicBaseUrl: string;
  onOpenAttendance: () => void;
  onCopySessionCode: () => void;
  onOpenQr: () => void;
};

function ParticipantAvatar({ student }: { student: Student }) {
  const initials = student.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return <div className="avatar">{initials}</div>;
}

export default function ArenaContextRail({
  activeDynamic,
  selectorMode,
  students,
  presentStudentIds,
  sessionParticipants,
  drawnCount,
  drawHistory,
  sessionId,
  joinCode,
  publicBaseUrl,
  onOpenAttendance,
  onCopySessionCode,
  onOpenQr,
}: ArenaContextRailProps) {
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState<"present" | "all">("present");

  const visibleParticipants = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase("pt-BR");
    return sessionParticipants.filter((participant) => {
      if (participantFilter === "present" && !participant.present) return false;
      if (!query) return true;
      const student = students.find((item) => item.id === participant.studentId);
      const searchable = [
        student?.name,
        student?.nickname,
        participant.displayName,
        participant.preferredName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return searchable.includes(query);
    });
  }, [participantFilter, participantSearch, sessionParticipants, students]);

  return (
    <aside className="arena-context-rail" aria-label="Contexto da sessão">
      {activeDynamic === "draw" && selectorMode === "grid-spotlight" ? (
        <DrawSessionRail
          students={students}
          presentCount={presentStudentIds.length}
          totalCount={sessionParticipants.length}
          drawnCount={drawnCount}
          history={drawHistory}
          onOpenAttendance={onOpenAttendance}
        />
      ) : (
        <section className="arena-participants-card">
          <div className="arena-context-head">
            <div>
              <strong>Participantes</strong>
              <small>{presentStudentIds.length}/{sessionParticipants.length}</small>
            </div>
            <button type="button" onClick={onOpenAttendance}>Presença</button>
          </div>

          <div className="arena-participant-filter" role="group" aria-label="Filtrar participantes">
            <button
              type="button"
              className={participantFilter === "present" ? "active" : ""}
              aria-pressed={participantFilter === "present"}
              onClick={() => setParticipantFilter("present")}
            >
              Presentes <span>{presentStudentIds.length}</span>
            </button>
            <button
              type="button"
              className={participantFilter === "all" ? "active" : ""}
              aria-pressed={participantFilter === "all"}
              onClick={() => setParticipantFilter("all")}
            >
              Todos <span>{sessionParticipants.length}</span>
            </button>
          </div>

          <label className="arena-participant-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
              placeholder="Buscar aluno..."
              aria-label="Buscar participante"
            />
          </label>

          <div className="arena-participant-list">
            {visibleParticipants.length === 0 && (
              <div className="arena-participant-empty" role="status">
                <strong>
                  {participantSearch.trim()
                    ? "Nenhum participante encontrado"
                    : participantFilter === "present"
                      ? "Nenhum aluno presente"
                      : "Nenhum participante disponível"}
                </strong>
                <span>
                  {participantSearch.trim()
                    ? "Tente outro termo de busca."
                    : participantFilter === "present"
                      ? "Use Presença para incluir alunos na dinâmica."
                      : "A turma ainda não possui participantes."}
                </span>
              </div>
            )}

            {visibleParticipants.slice(0, 12).map((participant) => {
              const student = students.find((item) => item.id === participant.studentId);
              if (!student) return null;
              return (
                <div className="arena-participant-row" key={participant.id}>
                  <ParticipantAvatar student={student} />
                  <div>
                    <strong>{student.nickname || student.name}</strong>
                    <small>
                      {participant.connected
                        ? "Online"
                        : participant.present
                          ? "Presente · offline"
                          : "Ausente"}
                    </small>
                  </div>
                  <span
                    className={
                      participant.connected
                        ? "arena-status-dot online"
                        : participant.present
                          ? "arena-status-dot present"
                          : "arena-status-dot offline"
                    }
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>

          {visibleParticipants.length > 12 && (
            <button className="arena-context-more" type="button" onClick={onOpenAttendance}>
              Ver todos ({visibleParticipants.length}) →
            </button>
          )}
        </section>
      )}

      <section className="arena-session-code-card">
        <div>
          <span className="arena-context-label">CÓDIGO DA SESSÃO</span>
          <div className="arena-session-code-row">
            <strong>{joinCode?.code ?? "------"}</strong>
            <button
              type="button"
              onClick={onCopySessionCode}
              disabled={!joinCode}
              aria-label="Copiar código da sessão"
              title="Copiar código"
            >
              ⧉
            </button>
          </div>
          <small>Aponte a câmera para participar</small>
        </div>

        {joinCode && publicBaseUrl ? (
          <button
            type="button"
            className="arena-session-qr-trigger"
            onClick={onOpenQr}
            aria-label="Ampliar QR Code da sessão"
            title="Ampliar QR Code"
          >
            <img
              src={joinQrImageUrl(sessionId, publicBaseUrl, joinCode.code, 180)}
              alt={`QR Code da sessão ${joinCode.code}`}
            />
          </button>
        ) : (
          <div className="arena-qr-placeholder">QR</div>
        )}
      </section>
    </aside>
  );
}
