import { useEffect, useState, type CSSProperties } from "react";
import { type Notify } from "@/components/ui";
import { deleteClassroom as deleteClassroomApi, updateClassroom as updateClassroomApi } from "@/lib/classroom-api";
import { errorMessage } from "./format";
import type { ArenaData, Classroom, ClassroomThemeColor, ClassroomThemeIcon } from "@/lib/types";
import { CLASSROOM_ACCENT_SCOPE_CLASS, CLASSROOM_THEME_COLORS, CLASSROOM_THEME_ICONS, classroomThemePresentation } from "@/lib/classroom-theme";

export function ClassroomManagementPage({
  classroom,
  data,
  currentSession,
  initialAction = "general",
  onBack,
  onDeleted,
  notify,
  refreshClassroomDomain,
}: {
  classroom: Classroom;
  data: ArenaData;
  currentSession?: ArenaData["sessions"][number];
  initialAction?: "general" | "delete";
  onBack: () => void;
  onDeleted: () => void;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(classroom.name);
  const [code, setCode] = useState(classroom.code);
  const [themeColor, setThemeColor] = useState<ClassroomThemeColor>(classroom.themeColor ?? "emerald");
  const [themeIcon, setThemeIcon] = useState<ClassroomThemeIcon>(classroom.themeIcon ?? "code");
  const [busy, setBusy] = useState(false);
  const [managementAction, setManagementAction] = useState<"archive" | "delete" | null>(
    initialAction === "delete" ? "delete" : null,
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const hasActiveSession = Boolean(
    currentSession && currentSession.status === "ACTIVE" && !currentSession.endedAt,
  );
  const enrollmentCount = data.enrollments.filter((item) => item.classroomId === classroom.id).length;
  const sessionCount = data.sessions.filter((session) => session.classroomId === classroom.id).length;
  const activityCount = data.activities.filter((activity) => activity.classroomId === classroom.id).length;
  const scoreCount = data.scoreEvents.filter((event) => event.classroomId === classroom.id).length;
  const deleteConfirmed = deleteConfirmation === classroom.name;
  const appearancePreview = classroomThemePresentation({ ...classroom, themeColor, themeIcon });

  useEffect(() => {
    setName(classroom.name);
    setCode(classroom.code);
    setThemeColor(classroom.themeColor ?? "emerald");
    setThemeIcon(classroom.themeIcon ?? "code");
    setDeleteConfirmation("");
    setManagementAction(initialAction === "delete" ? "delete" : null);
  }, [
    classroom.id,
    classroom.name,
    classroom.code,
    classroom.themeColor,
    classroom.themeIcon,
    initialAction,
  ]);

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: name.trim(),
        code: code.trim(),
        active: classroom.active !== false,
        themeColor,
        themeIcon,
        studentStudyAccessEnabled: classroom.studentStudyAccessEnabled ?? false,
      });
      await refreshClassroomDomain(classroom.id);
      notify("Configurações da turma salvas.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function setArchived(archived: boolean) {
    if (busy || (archived && hasActiveSession)) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: !archived,
        themeColor: classroom.themeColor ?? "emerald",
        themeIcon: classroom.themeIcon ?? "code",
        studentStudyAccessEnabled: classroom.studentStudyAccessEnabled ?? false,
      });
      await refreshClassroomDomain(classroom.id);
      notify(archived ? "Turma arquivada. O histórico foi preservado." : "Turma reativada.");
      setManagementAction(null);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function setStudyAccess(enabled: boolean) {
    if (busy || enabled === classroom.studentStudyAccessEnabled) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: classroom.active !== false,
        themeColor: classroom.themeColor ?? "emerald",
        themeIcon: classroom.themeIcon ?? "code",
        studentStudyAccessEnabled: enabled,
      });
      await refreshClassroomDomain(classroom.id);
      notify(enabled
        ? "Espaço de estudo disponibilizado aos alunos."
        : "As Jornadas foram ocultadas. O progresso dos alunos foi preservado.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeClassroom() {
    if (busy || hasActiveSession || !deleteConfirmed) return;
    setBusy(true);
    try {
      await deleteClassroomApi(classroom.id, deleteConfirmation);
      await refreshClassroomDomain();
      notify("Turma excluída definitivamente. Os cadastros globais dos alunos foram preservados.");
      onDeleted();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="classroom-settings-page stack-lg">
      <header className="classroom-settings-heading">
        <div>
          <span className="eyebrow accent">GERENCIAR TURMA</span>
          <h2>{classroom.name}</h2>
          <p>Identidade, aparência, status e ciclo de vida desta turma.</p>
        </div>
        <div className="classroom-settings-heading-actions">
          <button className="button ghost" type="button" onClick={onBack}>
            ← Voltar para a turma
          </button>
          <button className="button primary" type="button" disabled={busy || !name.trim()} onClick={() => { void save(); }}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </header>

      <div className="classroom-settings-grid">
        <div className="classroom-settings-main">
          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">GERAL</span>
              <h3>Identificação</h3>
              <p>Defina como a turma é identificada no Arena Dev.</p>
            </div>

            <div className="classroom-settings-fields">
              <label className="field">
                <span>Nome da turma</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field">
                <span>Código <small>opcional</small></span>
                <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">APARÊNCIA</span>
              <h3>Identidade visual da turma</h3>
              <p>Cor e ícone funcionam como referência contextual sem alterar o tema inteiro da aplicação.</p>
            </div>

            <div className="classroom-settings-appearance">
              <div className="field">
                <span>Cor da turma</span>
                <div className="classroom-color-picker" role="radiogroup" aria-label="Cor da turma">
                  {CLASSROOM_THEME_COLORS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={themeColor === option.id}
                      aria-label={option.label}
                      title={option.label}
                      className={themeColor === option.id ? "classroom-color-swatch selected" : "classroom-color-swatch"}
                      style={{ "--classroom-accent-dark": option.value, "--classroom-accent-light": option.lightValue } as CSSProperties}
                      onClick={() => setThemeColor(option.id)}
                    >
                      {themeColor === option.id && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>Ícone da turma</span>
                <div className="classroom-icon-picker classroom-settings-icon-picker" role="radiogroup" aria-label="Ícone da turma">
                  {CLASSROOM_THEME_ICONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={themeIcon === option.id}
                      className={themeIcon === option.id ? "classroom-icon-choice selected" : "classroom-icon-choice"}
                      onClick={() => setThemeIcon(option.id)}
                      title={option.label}
                    >
                      <strong>{option.glyph}</strong>
                      <small>{option.label}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`classroom-appearance-preview classroom-settings-preview ${CLASSROOM_ACCENT_SCOPE_CLASS}`} style={appearancePreview.style}>
                <span className="classroom-appearance-preview-icon" aria-hidden>{appearancePreview.glyph}</span>
                <div>
                  <small>Pré-visualização</small>
                  <strong>{name.trim() || classroom.name}</strong>
                  <span>{code.trim() || classroom.code || "Sem código"}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">ESPAÇO DE ESTUDO</span>
              <h3>Jornadas dos alunos</h3>
              <p>Controle se as Jornadas publicadas desta turma aparecem no espaço persistente de estudo. Isso não interfere no /join nem nas experiências ao vivo.</p>
            </div>
            <button
              className="classroom-study-access"
              type="button"
              role="switch"
              aria-checked={classroom.studentStudyAccessEnabled}
              disabled={busy}
              onClick={() => { void setStudyAccess(!classroom.studentStudyAccessEnabled); }}
            >
              <span>
                <strong>Disponibilizar Jornadas para os alunos</strong>
                <small>{classroom.studentStudyAccessEnabled ? "Disponível no espaço de estudo" : "Oculto do espaço de estudo"}</small>
              </span>
              <i className={classroom.studentStudyAccessEnabled ? "active" : ""} aria-hidden><b /></i>
            </button>
          </section>
        </div>

        <aside className="classroom-settings-side">
          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">STATUS</span>
              <h3>{classroom.active === false ? "Turma arquivada" : "Turma ativa"}</h3>
              <p>
                {classroom.active === false
                  ? "Fora do fluxo operacional diário, com histórico preservado."
                  : "Disponível para alunos, atividades e novas aulas."}
              </p>
            </div>

            <div className="classroom-status-summary">
              <div>
                <span>Turma</span>
                <strong>{classroom.active === false ? "Arquivada" : "Ativa"}</strong>
              </div>
              <div>
                <span>Aula</span>
                <strong>{hasActiveSession ? "Em andamento" : "Sem aula aberta"}</strong>
              </div>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">CICLO DE VIDA</span>
              <h3>{classroom.active === false ? "Reativar turma" : "Arquivar turma"}</h3>
              <p>
                {classroom.active === false
                  ? "Retorne a turma ao fluxo operacional."
                  : "Retire a turma do uso diário preservando alunos, atividades, sessões, histórico e XP."}
              </p>
            </div>

            {classroom.active === false ? (
              <button className="button primary full" type="button" disabled={busy} onClick={() => { void setArchived(false); }}>
                Reativar turma
              </button>
            ) : managementAction !== "archive" ? (
              <button className="button ghost full" type="button" onClick={() => setManagementAction("archive")}>
                Arquivar turma
              </button>
            ) : (
              <div className="classroom-lifecycle-confirmation">
                {hasActiveSession ? (
                  <div className="inline-note warning">
                    Há uma sessão em andamento. Encerre-a antes de arquivar a turma.
                  </div>
                ) : (
                  <>
                    <strong>Arquivar “{classroom.name}”?</strong>
                    <p>O histórico será preservado e a turma poderá ser reativada depois.</p>
                    <div className="confirm-actions">
                      <button className="button ghost" type="button" onClick={() => setManagementAction(null)}>Cancelar</button>
                      <button className="button primary" type="button" disabled={busy} onClick={() => { void setArchived(true); }}>
                        Confirmar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="classroom-settings-card classroom-settings-danger">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow danger-eyebrow">ZONA DE RISCO</span>
              <h3>Excluir esta turma</h3>
              <p>A exclusão é permanente e remove todos os dados pertencentes a esta turma.</p>
            </div>

            <div className="classroom-delete-impact">
              <span>{enrollmentCount} vínculo(s)</span>
              <span>{activityCount} atividade(s)</span>
              <span>{sessionCount} sessão(ões)</span>
              <span>{scoreCount} evento(s) de XP</span>
            </div>

            {managementAction !== "delete" ? (
              <button className="button danger-outline full" type="button" onClick={() => setManagementAction("delete")}>
                Excluir esta turma
              </button>
            ) : hasActiveSession ? (
              <div className="classroom-delete-confirmation">
                <strong>Há uma sessão em andamento.</strong>
                <p>Encerre a sessão antes da exclusão definitiva para não interromper participantes conectados.</p>
                <button className="button ghost" type="button" onClick={() => setManagementAction(null)}>Voltar</button>
              </div>
            ) : (
              <div className="classroom-delete-confirmation">
                <strong>Esta ação não pode ser desfeita.</strong>
                <p>Digite exatamente o nome completo da turma:</p>
                <code className="classroom-delete-name">{classroom.name}</code>
                <label className="field">
                  <span>Nome completo da turma</span>
                  <input
                    className="input"
                    autoComplete="off"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={classroom.name}
                  />
                </label>
                <div className="confirm-actions">
                  <button
                    className="button ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setManagementAction(null);
                      setDeleteConfirmation("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    disabled={busy || !deleteConfirmed}
                    onClick={() => { void removeClassroom(); }}
                  >
                    {busy ? "Excluindo..." : "Excluir definitivamente"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
