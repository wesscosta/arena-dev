import { useState } from "react";
import type { Notify } from "@/components/ui";
import { createAndEnrollStudent, createClassroom as createClassroomApi } from "@/lib/classroom-api";
import { createScoreEvents as createScoreEventsApi } from "@/lib/score-api";
import type { ArenaData, Student } from "@/lib/types";
import { errorMessage } from "./format";
import { Panel } from "./ui";

export function BackupView({ data, setData, notify, refreshClassroomDomain }: {
  data: ArenaData;
  setData: React.Dispatch<React.SetStateAction<ArenaData>>;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arena-dev-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<ArenaData>;
        if (!Array.isArray(parsed.classrooms) || !Array.isArray(parsed.activities)) throw new Error();
        notify("Snapshot válido. A restauração direta foi desativada porque o núcleo agora é autoritativo no PostgreSQL; a restauração server-side entra em um incremento próprio.");
      } catch {
        notify("Arquivo de snapshot inválido.", "error");
      }
    };
    reader.readAsText(file);
  }

  async function loadDemo() {
    if (busy) return;
    setBusy(true);
    try {
      const classroom = await createClassroomApi({ name: `Desenvolvimento de Sistemas · Demo ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` });
      const names = ["Ana Luiza", "Carlos Henrique", "João Pedro", "Maria Francisca", "Pedro Augusto", "Rafael Lima"];
      const createdStudents: Student[] = [];
      for (const name of names) {
        const result = await createAndEnrollStudent(classroom.id, { name, preferredName: name.split(" ")[0] });
        createdStudents.push(result.student);
      }

      const demoEvents = await createScoreEventsApi(createdStudents.slice(0, 4).map((student, index) => ({
        classroomId: classroom.id,
        studentId: student.id,
        points: (index + 1) * 20,
        category: "BONUS" as const,
        description: "Dados de demonstração",
        source: "MANUAL" as const,
      })));
      await refreshClassroomDomain(classroom.id);
      setData((current) => ({
        ...current,
        activeClassroomId: classroom.id,
        scoreEvents: [...current.scoreEvents.filter((event) => event.classroomId !== classroom.id), ...demoEvents],
      }));
      notify("Demonstração criada no PostgreSQL, incluindo XP.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="two-col">
      <Panel title="Backup dos dados" subtitle="Snapshot dos módulos atuais do Arena Dev">
        <div className="backup-card"><span className="backup-icon">↓</span><div><h3>Exportar snapshot</h3><p>Inclui uma fotografia da visão atual carregada do backend/PostgreSQL.</p></div><button className="button primary" onClick={exportData}>Exportar JSON</button></div>
        <div className="backup-card"><span className="backup-icon">↑</span><div><h3>Validar snapshot</h3><p>Confere o JSON exportado. Restauração server-side será implementada separadamente para não sobrescrever dados persistentes de forma insegura.</p></div><label className="button file-button">Validar JSON<input type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} /></label></div>
      </Panel>
      <Panel title="Ambiente de demonstração" subtitle="Teste o fluxo usando a persistência atual">
        <div className="demo-block"><div className="target-mark small">A</div><h3>Carregar turma demonstrativa</h3><p>Cria turma, alunos e XP de demonstração diretamente no PostgreSQL.</p><button className="button" disabled={busy} onClick={() => { void loadDemo(); }}>{busy ? "Criando..." : "Carregar demonstração"}</button></div>
        <div className="local-note"><strong>Persistência + tempo real</strong><p>Turmas, sessões, presença, XP, atividades, mecânicas, códigos de entrada e Buzzer ficam no backend/PostgreSQL. O WebSocket é usado somente para estado conectado e eventos ao vivo.</p></div>
      </Panel>
    </div>
  );
}
