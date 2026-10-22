import { ArenaGlyph, type ArenaGlyphName } from "@/components/arena/live/ArenaLiveChrome";
import ClassroomIntegrationWorkspace from "@/components/ClassroomIntegrationWorkspace";
import classroomHomeStyles from "@/components/ClassroomHome.module.css";
import type { ArenaData, Classroom, Student } from "@/lib/types";
import { classroomArenaCtaState } from "@/lib/classroom-arena-cta";
import { type ClassroomTab } from "@/lib/teacher-location";
import { CLASSROOM_ACCENT_SCOPE_CLASS, classroomThemePresentation } from "@/lib/classroom-theme";

const CLASSROOM_TABS: { id: ClassroomTab; label: string; icon: ArenaGlyphName }[] = [
  { id: "home", label: "Início", icon: "home" },
  { id: "students", label: "Alunos", icon: "groups" },
  { id: "activities", label: "Atividades", icon: "activities" },
  { id: "journeys", label: "Jornadas", icon: "journeys" },
  { id: "ranking", label: "Ranking", icon: "ranking" },
  { id: "history", label: "Histórico", icon: "history" },
];

export function ClassroomWorkspaceTabs({ tab, onTabChange, studentCount, activityCount, eventCount }: {
  tab: ClassroomTab;
  onTabChange: (tab: ClassroomTab) => void;
  studentCount: number;
  activityCount: number;
  eventCount: number;
}) {
  const badgeFor = (id: ClassroomTab) => {
    if (id === "students") return studentCount;
    if (id === "activities") return activityCount;
    if (id === "history") return eventCount;
    return undefined;
  };

  return (
    <nav className="classroom-section-nav" aria-label="Navegação da turma">
      <div className="classroom-section-tabs" role="tablist" aria-label="Conteúdo da turma">
        {CLASSROOM_TABS.map((item) => {
          const badge = badgeFor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "classroom-section-tab active" : "classroom-section-tab"}
              onClick={() => onTabChange(item.id)}
            >
              <span aria-hidden="true"><ArenaGlyph name={item.icon} /></span>
              <strong>{item.label}</strong>
              {badge !== undefined && <small>{badge}</small>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ClassroomHome({ classroom, data, students, currentSession, onOpenArena, onManageClassroom, onManageIntegration }: {
  classroom: Classroom;
  data: ArenaData;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  onOpenArena: () => void;
  onManageClassroom: () => void;
  onManageIntegration: () => void;
}) {
  const activityCount = data.activities.filter((activity) => activity.classroomId === classroom.id).length;
  const sessionParticipants = currentSession
    ? data.sessionParticipants.filter((participant) => participant.sessionId === currentSession.id)
    : [];
  const presentParticipantCount = sessionParticipants.filter((participant) => participant.present).length;
  const arenaCta = classroomArenaCtaState(
    classroom.active !== false,
    currentSession?.title,
  );
  const classroomTheme = classroomThemePresentation(classroom);


  return (
    <div className="stack-lg">
      {!classroom.active && (
        <div className="context-warning">
          <div><strong>Turma inativa</strong><span>O histórico está preservado, mas novas sessões ficam desabilitadas até a reativação.</span></div>
          <button className="button small" onClick={onManageClassroom}>Gerenciar turma</button>
        </div>
      )}
      <section className={`${classroomHomeStyles.hero} ${CLASSROOM_ACCENT_SCOPE_CLASS}`} style={classroomTheme.style} data-testid="classroom-home-hero">
        <div className={classroomHomeStyles.watermark} aria-hidden>{classroomTheme.glyph}</div>

        <div className={classroomHomeStyles.heroHeader}>
          <div className={classroomHomeStyles.identity}>
            <span className="eyebrow accent">INÍCIO DA TURMA</span>
            <h2>{classroom.name}</h2>
          </div>

          <button
            className={`button ghost ${classroomHomeStyles.manageButton}`}
            onClick={onManageClassroom}
          >
            Gerenciar turma
          </button>
        </div>

        <div className={`${classroomHomeStyles.sessionPanel} ${arenaCta.live ? classroomHomeStyles.sessionPanelLive : ""} ${arenaCta.disabled ? classroomHomeStyles.sessionPanelDisabled : ""}`} data-testid="classroom-session-panel">
          <div className={classroomHomeStyles.sessionCopy}>
            <span className={classroomHomeStyles.sessionKicker}>
              {arenaCta.live && <i className={classroomHomeStyles.liveDot} aria-hidden />}
              {arenaCta.live ? "SESSÃO EM ANDAMENTO" : "AULA AO VIVO"}
            </span>
            <strong className={classroomHomeStyles.sessionTitle}>
              {arenaCta.live
                ? arenaCta.title
                : arenaCta.disabled
                  ? "Arena indisponível"
                  : "Nenhuma sessão em andamento"}
            </strong>
            <p>{arenaCta.description}</p>
            {arenaCta.live && sessionParticipants.length > 0 && (
              <small className={classroomHomeStyles.sessionMeta}>
                {presentParticipantCount} de {students.length} aluno(s) presente(s)
              </small>
            )}
          </div>

          <button
            className={`${classroomHomeStyles.sessionAction} ${
              arenaCta.tone === "start"
                ? classroomHomeStyles.sessionActionStart
                : arenaCta.tone === "resume"
                  ? classroomHomeStyles.sessionActionResume
                  : classroomHomeStyles.sessionActionDisabled
            }`}
            onClick={onOpenArena}
            disabled={arenaCta.disabled}
            data-testid="classroom-session-action"
          >
            <span className={classroomHomeStyles.sessionActionIcon} aria-hidden>{arenaCta.icon}</span>
            <span className={classroomHomeStyles.sessionActionContent}>
              <strong>{arenaCta.buttonLabel}</strong>
              <small>{arenaCta.supportingLabel}</small>
            </span>
          </button>
        </div>
      </section>

      <section className={classroomHomeStyles.summaryGrid} aria-label="Resumo da turma" data-testid="classroom-summary">
        <div className={classroomHomeStyles.summaryCard}>
          <span>ALUNOS MATRICULADOS</span>
          <strong>{students.length}</strong>
          <small>vínculos ativos nesta turma</small>
        </div>
        <div className={classroomHomeStyles.summaryCard}>
          <span>ATIVIDADES</span>
          <strong>{activityCount}</strong>
          <small>conteúdos preparados para a turma</small>
        </div>
      </section>

      <ClassroomIntegrationWorkspace
        classroomId={classroom.id}
        studentCount={students.length}
        activityCount={activityCount}
        onManage={onManageIntegration}
      />

    </div>
  );
}
