import { useState } from "react";
import SessionTimeline from "@/components/SessionTimeline";
import { Tabs } from "@/components/ui";
import type { ArenaData, Student } from "@/lib/types";
import { dateTime } from "./format";
import { Avatar, MiniEmpty, Panel } from "./ui";

export function HistoryView({ classroomId, events, students, onReverse }: { classroomId: string; events: ArenaData["scoreEvents"]; students: Student[]; onReverse: (id: string) => void }) {
  const [mode, setMode] = useState<"timeline" | "xp">("timeline");
  const [query, setQuery] = useState("");
  const filtered = events.slice().reverse().filter((event) => {
    const student = students.find((s) => s.id === event.studentId);
    return `${student?.name ?? ""} ${event.description} ${event.category}`.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <div className="stack-lg">
      <Tabs
        label="Tipos de histórico da turma"
        activeId={mode}
        onChange={(id) => setMode(id as "timeline" | "xp")}
        items={[
          { id: "timeline", label: "Linha do tempo", description: "Condução e dinâmicas da aula" },
          { id: "xp", label: "Histórico de XP", description: `${events.length} lançamento(s)` },
        ]}
      />

      {mode === "timeline" ? (
        <Panel title="Linha do tempo da aula" subtitle="Trilha cronológica operacional das sessões, sem duplicar o histórico de XP">
          <SessionTimeline classroomId={classroomId} />
        </Panel>
      ) : (
        <Panel title="Histórico de XP" subtitle="Auditoria completa de respostas, entregas, bônus e ajustes">
          <input className="input search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno, motivo ou categoria..." />
          <div className="history-list">
            {filtered.map((event) => { const student = students.find((s) => s.id === event.studentId); return <div className="history-row" key={event.id}><Avatar student={student ?? { id: "x", name: "?", nickname: "", createdAt: "" }} /><div className="grow"><strong>{student?.name ?? "Aluno removido"}</strong><small>{event.description} · {dateTime(event.createdAt)}</small></div><span className="category-tag">{event.reversalOf ? "REVERSÃO" : event.reversed ? "REVERTIDO" : event.category}</span><b className={event.points >= 0 ? "positive" : "negative"}>{event.points >= 0 ? "+" : ""}{event.points} XP</b><button className="icon-button danger" disabled={Boolean(event.reversalOf || event.reversed)} title={event.reversalOf ? "Evento de reversão" : event.reversed ? "Lançamento já revertido" : "Reverter lançamento"} onClick={() => onReverse(event.id)}>↶</button></div>; })}
            {!filtered.length && <MiniEmpty text="Nenhum lançamento encontrado." />}
          </div>
        </Panel>
      )}
    </div>
  );
}
