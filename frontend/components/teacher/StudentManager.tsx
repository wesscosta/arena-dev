import { useState } from "react";
import { parseStudentImportLine } from "@/lib/student-import";
import { type Notify } from "@/components/ui";
import { xpForStudent } from "@/lib/game";
import { anonymizeStudent, createAndEnrollStudent, removeEnrollment, setEnrollmentActive, updateEnrollmentPreferredName, updateStudentEmail } from "@/lib/classroom-api";
import { errorMessage } from "./format";
import { Avatar, MiniEmpty, Modal } from "./ui";
import type { ArenaData } from "@/lib/types";

export function StudentManager({
  data,
  classroomId,
  notify,
  refreshClassroomDomain,
  showSummary = false,
  showPageHeader = false,
}: {
  data: ArenaData;
  classroomId: string;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
  showSummary?: boolean;
  showPageHeader?: boolean;
}) {
  const [entryMode, setEntryMode] = useState<"add" | "import" | null>(null);
  const [anonymizeTarget, setAnonymizeTarget] = useState<{ id: string; name: string } | null>(null);
  const [anonymizeConfirmation, setAnonymizeConfirmation] = useState("");
  const [emailTarget, setEmailTarget] = useState<{ id: string; name: string } | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [preferredDrafts, setPreferredDrafts] = useState<
    Record<string, string>
  >({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const allRows = data.enrollments
    .filter((enrollment) => enrollment.classroomId === classroomId)
    .map((enrollment) => ({
      enrollment,
      student: data.students.find(
        (student) => student.id === enrollment.studentId,
      )!,
    }))
    .filter((row) => row.student)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
  const activeCount = allRows.filter((row) => row.enrollment.active).length;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const visibleRows = normalizedSearch
    ? allRows.filter(({ student, enrollment }) =>
        [student.name, student.nickname, enrollment.preferredName].some(
          (value) =>
            value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        ),
      )
    : allRows;
  const importCount = bulk
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean).length;

  async function addStudent(
    studentName: string,
    studentPreferredName = "",
    silent = false,
    studentEmail = "",
  ) {
    if ((!studentName.trim() && !studentEmail.trim()) || (!silent && busy)) return false;
    if (!silent) setBusy(true);
    try {
      await createAndEnrollStudent(classroomId, {
        name: studentName.trim(),
        preferredName: studentPreferredName.trim(),
        email: studentEmail.trim(),
      });
      if (!silent) {
        await refreshClassroomDomain(classroomId);
        notify("Aluno adicionado à turma.");
      }
      return true;
    } catch (error) {
      if (!silent) notify(errorMessage(error), "error");
      return false;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function submitSingleStudent() {
    const created = await addStudent(name, preferredName, false, email);
    if (!created) return;
    setName("");
    setEmail("");
    setPreferredName("");
    setEntryMode(null);
  }

  async function importStudents() {
    const names = bulk
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!names.length || busy) return;
    setBusy(true);
    let imported = 0;
    try {
      for (const line of names) {
        const entry = parseStudentImportLine(line);
        if (await addStudent(entry.name, "", true, entry.email)) imported += 1;
      }
      await refreshClassroomDomain(classroomId);
      setBulk("");
      setEntryMode(null);
      notify(
        imported === names.length
          ? `${imported} aluno(s) importado(s).`
          : `${imported} de ${names.length} aluno(s) importados.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(studentId: string, studentName: string) {
    if (busy) return;
    if (
      !window.confirm(
        `Remover ${studentName} desta turma? O cadastro global do aluno será preservado.`,
      )
    )
      return;
    setBusy(true);
    try {
      await removeEnrollment(classroomId, studentId);
      await refreshClassroomDomain(classroomId);
      notify("Aluno removido da turma.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAnonymize() {
    if (busy || !anonymizeTarget) return;
    setBusy(true);
    try {
      await anonymizeStudent(anonymizeTarget.id, anonymizeConfirmation);
      await refreshClassroomDomain(classroomId);
      notify("Dados pessoais do aluno removidos. O histórico da turma foi preservado.");
      setAnonymizeTarget(null);
      setAnonymizeConfirmation("");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveStudentEmail() {
    if (busy || !emailTarget) return;
    setBusy(true);
    try {
      await updateStudentEmail(emailTarget.id, emailDraft);
      await refreshClassroomDomain(classroomId);
      notify(emailDraft.trim() ? "E-mail do aluno atualizado." : "E-mail do aluno removido.");
      setEmailTarget(null);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function savePreferredName(studentId: string, currentValue: string) {
    if (busy) return;
    setBusy(true);
    try {
      await updateEnrollmentPreferredName(classroomId, studentId, currentValue);
      await refreshClassroomDomain(classroomId);
      setPreferredDrafts((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      setEditingStudentId(null);
      notify("Nome de exibição atualizado.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStudent(studentId: string, active: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await setEnrollmentActive(classroomId, studentId, !active);
      await refreshClassroomDomain(classroomId);
      notify(
        active ? "Aluno inativado na turma." : "Aluno reativado na turma.",
      );
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="student-manager-header-actions">
      <button
        className="button ghost"
        type="button"
        onClick={() => setEntryMode("import")}
      >
        Importar
      </button>
      <button
        className="button primary"
        type="button"
        onClick={() => setEntryMode("add")}
      >
        + Adicionar aluno
      </button>
    </div>
  );

  return (
    <div className="student-manager stack-lg">
      {showPageHeader ? (
        <div className="student-page-header">
          <div className="student-page-heading">
            <div className="student-page-title-row">
              <h2>Participantes</h2>
              <span className="student-count-badge">
                {allRows.length} {allRows.length === 1 ? "aluno" : "alunos"}
              </span>
            </div>
            <p>Gerencie quem participa da turma e como aparece na Arena.</p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="student-manager-compact-actions">
          <div>
            <strong>Participantes</strong>
            <small>{allRows.length} cadastrados</small>
          </div>
          {actions}
        </div>
      )}

      {(showSummary || allRows.length > 0) && (
        <section className="student-roster" aria-label="Participantes da turma">
          {allRows.length > 0 && (
            <div className="student-roster-toolbar">
              <label className="student-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por nome ou nome de exibição..."
                  aria-label="Buscar participante"
                />
              </label>
              {activeCount !== allRows.length && (
                <span className="student-active-summary">
                  {activeCount} ativos · {allRows.length - activeCount} inativos
                </span>
              )}
            </div>
          )}

          {!allRows.length ? (
            <MiniEmpty text="Nenhum participante nesta turma. Adicione um aluno ou importe uma lista." />
          ) : !visibleRows.length ? (
            <div className="student-search-empty">
              <strong>Nenhum participante encontrado</strong>
              <span>
                Não encontramos resultados para “{searchQuery.trim()}”.
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="student-table student-table-v3">
              <div className="table-head student-table-head-v3">
                <span>Participante</span>
                <span>Status</span>
                <span>XP</span>
                <span><span className="sr-only">Ações</span></span>
              </div>
              {visibleRows.map(({ student, enrollment }) => {
                const xp = xpForStudent(
                  data.scoreEvents,
                  classroomId,
                  student.id,
                );
                const draft =
                  preferredDrafts[student.id] ?? enrollment.preferredName;
                const dirty = draft !== enrollment.preferredName;
                const isEditing = editingStudentId === student.id;
                const displayName =
                  enrollment.preferredName ||
                  student.nickname ||
                  "Não definido";
                return (
                  <div
                    className={`table-row student-table-row-v3${enrollment.active ? "" : " is-inactive"}`}
                    key={enrollment.id}
                  >
                    <div className="student-cell student-identity-v3">
                      <Avatar student={student} />
                      <div className="student-identity-copy">
                        <strong>{student.name}</strong>
                        {(student.email || student.namePending) && (
                          <small className="student-email-line">
                            {student.email}
                            {student.namePending ? " · aguardando o aluno completar o cadastro" : ""}
                          </small>
                        )}
                        {isEditing ? (
                          <div className="student-display-name-editor">
                      <input
                        className="input"
                              autoFocus
                              aria-label={`Nome de exibição de ${student.name}`}
                        value={draft}
                              onChange={(event) =>
                                setPreferredDrafts((current) => ({
                                  ...current,
                                  [student.id]: event.target.value,
                                }))
                              }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && dirty && !busy) {
                            event.preventDefault();
                            void savePreferredName(student.id, draft);
                          }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setPreferredDrafts((current) => ({
                                    ...current,
                                    [student.id]: enrollment.preferredName,
                                  }));
                                  setEditingStudentId(null);
                                }
                        }}
                              placeholder="Nome de exibição"
                        disabled={busy}
                      />
                      <button
                              className="button ghost student-inline-save"
                        type="button"
                        disabled={busy || !dirty}
                              onClick={() => {
                                void savePreferredName(student.id, draft);
                              }}
                            >
                              {busy ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setPreferredDrafts((current) => ({
                                  ...current,
                                  [student.id]: enrollment.preferredName,
                                }));
                                setEditingStudentId(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            className="student-display-name"
                            type="button"
                            onClick={() => setEditingStudentId(student.id)}
                            aria-label={`Editar nome de exibição de ${student.name}`}
                            title="Editar o nome exibido somente nesta turma"
                          >
                            <span>Nome na turma: {displayName}</span>
                            <span
                              className="student-edit-icon"
                              aria-hidden="true"
                            >
                              ✎ Editar
                            </span>
                          </button>
                        )}
                    </div>
                    </div>
                    <span className={enrollment.active ? "student-status-normal" : "student-status-inactive"}>
                      {enrollment.active ? null : "Inativo"}
                    </span>
                    <b className="student-xp">{xp} XP</b>
                    <div className="student-row-actions">
                      <button
                        type="button"
                        className="student-row-action"
                        aria-label={enrollment.active ? `Desativar ${student.name}` : `Reativar ${student.name}`}
                        title={enrollment.active ? "Desativar participante" : "Reativar participante"}
                        onClick={() => { void toggleStudent(student.id, enrollment.active); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0" /></svg>
                      </button>
                      <button
                        type="button"
                        className="student-row-action"
                        aria-label={`E-mail de ${student.name}`}
                        title="E-mail do aluno"
                        onClick={() => { setEmailDraft(student.email ?? ""); setEmailTarget({ id: student.id, name: student.name }); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7" /></svg>
                      </button>
                      <button
                        type="button"
                        className="student-row-action danger"
                        aria-label={`Remover ${student.name} da turma`}
                        title="Remover da turma"
                        onClick={() => { void removeStudent(student.id, student.name); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                      </button>
                      <button
                        type="button"
                        className="student-row-action danger"
                        aria-label={`Apagar dados pessoais de ${student.name}`}
                        title="Apagar dados pessoais (LGPD)"
                        onClick={() => { setAnonymizeConfirmation(""); setAnonymizeTarget({ id: student.id, name: student.name }); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 19c0-2.8-2.7-5-6-5s-6 2.2-6 5M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M16 9l5 5M21 9l-5 5" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {anonymizeTarget && (
        <Modal
          open
          title="Apagar dados pessoais"
          subtitle="Ação definitiva"
          onClose={() => { if (!busy) setAnonymizeTarget(null); }}
        >
          <div className="stack-lg">
            <p>
              Nome, matrícula, apelido, aparelhos lembrados e vínculos com o Teams de <strong>{anonymizeTarget.name}</strong> serão apagados.
              O histórico da turma (XP, participação e evidências) continua, sob um nome genérico como “Aluno removido”.
              Respostas escritas pelo aluno continuam como evidência de aprendizagem.
            </p>
            <label className="field">
              <span>Digite o nome do aluno para confirmar</span>
              <input
                className="input"
                autoComplete="off"
                spellCheck={false}
                value={anonymizeConfirmation}
                onChange={(event) => setAnonymizeConfirmation(event.target.value)}
              />
            </label>
            <div className="confirm-actions">
              <button type="button" className="button ghost" disabled={busy} onClick={() => setAnonymizeTarget(null)}>Cancelar</button>
              <button
                type="button"
                className="button danger-outline"
                disabled={busy || anonymizeConfirmation.trim().toLowerCase() !== anonymizeTarget.name.trim().toLowerCase()}
                onClick={() => { void confirmAnonymize(); }}
              >
                {busy ? "Apagando…" : "Apagar dados pessoais"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {emailTarget && (
        <Modal
          open
          title="E-mail do aluno"
          subtitle={emailTarget.name}
          onClose={() => { if (!busy) setEmailTarget(null); }}
          size="medium"
        >
          <div className="modal-section-stack">
            <label className="field">
              <span>E-mail</span>
              <input
                className="input"
                type="email"
                autoComplete="off"
                autoFocus
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !busy) {
                    event.preventDefault();
                    void saveStudentEmail();
                  }
                }}
                disabled={busy}
              />
              <small>O e-mail cadastrado aqui substitui o informado pelo aluno, e ele não poderá alterá-lo. Deixe vazio para remover.</small>
            </label>
            <div className="modal-footer">
              <button className="button ghost" onClick={() => setEmailTarget(null)} disabled={busy}>Cancelar</button>
              <button className="button primary" disabled={busy} onClick={() => { void saveStudentEmail(); }}>
                {busy ? "Salvando..." : "Salvar e-mail"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {entryMode === "add" && (
        <Modal
          open
          title="Adicionar aluno"
          subtitle="Cadastro individual"
          onClose={() => {
            if (!busy) setEntryMode(null);
          }}
          size="medium"
        >
          <div className="modal-section-stack">
            <label className="field">
              <span>Nome completo</span>
              <input
                className="input"
                autoFocus
                placeholder="Ex.: Ana Luiza de Sousa"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                className="input"
                type="email"
                autoComplete="off"
                placeholder="Ex.: ana.sousa@escola.edu.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
              <small>Informe o nome, o e-mail ou os dois. Com só o e-mail, o aluno completa o nome no primeiro acesso.</small>
            </label>
            <label className="field">
              <span>
                Nome de exibição <small>opcional</small>
              </span>
              <input
                className="input"
                placeholder="Como aparecerá nesta turma"
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (name.trim() || email.trim()) && !busy) {
                    event.preventDefault();
                    void submitSingleStudent();
                  }
                }}
                disabled={busy}
              />
            </label>
            <div className="modal-footer">
              <button
                className="button ghost"
                onClick={() => setEntryMode(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busy || (!name.trim() && !email.trim())}
                onClick={() => {
                  void submitSingleStudent();
                }}
              >
                {busy ? "Adicionando..." : "Adicionar aluno"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {entryMode === "import" && (
        <Modal
          open
          title="Importar alunos"
          subtitle="Um aluno por linha"
          onClose={() => {
            if (!busy) setEntryMode(null);
          }}
          size="medium"
        >
          <div className="modal-section-stack">
            <label className="field">
              <span>Lista de alunos</span>
              <textarea
                className="textarea student-import-textarea"
                rows={10}
                placeholder={"Ana Luiza\nCarlos Henrique, carlos@escola.edu.br\njoao.pedro@escola.edu.br"}
                value={bulk}
                onChange={(event) => setBulk(event.target.value)}
                disabled={busy}
              />
            </label>
            <div className="inline-note">
              {importCount ? (
                <>
                  <strong>{importCount} aluno(s) identificado(s)</strong>
                  <span>Revise a lista antes de importar.</span>
                </>
              ) : (
                <span>
                  Cole um aluno por linha: nome, e-mail ou “nome, e-mail”.
                  Também aceitamos alunos separados por ponto e vírgula.
                </span>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="button ghost"
                onClick={() => setEntryMode(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busy || !importCount}
                onClick={() => {
                  void importStudents();
                }}
              >
                {busy
                  ? "Importando..."
                  : `Importar ${importCount || ""} aluno(s)`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
