import { useState } from "react";
import { type Notify } from "@/components/ui";
import { createClassroom as createClassroomApi } from "@/lib/classroom-api";
import { errorMessage } from "./format";
import { MiniEmpty, Modal } from "./ui";
import { StudentManager } from "./StudentManager";
import type { ArenaData } from "@/lib/types";

export function ClassroomCreateModal({ data, onClose, onCreated, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onClose: () => void;
  onCreated: (classroomId: string) => void;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createdId, setCreatedId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const classroom = await createClassroomApi({ name: name.trim(), code: code.trim() });
      setCreatedId(classroom.id);
      await refreshClassroomDomain(classroom.id);
      setStep(2);
      notify("Turma criada. Agora inclua os alunos ou conclua por enquanto.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  const classroom = data.classrooms.find((item) => item.id === createdId);
  return (
    <Modal open title="Nova turma" subtitle="Criação guiada em duas etapas" onClose={onClose} size={step === 2 ? "large" : "medium"}>
      <div className="wizard-steps" aria-label="Etapas da criação">
        <div className={step === 1 ? "active" : "done"}><span>1</span><div><strong>Dados da turma</strong><small>Nome e código</small></div></div>
        <i />
        <div className={step === 2 ? "active" : ""}><span>2</span><div><strong>Alunos</strong><small>Cadastro ou lista</small></div></div>
      </div>
      {step === 1 ? (
        <div className="modal-section-stack">
          <label className="field"><span>Nome da turma</span><input className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Desenvolvimento de Sistemas" /></label>
          <label className="field"><span>Código (opcional)</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex.: TDS-2026" /></label>
          <div className="modal-footer"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!name.trim() || busy} onClick={() => { void create(); }}>{busy ? "Criando..." : "Criar e continuar"}</button></div>
        </div>
      ) : createdId && classroom ? (
        <div className="modal-section-stack">
          <div className="context-lock"><span>Turma criada</span><strong>{classroom.name}</strong><small>{classroom.code || "Sem código"}</small></div>
          <StudentManager data={data} classroomId={createdId} notify={notify} refreshClassroomDomain={refreshClassroomDomain} />
          <div className="modal-footer"><button className="button primary" onClick={() => onCreated(createdId)}>Abrir turma</button></div>
        </div>
      ) : (
        <MiniEmpty text="Atualizando dados da turma..." />
      )}
    </Modal>
  );
}
