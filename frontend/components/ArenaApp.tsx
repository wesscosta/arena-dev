"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import TeacherLogin from "@/components/TeacherLogin";
import ActivityQuestionBuilder from "@/components/ActivityQuestionBuilder";
import ActivityStepEditor from "@/components/ActivityStepEditor";
import ActivitySubmissionDashboard from "@/components/ActivitySubmissionDashboard";
import LiveFlowConductor from "@/components/LiveFlowConductor";
import ExternalResultImportModal from "@/components/ExternalResultImportModal";
import TimerPanel from "@/components/TimerPanel";
import ArenaToolDrawer from "@/components/ArenaToolDrawer";
import WordCloudPanel from "@/components/WordCloudPanel";
import PollPanel from "@/components/PollPanel";
import QuizPanel from "@/components/QuizPanel";
import SessionAccessCard from "@/components/SessionAccessCard";
import SessionTimeline from "@/components/SessionTimeline";
import ClassroomContextSwitcher from "@/components/ClassroomContextSwitcher";
import MicrosoftIntegrationConsole from "@/components/MicrosoftIntegrationConsole";
import IntegrationSettingsSummary from "@/components/IntegrationSettingsSummary";
import ClassroomIntegrationWorkspace from "@/components/ClassroomIntegrationWorkspace";
import {
  Badge,
  Breadcrumb,
  Button,
  Menu,
  MenuItem,
  LiveRegion,
  Tabs,
  type BreadcrumbItem,
  type TabItem,
} from "@/components/ui";
import { QUESTION_DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/activity-questions";
import { getLevel, getLevelProgress, xpForStudent } from "@/lib/game";
import { ArenaApiError, createAndEnrollStudent, createClassroom as createClassroomApi, deleteClassroom as deleteClassroomApi, fetchClassroomDomain, removeEnrollment, setEnrollmentActive, updateClassroom as updateClassroomApi, updateEnrollmentPreferredName } from "@/lib/classroom-api";
import { createSession as createSessionApi, fetchSessionDomain, fetchSessionParticipants, finishSession as finishSessionApi, releaseParticipantDevice, setParticipantPresence } from "@/lib/session-api";
import { copyActivity as copyActivityApi, createActivity as createActivityApi, fetchActivityDomain, updateActivity as updateActivityApi, type ActivityUpsertInput } from "@/lib/activity-api";
import { fetchActivitySteps, replaceActivitySteps } from "@/lib/activity-step-api";
import { validateActivitySteps } from "@/lib/activity-steps";
import {
  damageBoss as damageBossApi,
  drawStudent as drawStudentApi,
  fetchLiveFlow,
  mergeSessionMechanics,
  nextArenaQuestion as nextArenaQuestionApi,
  nextLiveFlow,
  organizeGroups as organizeGroupsApi,
  previousLiveFlow,
  restartArenaQuestions as restartArenaQuestionsApi,
  setArenaActivity as setArenaActivityApi,
  startBoss as startBossApi,
  startLiveFlow,
  type LiveFlowState,
} from "@/lib/mechanics-api";
import { createScoreEvent as createScoreEventApi, createScoreEvents as createScoreEventsApi, fetchScoreDomain, reverseScoreEvent as reverseScoreEventApi, type CreateScoreEventInput } from "@/lib/score-api";
import { closeBuzzer as closeBuzzerApi, connectSessionSocket, fetchBuzzerState, fetchJoinCode, joinQrImageUrl, openBuzzer as openBuzzerApi, rotateJoinCode, type BuzzerState, type JoinCode, type SessionRealtimeEvent } from "@/lib/realtime-api";
import { fetchSessionEventsBySession, type SessionEvent } from "@/lib/session-event-api";
import { EMPTY_DATA, loadData, saveData } from "@/lib/store";
import type { TimerState } from "@/lib/timer-api";
import { fetchWordCloudState, type WordCloudState } from "@/lib/word-cloud-api";
import { fetchPollState, type PollState } from "@/lib/poll-api";
import { fetchQuizState, type QuizState } from "@/lib/quiz-api";
import { fetchTeacherSession, logoutTeacher, type TeacherSession } from "@/lib/auth-api";
import { activeSessionId, selectPreferredClassroomId } from "@/lib/app-state";
import {
  loadRecentClassroomIds,
  orderOverviewClassrooms,
  rememberClassroomAccess,
  type ClassroomSortMode,
} from "@/lib/classroom-overview";
import type { Activity, ActivityQuestion, ActivityStep, ArenaData, Classroom, ClassroomThemeColor, ClassroomThemeIcon, ScoreCategory, SessionParticipant, Student } from "@/lib/types";
import { classroomArenaCtaState } from "@/lib/classroom-arena-cta";
import { applyThemePreference, loadThemePreference, saveThemePreference, type ThemePreference } from "@/lib/theme-preference";
import {
  CLASSROOM_THEME_COLORS,
  CLASSROOM_THEME_ICONS,
  classroomThemePresentation,
} from "@/lib/classroom-theme";

type View = "dashboard" | "classroom" | "classroom-settings" | "arena" | "integrations" | "settings";
type ClassroomTab = "home" | "students" | "activities" | "ranking" | "history";
type ArenaDynamic = "runbook" | "draw" | "wordcloud" | "poll" | "quiz" | "buzzer" | "boss";
type ArenaTool = "timer" | "groups" | "attendance" | "score" | null;

const ARENA_DYNAMIC_LABELS: Record<ArenaDynamic, string> = {
  runbook: "Roteiro da aula",
  draw: "Sorteio",
  wordcloud: "Nuvem de Palavras",
  poll: "Votação",
  quiz: "Quiz",
  buzzer: "Buzzer",
  boss: "Boss Battle",
};

const VIEW_LABEL: Record<View, string> = {
  dashboard: "Visão geral",
  classroom: "Turma",
  "classroom-settings": "Gerenciar turma",
  arena: "Arena",
  integrations: "Integrações",
  settings: "Configurações",
};

const CLASSROOM_TABS: { id: ClassroomTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "students", label: "Alunos", icon: "◎" },
  { id: "activities", label: "Atividades", icon: "✓" },
  { id: "ranking", label: "Ranking", icon: "▲" },
  { id: "history", label: "Histórico", icon: "≡" },
];

const SCORE_PRESETS: { points: number; label: string; category: ScoreCategory }[] = [
  { points: 5, label: "Parcial / complemento", category: "QUESTION" },
  { points: 10, label: "Resposta correta", category: "QUESTION" },
  { points: 15, label: "Debug / código", category: "DEBUG" },
  { points: 20, label: "Desafio avançado", category: "CHALLENGE" },
];

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function todayTitle() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function formatSessionElapsed(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function errorMessage(error: unknown) {
  if (error instanceof ArenaApiError || error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}

export default function ArenaApp() {
  const [data, setData] = useState<ArenaData>(EMPTY_DATA);
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [classroomTab, setClassroomTab] = useState<ClassroomTab>("home");
  const [classroomSettingsIntent, setClassroomSettingsIntent] = useState<"general" | "delete">("general");
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [arenaActivityId, setArenaActivityId] = useState<string | undefined>();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    void fetchTeacherSession()
      .then((session) => { if (!cancelled) setTeacherSession(session); })
      .catch(() => { if (!cancelled) setTeacherSession(null); });
    const requireAuth = () => setTeacherSession(null);
    window.addEventListener("arena-auth-required", requireAuth);
    return () => { cancelled = true; window.removeEventListener("arena-auth-required", requireAuth); };
  }, []);

  useEffect(() => {
    if (!teacherSession) return;
    let cancelled = false;
    async function bootstrap() {
      const localData = loadData();
      try {
        const domain = await fetchClassroomDomain();
        const [sessionDomain, scoreEvents, activities] = await Promise.all([
          fetchSessionDomain(domain.classrooms),
          fetchScoreDomain(domain.classrooms),
          fetchActivityDomain(domain.classrooms),
        ]);
        if (cancelled) return;
        const selectedClassroomId = selectPreferredClassroomId(domain.classrooms, localData.activeClassroomId);
        setData({
          ...localData,
          ...domain,
          ...sessionDomain,
          scoreEvents,
          activities,
          sessionRuntime: [],
          groupHistory: [],
          activeClassroomId: selectedClassroomId,
          currentSessionId: activeSessionId(sessionDomain.sessions, selectedClassroomId),
        });
        setApiError("");
      } catch (error) {
        if (cancelled) return;
        setData(localData);
        setApiError(`Backend indisponível: ${errorMessage(error)}`);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, [teacherSession]);

  useEffect(() => {
    if (hydrated) saveData(data);
  }, [data, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const initial = loadThemePreference();
    setThemePreferenceState(initial);
    applyThemePreference(initial);
  }, []);

  useEffect(() => {
    applyThemePreference(themePreference);
    if (themePreference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => applyThemePreference("system");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [themePreference]);

  function setThemePreference(preference: ThemePreference) {
    setThemePreferenceState(preference);
    saveThemePreference(preference);
  }

  const activeClassroom = data.classrooms.find((item) => item.id === data.activeClassroomId) ?? data.classrooms[0];
  const activeClassroomId = activeClassroom?.id;

  useEffect(() => {
    if (hydrated && !data.activeClassroomId && data.classrooms[0]) {
      setData((current) => ({ ...current, activeClassroomId: current.classrooms[0]?.id }));
    }
  }, [hydrated, data.activeClassroomId, data.classrooms]);

  const classEnrollments = useMemo(
    () => data.enrollments.filter((item) => item.classroomId === activeClassroomId),
    [data.enrollments, activeClassroomId],
  );

  const classStudents = useMemo(() => {
    const ids = new Set(classEnrollments.filter((item) => item.active).map((item) => item.studentId));
    return data.students.filter((student) => ids.has(student.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [classEnrollments, data.students]);

  const currentSession = data.sessions.find((item) => item.id === data.currentSessionId && item.status !== "FINISHED" && !item.endedAt);

  const arenaStudents = useMemo(() => {
    if (!currentSession) return classStudents;
    const participantIds = new Set(
      data.sessionParticipants
        .filter((item) => item.sessionId === currentSession.id)
        .map((item) => item.studentId),
    );
    return data.students.filter((student) => participantIds.has(student.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [classStudents, currentSession, data.sessionParticipants, data.students]);

  const leaderboard = useMemo(
    () =>
      classStudents
        .map((student) => ({
          student,
          xp: activeClassroomId ? xpForStudent(data.scoreEvents, activeClassroomId, student.id) : 0,
        }))
        .sort((a, b) => b.xp - a.xp || a.student.name.localeCompare(b.student.name)),
    [classStudents, data.scoreEvents, activeClassroomId],
  );

  function notify(message: string) {
    setToast(message);
  }

  function patch(updater: (current: ArenaData) => ArenaData) {
    setData((current) => updater(current));
  }

  async function refreshClassroomDomain(preferredClassroomId?: string) {
    const domain = await fetchClassroomDomain();
    const [sessionDomain, scoreEvents, activities] = await Promise.all([
      fetchSessionDomain(domain.classrooms),
      fetchScoreDomain(domain.classrooms),
      fetchActivityDomain(domain.classrooms),
    ]);
    setData((current) => {
      const candidate = preferredClassroomId ?? current.activeClassroomId;
      const activeClassroomId = selectPreferredClassroomId(domain.classrooms, candidate);
      return { ...current, ...domain, ...sessionDomain, scoreEvents, activities, sessionRuntime: [], groupHistory: [], activeClassroomId, currentSessionId: activeSessionId(sessionDomain.sessions, activeClassroomId) };
    });
    setApiError("");
  }

  function setActiveClassroom(id: string) {
    setArenaActivityId(undefined);
    rememberClassroomAccess(id);
    patch((current) => {
      return { ...current, activeClassroomId: id, currentSessionId: activeSessionId(current.sessions, id) };
    });
  }

  function openClassroom(tab: ClassroomTab = "home") {
    setClassroomTab(tab);
    setView("classroom");
  }

  function openClassroomSettings(classroomId?: string, intent: "general" | "delete" = "general") {
    if (classroomId) setActiveClassroom(classroomId);
    setClassroomSettingsIntent(intent);
    setView("classroom-settings");
  }

  if (teacherSession === undefined) {
    return <div className="loading-screen">Validando acesso...</div>;
  }

  if (!teacherSession) {
    return <TeacherLogin onAuthenticated={(session) => { setTeacherSession(session); setHydrated(false); }} />;
  }

  if (!hydrated) {
    return <div className="loading-screen">Carregando Arena Dev...</div>;
  }

  return (
    <div className="app-shell app-shell-no-sidebar">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo principal
      </a>
      <LiveRegion>{toast}</LiveRegion>
      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className="topbar app-topbar contextual-topbar">
          <button
            type="button"
            className="topbar-brand"
            onClick={() => {
              setView("dashboard");
            }}
            title="Voltar para a Visão geral"
          >
            <span className="topbar-brand-mark">A</span>
            <span>
              <strong>ARENA DEV</strong>
              <small>Classroom Edition · V1</small>
            </span>
          </button>

          <Breadcrumb
            className="context-trail"
            items={[
              {
                id: "dashboard",
                label: "Visão geral",
                current: view === "dashboard",
                onClick: view === "dashboard"
                  ? undefined
                  : () => {
                      setView("dashboard");
                    },
              },
              ...((view === "classroom" || view === "classroom-settings" || view === "arena") && activeClassroom
                ? [{
                    id: "classroom",
                    label: (
                      <ClassroomContextSwitcher
                        classrooms={data.classrooms}
                        activeClassroomId={activeClassroom.id}
                        liveClassroomIds={data.sessions
                          .filter((session) =>
                            session.status === "ACTIVE" && !session.endedAt
                          )
                          .map((session) => session.classroomId)}
                        onSelect={(classroomId) => {
                          const changed = classroomId !== activeClassroom.id;
                          setActiveClassroom(classroomId);
                          if (view === "arena" && changed) {
                            setClassroomTab("home");
                            setView("classroom");
                          }
                        }}
                      />
                    ),
                    current: view === "classroom",
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "arena"
                ? [{
                    id: "arena",
                    label: "Arena",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "classroom-settings"
                ? [{
                    id: "classroom-settings",
                    label: "Gerenciar turma",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "integrations"
                ? [{
                    id: "integrations",
                    label: "Integrações",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "settings"
                ? [{
                    id: "settings",
                    label: "Configurações",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
            ]}
          />

          <div className="topbar-actions app-topbar-actions">
            <Menu
              trigger={(triggerProps) => (
                <button
                  {...triggerProps}
                  type="button"
                  className="topbar-profile"
                  aria-label="Abrir menu do professor"
                >
                  <span className="topbar-profile-avatar">
                    {teacherSession.username.trim().charAt(0).toUpperCase() || "P"}
                  </span>
                  <span className="topbar-profile-copy">
                    <strong>{teacherSession.username}</strong>
                    <small>Professor</small>
                  </span>
                  <span className="topbar-profile-chevron">⌄</span>
                </button>
              )}
            >
              <MenuItem
                icon="⚙"
                description="Perfil, sistema e backup"
                onSelect={() => {
                  setView("settings");
                }}
              >
                Configurações
              </MenuItem>
              <MenuItem
                icon="↪"
                danger
                description="Encerrar sessão do professor"
                onSelect={() => {
                  void logoutTeacher().finally(() => {
                    setTeacherSession(null);
                    setData(EMPTY_DATA);
                    setHydrated(false);
                  });
                }}
              >
                Sair
              </MenuItem>
            </Menu>
          </div>
        </header>

        <section className={view === "arena" ? "content arena-content-full" : "content"}>
          {apiError && <div className="api-alert" role="alert" aria-live="assertive"><strong>API indisponível.</strong><span>{apiError}</span><button className="text-button" onClick={() => { void refreshClassroomDomain(); }}>Tentar novamente</button></div>}

          {view === "dashboard" && (
            <OverviewView
              data={data}
              onSelectClassroom={(classroomId) => { setActiveClassroom(classroomId); openClassroom("home"); }}
              onManageClassroom={(classroomId, intent) => openClassroomSettings(classroomId, intent)}
              onOpenIntegrations={() => setView("integrations")}
              notify={notify}
              refreshClassroomDomain={refreshClassroomDomain}
            />
          )}

          {view === "classroom" && (
            activeClassroom ? (
              <div className="stack-lg">
                <ClassroomWorkspaceTabs
                  tab={classroomTab}
                  onTabChange={setClassroomTab}
                  studentCount={classStudents.length}
                  activityCount={data.activities.filter((activity) => activity.classroomId === activeClassroom.id).length}
                  eventCount={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id).length}
                />
                {classroomTab === "home" && (
                  <ClassroomHome
                    classroom={activeClassroom}
                    data={data}
                    students={classStudents}
                    leaderboard={leaderboard}
                    events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
                    currentSession={currentSession}
                    onOpenArena={() => setView("arena")}
                    onManageClassroom={() => openClassroomSettings(activeClassroom.id)}
                    onManageIntegration={() => setView("integrations")}
                    notify={notify}
                    refreshClassroomDomain={refreshClassroomDomain}
                  />
                )}
                {classroomTab === "students" && (
                  <StudentsView
                    data={data}
                    classroomId={activeClassroom.id}
                    notify={notify}
                    refreshClassroomDomain={refreshClassroomDomain}
                  />
                )}
                {classroomTab === "activities" && (
                  <ActivitiesView
                    data={data}
                    classroomId={activeClassroom.id}
                    classroomName={activeClassroom.name}
                    students={classStudents}
                    onUseInArena={(activityId) => { setArenaActivityId(activityId); setView("arena"); }}
                    patch={patch}
                    notify={notify}
                  />
                )}
                {classroomTab === "ranking" && (
                  <RankingView leaderboard={leaderboard} events={data.scoreEvents} classroomId={activeClassroom.id} />
                )}
                {classroomTab === "history" && (
                  <HistoryView
                    classroomId={activeClassroom.id}
                    events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
                    students={data.students}
                    onReverse={(eventId) => {
                      void (async () => {
                        try {
                          const reversal = await reverseScoreEventApi(eventId);
                          patch((current) => ({
                            ...current,
                            scoreEvents: [
                              ...current.scoreEvents.map((event) => event.id === eventId ? { ...event, reversed: true } : event),
                              reversal,
                            ],
                          }));
                          notify("Lançamento revertido com auditoria preservada.");
                        } catch (error) {
                          notify(errorMessage(error));
                        }
                      })();
                    }}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma turma selecionada"
                text="Selecione uma turma na Visão geral ou crie uma nova turma para abrir o workspace pedagógico."
                actionLabel="Ir para Visão geral"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "classroom-settings" && (
            activeClassroom ? (
              <ClassroomManagementPage
                classroom={activeClassroom}
                data={data}
                currentSession={currentSession}
                initialAction={classroomSettingsIntent}
                onBack={() => setView("classroom")}
                onDeleted={() => setView("dashboard")}
                notify={notify}
                refreshClassroomDomain={refreshClassroomDomain}
              />
            ) : (
              <EmptyState
                title="Nenhuma turma selecionada"
                text="Selecione uma turma para abrir suas configurações."
                actionLabel="Ir para Visão geral"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "arena" && (
            activeClassroom ? (
              <ArenaView
                data={data}
                classroomId={activeClassroom.id}
                students={arenaStudents}
                currentSession={currentSession}
                sessionParticipants={data.sessionParticipants.filter((item) => item.sessionId === currentSession?.id)}
                preferredActivityId={arenaActivityId}
                onPreferredActivityChange={setArenaActivityId}
                onBack={() => openClassroom("home")}
                onSessionEnded={() => {
                  openClassroom("home");
                }}
                patch={patch}
                notify={notify}
              />
            ) : (
              <EmptyState
                title="Selecione uma turma"
                text="A Arena sempre acontece dentro de uma turma. Escolha o contexto antes de iniciar a sessão."
                actionLabel="Ir para Visão geral"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "integrations" && (
            <MicrosoftIntegrationConsole
              classrooms={data.classrooms}
              students={data.students}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "settings" && (
            <div className="settings-page stack-lg">
              <div className="settings-heading">
                <div>
                  <span className="eyebrow accent">CONFIGURAÇÕES</span>
                  <h2>Professor e sistema</h2>
                  <p>Preferências administrativas do Arena Dev, informações do ambiente e rotinas de segurança.</p>
                </div>
                <button className="button ghost" onClick={() => setView("dashboard")}>
                  ← Visão geral
                </button>
              </div>

              <div className="settings-summary-grid">
                <Panel title="Perfil do professor" subtitle="Sessão administrativa atual">
                  <div className="teacher-profile-card">
                    <span className="teacher-profile-avatar">
                      {teacherSession.username.trim().charAt(0).toUpperCase() || "P"}
                    </span>
                    <div>
                      <strong>{teacherSession.username}</strong>
                      <span>Professor</span>
                      <small>Acesso autenticado ao painel administrativo.</small>
                    </div>
                  </div>
                </Panel>

                <Panel title="Sistema" subtitle="Estado da persistência">
                  <div className="settings-system-status">
                    <span className={apiError ? "status-dot error" : "status-dot"} />
                    <div>
                      <strong>{apiError ? "Backend indisponível" : "Persistência operacional"}</strong>
                      <small>
                        {apiError
                          ? "Verifique Spring Boot e PostgreSQL."
                          : "Turmas, sessões, XP, atividades e mecânicas persistidas no backend."}
                      </small>
                    </div>
                  </div>
                  {apiError && (
                    <button
                      className="button ghost small settings-retry"
                      onClick={() => { void refreshClassroomDomain(); }}
                    >
                      Tentar novamente
                    </button>
                  )}
                </Panel>
              </div>

              <section className="settings-integrations-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">INTEGRAÇÕES</span>
                  <h3>Plataformas educacionais</h3>
                  <p>
                    Conecte o Arena Dev às plataformas usadas pela instituição. As turmas continuam únicas no Arena e recebem apenas um indicador quando existe vínculo externo.
                  </p>
                </div>
                <IntegrationSettingsSummary onManage={() => setView("integrations")} />
              </section>

              <section className="settings-appearance-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">APARÊNCIA</span>
                  <h3>Tema da interface</h3>
                  <p>Escolha como o Arena Dev deve aparecer neste navegador.</p>
                </div>

                <Panel title="Tema" subtitle="Preferência local deste dispositivo">
                  <div className="theme-choice-grid" role="radiogroup" aria-label="Tema da interface">
                    {([
                      { id: "dark", label: "Escuro", description: "Tema padrão do Arena Dev.", icon: "◐" },
                      { id: "light", label: "Claro", description: "Superfícies claras e contraste suave.", icon: "☀" },
                      { id: "system", label: "Sistema", description: "Segue a preferência do sistema operacional.", icon: "◒" },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={themePreference === option.id}
                        className={themePreference === option.id ? "theme-choice active" : "theme-choice"}
                        onClick={() => setThemePreference(option.id)}
                      >
                        <span className={`theme-choice-preview theme-choice-preview-${option.id}`} aria-hidden>
                          <i />
                          <b />
                        </span>
                        <span className="theme-choice-copy">
                          <strong><span aria-hidden>{option.icon}</span> {option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span className="theme-choice-check" aria-hidden>{themePreference === option.id ? "✓" : ""}</span>
                      </button>
                    ))}
                  </div>
                  <div className="settings-theme-note">
                    A preferência é salva localmente. “Sistema” acompanha automaticamente mudanças entre claro e escuro.
                  </div>
                </Panel>
              </section>

              <section className="settings-backup-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">SEGURANÇA E DADOS</span>
                  <h3>Backup e restauração</h3>
                  <p>As operações de backup ficam dentro das configurações administrativas e deixam de ocupar a navegação principal.</p>
                </div>
                <BackupView
                  data={data}
                  setData={setData}
                  notify={notify}
                  refreshClassroomDomain={refreshClassroomDomain}
                />
              </section>
            </div>
          )}
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function OverviewView({ data, onSelectClassroom, onManageClassroom, onOpenIntegrations, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onSelectClassroom: (classroomId: string) => void;
  onManageClassroom: (classroomId: string, intent: "general" | "delete") => void;
  onOpenIntegrations: () => void;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ClassroomSortMode>("RECENT");
  const [recentClassroomIds] = useState<string[]>(() => loadRecentClassroomIds());
  const [createOpen, setCreateOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [platformsByClassroomId, setPlatformsByClassroomId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    import("@/lib/classroom-integrations")
      .then(({ fetchClassroomIntegrationState }) => fetchClassroomIntegrationState())
      .then((state) => {
        if (active) setPlatformsByClassroomId(state.platformsByClassroomId);
      })
      .catch(() => {
        if (active) setPlatformsByClassroomId({});
      });
    return () => {
      active = false;
    };
  }, []);

  const activeSessions = data.sessions.filter((session) => session.status === "ACTIVE" && !session.endedAt);
  const filteredClassrooms = data.classrooms.filter((classroom) => {
    if (filter === "ACTIVE") return classroom.active;
    if (filter === "INACTIVE") return !classroom.active;
    return true;
  });
  const visibleClassrooms = orderOverviewClassrooms(filteredClassrooms, {
    query,
    sortMode,
    selectedClassroomId: data.activeClassroomId,
    activeSessionClassroomIds: activeSessions.map((session) => session.classroomId),
    recentClassroomIds,
  });
  const activeClassroomIds = new Set(data.classrooms.filter((classroom) => classroom.active).map((classroom) => classroom.id));
  const activeEnrollments = data.enrollments.filter((enrollment) => enrollment.active && activeClassroomIds.has(enrollment.classroomId));

  async function toggleClassroomActive(classroom: Classroom) {
    const hasActiveSession = activeSessions.some(
      (session) => session.classroomId === classroom.id,
    );

    if (classroom.active && hasActiveSession) {
      notify("Encerre a sessão ativa antes de desativar esta turma.");
      setOpenCardMenuId(null);
      return;
    }

    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: !classroom.active,
      });
      await refreshClassroomDomain(classroom.id);
      notify(classroom.active ? "Turma desativada." : "Turma reativada.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setOpenCardMenuId(null);
    }
  }

  return (
    <div className="stack-lg overview-page">
      <div className="metrics-grid overview-metrics">
        <Metric label="Turmas ativas" value={data.classrooms.filter((item) => item.active).length.toString()} hint={`${data.classrooms.length} cadastradas`} />
        <Metric label="Matrículas ativas" value={activeEnrollments.length.toString()} hint="vínculos em todas as turmas" />
        <Metric label="Atividades" value={data.activities.length.toString()} hint="conteúdo preparado" />
        <Metric label="Sessões agora" value={activeSessions.length.toString()} hint="sessões em andamento" />
      </div>

      <div className="overview-toolbar">
        <div className="overview-toolbar-main">
          <div className="segmented-control" aria-label="Filtrar turmas">
            <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>Todas <span>{data.classrooms.length}</span></button>
            <button className={filter === "ACTIVE" ? "active" : ""} onClick={() => setFilter("ACTIVE")}>Ativas <span>{data.classrooms.filter((item) => item.active).length}</span></button>
            <button className={filter === "INACTIVE" ? "active" : ""} onClick={() => setFilter("INACTIVE")}>Inativas <span>{data.classrooms.filter((item) => !item.active).length}</span></button>
          </div>

          <label className="overview-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou código"
              aria-label="Buscar turma por nome ou código"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                title="Limpar busca"
              >
                ×
              </button>
            )}
          </label>

          <select
            className="select overview-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ClassroomSortMode)}
            aria-label="Ordenar cards das turmas"
          >
            <option value="RECENT">Recentes primeiro</option>
            <option value="NAME_ASC">Nome A–Z</option>
            <option value="NAME_DESC">Nome Z–A</option>
            <option value="CODE_ASC">Código A–Z</option>
            <option value="CODE_DESC">Código Z–A</option>
          </select>
        </div>

        <div className="overview-toolbar-actions">
          <button className="button ghost" onClick={onOpenIntegrations}>⇄ Vincular plataforma</button>
          <button className="button primary overview-new-classroom" onClick={() => setCreateOpen(true)}>+ Nova turma</button>
        </div>
      </div>

      {!data.classrooms.length ? (
        <EmptyState
          title="Crie sua primeira turma"
          text="A Visão geral é o ponto de entrada do Arena Dev. Crie a turma e, na etapa seguinte, inclua os alunos."
          actionLabel="+ Nova turma"
          onAction={() => setCreateOpen(true)}
        />
      ) : !visibleClassrooms.length ? (
        <MiniEmpty text={query ? "Nenhuma turma encontrada para esta busca." : "Nenhuma turma corresponde a este filtro."} />
      ) : (
        <div className="classroom-card-grid">
          {visibleClassrooms.map((classroom) => {
            const studentCount = data.enrollments.filter((item) => item.classroomId === classroom.id && item.active).length;
            const activityCount = data.activities.filter((item) => item.classroomId === classroom.id).length;
            const eventCount = data.scoreEvents.filter((item) => item.classroomId === classroom.id).length;
            const session = activeSessions.find((item) => item.classroomId === classroom.id);
            return (
              <article
                key={classroom.id}
                className={`overview-class-card ${classroom.active ? "" : "inactive"} ${data.activeClassroomId === classroom.id ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectClassroom(classroom.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectClassroom(classroom.id);
                  }
                }}
              >
                <div className="overview-class-card-head">
                  <div className="overview-class-identity">
                    <div className="classroom-monogram">{classroom.name.trim().charAt(0).toUpperCase()}</div>
                    <div>
                      {!classroom.active && (
                        <div className="status-line">
                          <span className="status">Inativa</span>
                        </div>
                      )}
                      <h3>{classroom.name}</h3>
                      <p>{classroom.code || "Sem código"}</p>
                      {platformsByClassroomId[classroom.id]?.length ? (
                        <div className="classroom-integration-badges">
                          {platformsByClassroomId[classroom.id].map((platform) => (
                            <Badge key={platform} variant="success" dot>
                              {platform === "MICROSOFT_TEAMS"
                                ? "Microsoft Teams"
                                : platform === "GOOGLE_CLASSROOM"
                                  ? "Google Classroom"
                                  : platform}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="overview-card-actions">
                    <div
                      className="classroom-card-menu-wrap"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="icon-action classroom-card-menu-trigger"
                        title="Ações da turma"
                        aria-label={`Ações de ${classroom.name}`}
                        aria-expanded={openCardMenuId === classroom.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenCardMenuId((current) =>
                            current === classroom.id ? null : classroom.id
                          );
                        }}
                      >
                        ⋯
                      </button>

                      {openCardMenuId === classroom.id && (
                        <div className="classroom-card-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenCardMenuId(null);
                              onManageClassroom(classroom.id, "general");
                            }}
                          >
                            <span>✎</span>
                            Editar turma
                          </button>

                          <button
                            type="button"
                            disabled={classroom.active && Boolean(session)}
                            title={
                              classroom.active && session
                                ? "Encerre a sessão antes de desativar."
                                : undefined
                            }
                            onClick={() => { void toggleClassroomActive(classroom); }}
                          >
                            <span>{classroom.active ? "○" : "●"}</span>
                            {classroom.active ? "Desativar turma" : "Reativar turma"}
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() => {
                              setOpenCardMenuId(null);
                              onManageClassroom(classroom.id, "delete");
                            }}
                          >
                            <span>⌫</span>
                            Excluir turma
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overview-class-stats">
                  <div><strong>{studentCount}</strong><span>alunos</span></div>
                  <div><strong>{activityCount}</strong><span>atividades</span></div>
                  <div><strong>{eventCount}</strong><span>eventos XP</span></div>
                </div>
                <div className="overview-class-card-foot">
                  <span>
                    {session ? (
                      <span className="live-pill compact"><span /> SESSÃO EM ANDAMENTO</span>
                    ) : classroom.active ? null : (
                      "Arquivada do fluxo ativo"
                    )}
                  </span>
                  <strong>Abrir</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {createOpen && (
        <ClassroomCreateModal
          data={data}
          onClose={() => setCreateOpen(false)}
          onCreated={(classroomId) => { setCreateOpen(false); onSelectClassroom(classroomId); }}
          notify={notify}
          refreshClassroomDomain={refreshClassroomDomain}
        />
      )}
    </div>
  );
}

function ClassroomWorkspaceTabs({ tab, onTabChange, studentCount, activityCount, eventCount }: {
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
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
              {badge !== undefined && <small>{badge}</small>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ClassroomHome({ classroom, data, students, leaderboard, events, currentSession, onOpenArena, onManageClassroom, onManageIntegration, notify, refreshClassroomDomain }: {
  classroom: Classroom;
  data: ArenaData;
  students: Student[];
  leaderboard: { student: Student; xp: number }[];
  events: ArenaData["scoreEvents"];
  currentSession?: ArenaData["sessions"][number];
  onOpenArena: () => void;
  onManageClassroom: () => void;
  onManageIntegration: () => void;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const totalXp = leaderboard.reduce((sum, row) => sum + row.xp, 0);
  const today = new Date().toDateString();
  const todayEvents = events.filter((event) => new Date(event.createdAt).toDateString() === today);
  const activityCount = data.activities.filter((activity) => activity.classroomId === classroom.id).length;
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
      <section className="classroom-home-hero-v2" style={classroomTheme.style}>
        <div className="classroom-home-watermark" aria-hidden>{classroomTheme.glyph}</div>
        <div className="classroom-home-hero-main">
          <div>
            <span className="eyebrow accent">HOME DA TURMA</span>
            <h2>{classroom.name}</h2>
            <p>Contexto pedagógico para alunos, atividades, ranking, histórico e preparação da aula.</p>
          </div>

          <button
            className="button ghost classroom-manage-button"
            onClick={onManageClassroom}
          >
            Gerenciar turma
          </button>
        </div>

        <div className="classroom-home-hero-cta">
          <div className="arena-launch-shell">
            <button
              className={`arena-launch-button arena-launch-button-centered arena-launch-button-${arenaCta.tone} ${arenaCta.live ? "live" : ""}`}
              onClick={onOpenArena}
              disabled={arenaCta.disabled}
            >
              <span className="arena-launch-icon" aria-hidden>{arenaCta.icon}</span>
              <span className="arena-launch-content">
                <strong>{arenaCta.buttonLabel}</strong>
                <small>{arenaCta.supportingLabel}</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="metrics-grid">
        <Metric label="Alunos ativos" value={students.length.toString()} hint="matriculados nesta turma" />
        <Metric label="Atividades" value={activityCount.toString()} hint="conteúdo da turma" />
        <Metric label="XP distribuído" value={totalXp.toString()} hint="acumulado da turma" />
        <Metric
          label="Sessão"
          value={currentSession ? "SESSÃO EM ANDAMENTO" : "—"}
          hint={currentSession ? currentSession.title : `${todayEvents.length} evento(s) hoje`}
        />
      </div>

      <ClassroomIntegrationWorkspace
        classroomId={classroom.id}
        studentCount={students.length}
        activityCount={activityCount}
        onManage={onManageIntegration}
      />

    </div>
  );
}

function StudentsView({ data, classroomId, notify, refreshClassroomDomain }: {
  data: ArenaData;
  classroomId: string;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  return (
    <StudentManager
      data={data}
      classroomId={classroomId}
      notify={notify}
      refreshClassroomDomain={refreshClassroomDomain}
      showSummary
      showPageHeader
    />
  );
}

function StudentManager({
  data,
  classroomId,
  notify,
  refreshClassroomDomain,
  showSummary = false,
  showPageHeader = false,
}: {
  data: ArenaData;
  classroomId: string;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
  showSummary?: boolean;
  showPageHeader?: boolean;
}) {
  const [entryMode, setEntryMode] = useState<"add" | "import" | null>(null);
  const [name, setName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [preferredDrafts, setPreferredDrafts] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const allRows = data.enrollments
    .filter((enrollment) => enrollment.classroomId === classroomId)
    .map((enrollment) => ({
      enrollment,
      student: data.students.find((student) => student.id === enrollment.studentId)!,
    }))
    .filter((row) => row.student)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
  const activeCount = allRows.filter((row) => row.enrollment.active).length;
  const importCount = bulk.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean).length;

  async function addStudent(studentName: string, studentPreferredName = "", silent = false) {
    if (!studentName.trim() || (!silent && busy)) return false;
    if (!silent) setBusy(true);
    try {
      await createAndEnrollStudent(classroomId, {
        name: studentName.trim(),
        preferredName: studentPreferredName.trim(),
      });
      if (!silent) {
        await refreshClassroomDomain(classroomId);
        notify("Aluno adicionado à turma.");
      }
      return true;
    } catch (error) {
      if (!silent) notify(errorMessage(error));
      return false;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function submitSingleStudent() {
    const created = await addStudent(name, preferredName);
    if (!created) return;
    setName("");
    setPreferredName("");
    setEntryMode(null);
  }

  async function importStudents() {
    const names = bulk.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
    if (!names.length || busy) return;
    setBusy(true);
    let imported = 0;
    try {
      for (const studentName of names) {
        if (await addStudent(studentName, "", true)) imported += 1;
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
    if (!window.confirm(`Remover ${studentName} desta turma? O cadastro global do aluno será preservado.`)) return;
    setBusy(true);
    try {
      await removeEnrollment(classroomId, studentId);
      await refreshClassroomDomain(classroomId);
      notify("Aluno removido da turma.");
    } catch (error) {
      notify(errorMessage(error));
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
      notify("Nome público atualizado.");
    } catch (error) {
      notify(errorMessage(error));
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
      notify(active ? "Aluno inativado na turma." : "Aluno reativado na turma.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="student-manager-header-actions">
      <button className="button ghost" type="button" onClick={() => setEntryMode("import")}>Importar lista</button>
      <button className="button primary" type="button" onClick={() => setEntryMode("add")}>+ Adicionar aluno</button>
    </div>
  );

  return (
    <div className="student-manager stack-lg">
      {showPageHeader ? (
        <div className="page-action-bar student-page-action-bar">
          <div>
            <span className="eyebrow accent">ALUNOS</span>
            <h2>Participantes da turma</h2>
            <p>Gerencie participantes, nomes públicos e vínculos sem poluir a área de trabalho.</p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="student-manager-compact-actions">
          <div><strong>Participantes</strong><small>{activeCount} ativos · {allRows.length} cadastrados</small></div>
          {actions}
        </div>
      )}

      {(showSummary || allRows.length > 0) && (
        <Panel title="Alunos da turma" subtitle={`${activeCount} ativos · ${allRows.length} cadastrados`}>
          {!allRows.length ? <MiniEmpty text="Nenhum aluno cadastrado nesta turma." /> : (
            <div className="student-table student-table-v2">
              <div className="table-head student-table-head-v2">
                <span>Aluno</span><span>Nome público</span><span>Status</span><span>XP</span><span aria-label="Ações" />
              </div>
              {allRows.map(({ student, enrollment }) => {
                const xp = xpForStudent(data.scoreEvents, classroomId, student.id);
                const draft = preferredDrafts[student.id] ?? enrollment.preferredName;
                const dirty = draft !== enrollment.preferredName;
                return (
                  <div className="table-row student-table-row-v2" key={enrollment.id}>
                    <div className="student-cell student-identity-v2">
                      <Avatar student={student} />
                      <div><strong>{student.name}</strong><small>Exibição atual: {enrollment.preferredName || student.nickname || student.name}</small></div>
                    </div>
                    <div className="student-public-name-editor">
                      <input
                        className="input"
                        aria-label={`Nome público de ${student.name}`}
                        value={draft}
                        onChange={(event) => setPreferredDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && dirty && !busy) {
                            event.preventDefault();
                            void savePreferredName(student.id, draft);
                          }
                        }}
                        placeholder="Nome público"
                        disabled={busy}
                      />
                      <button
                        className="button ghost student-save-name-button"
                        type="button"
                        disabled={busy || !dirty}
                        onClick={() => { void savePreferredName(student.id, draft); }}
                      >
                        Salvar
                      </button>
                    </div>
                    <span className={enrollment.active ? "status active" : "status"}>{enrollment.active ? "Ativo" : "Inativo"}</span>
                    <b className="student-xp">{xp} XP</b>
                    <Menu
                      trigger={(triggerProps) => (
                        <button {...triggerProps} type="button" className="student-row-menu-trigger" aria-label={`Ações de ${student.name}`}>⋯</button>
                      )}
                    >
                      <MenuItem onSelect={() => { void toggleStudent(student.id, enrollment.active); }}>
                        {enrollment.active ? "Inativar aluno" : "Reativar aluno"}
                      </MenuItem>
                      <MenuItem danger onSelect={() => { void removeStudent(student.id, student.name); }}>Remover da turma</MenuItem>
                    </Menu>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {entryMode === "add" && (
        <Modal open title="Adicionar aluno" subtitle="Cadastro individual" onClose={() => { if (!busy) setEntryMode(null); }} size="medium">
          <div className="modal-section-stack">
            <label className="field"><span>Nome completo</span><input className="input" autoFocus placeholder="Ex.: Ana Luiza de Sousa" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></label>
            <label className="field">
              <span>Nome público <small>opcional</small></span>
              <input
                className="input"
                placeholder="Como aparecerá nesta turma"
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && name.trim() && !busy) {
                    event.preventDefault();
                    void submitSingleStudent();
                  }
                }}
                disabled={busy}
              />
            </label>
            <div className="modal-footer">
              <button className="button ghost" onClick={() => setEntryMode(null)} disabled={busy}>Cancelar</button>
              <button className="button primary" disabled={busy || !name.trim()} onClick={() => { void submitSingleStudent(); }}>{busy ? "Adicionando..." : "Adicionar aluno"}</button>
            </div>
          </div>
        </Modal>
      )}

      {entryMode === "import" && (
        <Modal open title="Importar alunos" subtitle="Um aluno por linha" onClose={() => { if (!busy) setEntryMode(null); }} size="medium">
          <div className="modal-section-stack">
            <label className="field">
              <span>Lista de nomes</span>
              <textarea className="textarea student-import-textarea" rows={10} placeholder={"Ana Luiza\nCarlos Henrique\nJoão Pedro"} value={bulk} onChange={(event) => setBulk(event.target.value)} disabled={busy} />
            </label>
            <div className="inline-note">
              {importCount
                ? <><strong>{importCount} aluno(s) identificado(s)</strong><span>Revise a lista antes de importar.</span></>
                : <span>Cole um nome por linha. Também aceitamos nomes separados por ponto e vírgula.</span>}
            </div>
            <div className="modal-footer">
              <button className="button ghost" onClick={() => setEntryMode(null)} disabled={busy}>Cancelar</button>
              <button className="button primary" disabled={busy || !importCount} onClick={() => { void importStudents(); }}>{busy ? "Importando..." : `Importar ${importCount || ""} aluno(s)`}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClassroomCreateModal({ data, onClose, onCreated, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onClose: () => void;
  onCreated: (classroomId: string) => void;
  notify: (message: string) => void;
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
      notify(errorMessage(error));
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
          <div className="modal-footer"><button className="button ghost" onClick={() => onCreated(createdId)}>Concluir por enquanto</button><button className="button primary" onClick={() => onCreated(createdId)}>Abrir turma</button></div>
        </div>
      ) : (
        <MiniEmpty text="Atualizando dados da turma..." />
      )}
    </Modal>
  );
}

function ClassroomManagementPage({
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
  notify: (message: string) => void;
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
      });
      await refreshClassroomDomain(classroom.id);
      notify("Configurações da turma salvas.");
    } catch (error) {
      notify(errorMessage(error));
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
      });
      await refreshClassroomDomain(classroom.id);
      notify(archived ? "Turma arquivada. O histórico foi preservado." : "Turma reativada.");
      setManagementAction(null);
    } catch (error) {
      notify(errorMessage(error));
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
      notify(errorMessage(error));
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
                      style={{ background: option.value }}
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

              <div className="classroom-appearance-preview classroom-settings-preview" style={appearancePreview.style}>
                <span className="classroom-appearance-preview-icon" aria-hidden>{appearancePreview.glyph}</span>
                <div>
                  <small>Pré-visualização</small>
                  <strong>{name.trim() || classroom.name}</strong>
                  <span>{code.trim() || classroom.code || "Sem código"}</span>
                </div>
              </div>
            </div>
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


function ArenaView({ data, classroomId, students, currentSession, sessionParticipants, preferredActivityId, onPreferredActivityChange, onBack, onSessionEnded, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  sessionParticipants: SessionParticipant[];
  preferredActivityId?: string;
  onPreferredActivityChange: (activityId?: string) => void;
  onBack: () => void;
  onSessionEnded: () => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  const [presentIds, setPresentIds] = useState<string[]>(students.map((s) => s.id));
  const [activeDynamic, setActiveDynamic] = useState<ArenaDynamic>("draw");
  const [activeTool, setActiveTool] = useState<ArenaTool>(null);
  const [title, setTitle] = useState(`Aula · ${todayTitle()}`);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentSession?.lastDrawnStudentId);
  const [drawPhase, setDrawPhase] = useState<"idle" | "drawing">("idle");
  const [drawRotation, setDrawRotation] = useState(0);
  const [drawSettingsOpen, setDrawSettingsOpen] = useState(false);
  const [reason, setReason] = useState("Resposta correta");
  const [customPoints, setCustomPoints] = useState(10);
  const [groups, setGroups] = useState<string[][]>(currentSession?.groups ?? []);
  const [groupSize, setGroupSize] = useState(currentSession?.groupSize ?? 2);
  const [bossName, setBossName] = useState("Spaghetti Code");
  const [bossHp, setBossHp] = useState(100);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [presenceBusyId, setPresenceBusyId] = useState<string | undefined>();
  const [mechanicsBusy, setMechanicsBusy] = useState(false);
  const [joinCode, setJoinCode] = useState<JoinCode | null>(null);
  const [buzzerState, setBuzzerState] = useState<BuzzerState>({ status: "IDLE", presses: [] });
  const [timerState, setTimerState] = useState<TimerState>({ timer: null });
  const [wordCloudState, setWordCloudState] = useState<WordCloudState>({ round: null });
  const [pollState, setPollState] = useState<PollState>({ round: null });
  const [quizState, setQuizState] = useState<QuizState>({ round: null });
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [realtimeBusy, setRealtimeBusy] = useState(false);
  const [liveFlowState, setLiveFlowState] = useState<LiveFlowState | null>(null);
  const [liveFlowBusy, setLiveFlowBusy] = useState(false);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const classroom = data.classrooms.find((item) => item.id === classroomId);
  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId),
    [data.activities, classroomId],
  );
  const [activityId, setActivityId] = useState<string>(currentSession?.activityId ?? preferredActivityId ?? "");

  useEffect(() => {
    if (typeof window !== "undefined") setPublicBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!currentSession) return;
    setSessionNow(Date.now());
    const intervalId = window.setInterval(() => setSessionNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession) {
      setSessionEvents([]);
      return;
    }

    let active = true;
    void fetchSessionEventsBySession(currentSession.id)
      .then((events) => {
        if (active) setSessionEvents(events);
      })
      .catch(() => {
        if (active) setSessionEvents([]);
      });

    return () => {
      active = false;
    };
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession) {
      setLiveFlowState(null);
      return;
    }

    let active = true;
    void fetchLiveFlow(currentSession.id)
      .then((flow) => {
        if (active) setLiveFlowState(flow);
      })
      .catch((error) => {
        if (active) notify(errorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [currentSession?.id, currentSession?.activityId]);

  async function refreshRealtimeParticipants(sessionId: string) {
    try {
      const participants = await fetchSessionParticipants(sessionId);
      patch((current) => ({
        ...current,
        sessionParticipants: [
          ...current.sessionParticipants.filter((participant) => participant.sessionId !== sessionId),
          ...participants,
        ],
        sessions: current.sessions.map((session) => session.id === sessionId ? {
          ...session,
          presentStudentIds: participants.filter((participant) => participant.present).map((participant) => participant.studentId),
        } : session),
      }));
    } catch {
      // O próximo evento ou reload fará uma nova sincronização.
    }
  }

  useEffect(() => {
    if (!currentSession) {
      setJoinCode(null);
      setBuzzerState({ status: "IDLE", presses: [] });
      setTimerState({ timer: null });
      setWordCloudState({ round: null });
      setPollState({ round: null });
      setQuizState({ round: null });
      setRealtimeStatus("offline");
      return;
    }

    let active = true;
    let reconnectTimer: number | undefined;
    setRealtimeStatus("connecting");

    void Promise.all([
      fetchJoinCode(currentSession.id),
      fetchBuzzerState(currentSession.id),
      fetchWordCloudState(currentSession.id),
      fetchPollState(currentSession.id),
      fetchQuizState(currentSession.id),
    ])
      .then(([code, buzzer, wordCloud, poll, quiz]) => {
        if (!active) return;
        setJoinCode(code);
        setBuzzerState(buzzer);
        setWordCloudState(wordCloud);
        setPollState(poll);
        setQuizState(quiz);
        if (buzzer.presses[0]) setSelectedId(buzzer.presses[0].studentId);
      })
      .catch((error) => { if (active) notify(errorMessage(error)); });

    const socket = connectSessionSocket(currentSession.id, (event: SessionRealtimeEvent) => {
      if (!active) return;
      if (event.type === "BUZZER_STATE") {
        const state = event.payload as BuzzerState;
        setBuzzerState(state);
        if (state.presses[0]) setSelectedId(state.presses[0].studentId);
      }
      if (event.type === "TIMER_STATE") {
        setTimerState({
          ...(event.payload as TimerState),
          serverOccurredAt: event.occurredAt,
          receivedAtMs: Date.now(),
        });
      }
      if (event.type === "WORD_CLOUD_STATE") {
        setWordCloudState(event.payload as WordCloudState);
      }
      if (event.type === "POLL_STATE") {
        setPollState(event.payload as PollState);
      }
      if (event.type === "QUIZ_STATE") {
        setQuizState(event.payload as QuizState);
      }
      if (event.type === "PARTICIPANT_CONNECTED" || event.type === "PARTICIPANT_DISCONNECTED") {
        void refreshRealtimeParticipants(currentSession.id);
      }
      if (event.type === "SESSION_FINISHED") setRealtimeStatus("offline");
    });
    socket.onopen = () => setRealtimeStatus("online");
    socket.onerror = () => setRealtimeStatus("offline");
    socket.onclose = () => {
      if (!active) return;
      setRealtimeStatus("offline");
      reconnectTimer = window.setTimeout(() => setRealtimeVersion((value) => value + 1), 1500);
    };

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [currentSession?.id, realtimeVersion]);

  useEffect(() => {
    if (preferredActivityId) {
      if (currentSession && currentSession.activityId !== preferredActivityId) void changeArenaActivity(preferredActivityId);
      else if (!currentSession) setActivityId(preferredActivityId);
      onPreferredActivityChange(undefined);
      return;
    }
    if (currentSession?.activityId) setActivityId(currentSession.activityId);
  }, [currentSession?.activityId, currentSession?.id, preferredActivityId]);

  useEffect(() => {
    if (!currentSession) setPresentIds(students.map((s) => s.id));
  }, [students, currentSession]);

  useEffect(() => {
    setSelectedId(currentSession?.lastDrawnStudentId);
  }, [currentSession?.id, currentSession?.lastDrawnStudentId]);

  useEffect(() => {
    setGroups(currentSession?.groups ?? []);
    setGroupSize(currentSession?.groupSize ?? 2);
  }, [currentSession?.id, currentSession?.groups, currentSession?.groupSize]);

  async function startSession() {
    if (!presentIds.length || sessionBusy) return;
    setSessionBusy(true);
    try {
      const result = await createSessionApi({
        classroomId,
        title: title.trim() || `Aula · ${todayTitle()}`,
        presentStudentIds: presentIds,
      });
      let started = result.session;
      if (activityId) {
        const runtime = await setArenaActivityApi(result.session.id, activityId);
        started = mergeSessionMechanics(started, runtime);
      }
      patch((current) => ({
        ...current,
        sessions: [...current.sessions.filter((session) => session.id !== started.id), started],
        sessionParticipants: [
          ...current.sessionParticipants.filter((participant) => participant.sessionId !== started.id),
          ...result.participants,
        ],
        currentSessionId: started.id,
      }));
      setActiveDynamic(activityId ? "runbook" : "draw");
      setActiveTool(null);
      notify("Arena iniciada. Sessão e mecânicas estão no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setSessionBusy(false);
    }
  }

  async function endSession() {
    if (!currentSession || sessionBusy) return;
    const confirmed = window.confirm(
      `Encerrar a sessão "${currentSession.title}"?\n\n`
      + "Participantes deixarão a sessão ativa. Histórico, XP e atividades permanecem salvos."
    );
    if (!confirmed) return;
    setSessionBusy(true);
    try {
      const finished = await finishSessionApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id ? {
          ...session,
          status: finished.status,
          endedAt: finished.endedAt,
        } : session),
        currentSessionId: undefined,
      }));
      setSelectedId(undefined);
      setGroups([]);
      setActiveDynamic("draw");
      setActiveTool(null);
      setLiveFlowState(null);
      onPreferredActivityChange(undefined);
      notify("Sessão encerrada e persistida.");

      // Navega em uma nova task depois que o estado da sessão foi limpo.
      window.setTimeout(() => {
        onSessionEnded();
      }, 0);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setSessionBusy(false);
    }
  }

  async function changePresence(participant: SessionParticipant, present: boolean) {
    if (!currentSession || presenceBusyId) return;
    setPresenceBusyId(participant.id);
    try {
      const updated = await setParticipantPresence(currentSession.id, participant.id, present);
      patch((current) => ({
        ...current,
        sessionParticipants: current.sessionParticipants.map((item) => item.id === updated.id ? updated : item),
        sessions: current.sessions.map((session) => session.id === currentSession.id ? {
          ...session,
          presentStudentIds: present
            ? Array.from(new Set([...session.presentStudentIds, updated.studentId]))
            : session.presentStudentIds.filter((studentId) => studentId !== updated.studentId),
        } : session),
      }));
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setPresenceBusyId(undefined);
    }
  }

  async function releaseDevice(participant: SessionParticipant) {
    if (!currentSession || presenceBusyId) return;
    setPresenceBusyId(participant.id);
    try {
      const updated = await releaseParticipantDevice(currentSession.id, participant.id);
      patch((current) => ({
        ...current,
        sessionParticipants: current.sessionParticipants.map((item) => item.id === updated.id ? updated : item),
      }));
      notify(`Dispositivo de ${participant.displayName || participant.preferredName || participant.nickname || participant.name} liberado.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setPresenceBusyId(undefined);
    }
  }

  async function draw() {
    if (!currentSession || drawPhase === "drawing" || mechanicsBusy) return;
    const participants = students.filter((student) => currentSession.presentStudentIds.includes(student.id));
    if (!participants.length) {
      notify("Nenhum aluno presente está disponível para o sorteio.");
      return;
    }

    setDrawPhase("drawing");
    setMechanicsBusy(true);
    setSelectedId(undefined);

    try {
      const result = await drawStudentApi(currentSession.id);
      const targetIndex = participants.findIndex((student) => student.id === result.studentId);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (targetIndex >= 0) {
        const targetResidue = ((-(targetIndex / participants.length) * 360) % 360 + 360) % 360;
        setDrawRotation((currentRotation) => {
          const currentResidue = ((currentRotation % 360) + 360) % 360;
          const alignmentDelta = (targetResidue - currentResidue + 360) % 360;
          return currentRotation + (reducedMotion ? alignmentDelta : 1080 + alignmentDelta);
        });
      }

      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));

      await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 80 : 1800));
      setSelectedId(result.studentId);

      void fetchSessionEventsBySession(currentSession.id)
        .then(setSessionEvents)
        .catch(() => undefined);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setDrawPhase("idle");
      setMechanicsBusy(false);
    }
  }

  async function addScore(points: number, category: ScoreCategory, description: string) {
    if (!selectedId || !currentSession) return;
    try {
      const event = await createScoreEventApi({
        classroomId,
        studentId: selectedId,
        sessionId: currentSession.id,
        points,
        category,
        description,
        source: "ARENA",
        activityId: currentSession.activityId,
        questionId: currentSession.currentQuestionId,
      });
      patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, event] }));
      notify(`${points >= 0 ? "+" : ""}${points} XP registrado no PostgreSQL.`);
    } catch (error) {
      notify(errorMessage(error));
    }
  }

  async function changeArenaActivity(nextActivityId: string) {
    setActivityId(nextActivityId);
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await setArenaActivityApi(
        currentSession.id,
        nextActivityId || undefined,
      );
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === currentSession.id
            ? mergeSessionMechanics(session, runtime)
            : session
        ),
      }));

      const flow = await fetchLiveFlow(currentSession.id);
      setLiveFlowState(flow);

      notify(
        nextActivityId
          ? "Atividade conectada à Arena e persistida."
          : "Arena em modo livre.",
      );
    } catch (error) {
      setActivityId(currentSession.activityId ?? "");
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  function applyLiveFlowResult(result: {
    liveFlow: LiveFlowState;
    runtime: import("@/lib/types").SessionRuntimeState;
  }) {
    setLiveFlowState(result.liveFlow);
    if (!currentSession) return;

    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session
      ),
    }));
  }

  async function startPreparedFlow() {
    if (!currentSession || liveFlowBusy) return;
    setLiveFlowBusy(true);
    try {
      applyLiveFlowResult(await startLiveFlow(currentSession.id));
      notify("Roteiro ao Vivo iniciado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setLiveFlowBusy(false);
    }
  }

  async function movePreparedFlow(direction: "previous" | "next") {
    if (!currentSession || liveFlowBusy) return;
    setLiveFlowBusy(true);
    try {
      const result = direction === "next"
        ? await nextLiveFlow(currentSession.id)
        : await previousLiveFlow(currentSession.id);
      applyLiveFlowResult(result);

      const currentIndex = result.liveFlow.currentIndex;
      const currentStep =
        currentIndex === undefined
          ? undefined
          : result.liveFlow.steps[currentIndex];

      if (currentStep) {
        notify(
          `Bloco ${currentIndex! + 1} de ${result.liveFlow.steps.length}: `
          + `${currentStep.title || currentStep.type}.`
        );
      }
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setLiveFlowBusy(false);
    }
  }

  async function nextActivityQuestion() {
    if (!currentSession?.activityId || mechanicsBusy) {
      if (!currentSession?.activityId) notify("Selecione uma atividade com questões ou use o modo livre.");
      return;
    }
    setMechanicsBusy(true);
    try {
      const result = await nextArenaQuestionApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      if (result.completed) notify("Todas as questões desta atividade já foram apresentadas.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function restartActivityQuestions() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await restartArenaQuestionsApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
      notify("Sequência de questões reiniciada.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function createGroups() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const result = await organizeGroupsApi(currentSession.id, groupSize);
      setGroups(result.groups);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      notify(groupSize === 1 ? "Organização individual ativada." : `${result.groups.length} grupo(s) organizado(s) com histórico persistido.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function createBoss() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await startBossApi(currentSession.id, bossName.trim() || "Boss", bossHp);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
      notify("Boss iniciado e persistido.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function damageBoss(amount: number) {
    if (!currentSession?.boss || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await damageBossApi(currentSession.id, amount);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function rotateSessionCode() {
    if (!currentSession || realtimeBusy) return;
    setRealtimeBusy(true);
    try {
      const next = await rotateJoinCode(currentSession.id);
      setJoinCode(next);
      notify("Novo código da sessão gerado. O anterior foi invalidado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setRealtimeBusy(false);
    }
  }

  async function toggleBuzzer(open: boolean) {
    if (!currentSession || realtimeBusy) return;
    setRealtimeBusy(true);
    try {
      const state = open ? await openBuzzerApi(currentSession.id) : await closeBuzzerApi(currentSession.id);
      setBuzzerState(state);
      if (open) setSelectedId(undefined);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setRealtimeBusy(false);
    }
  }

  async function addBuzzerScore(studentId: string, points: number) {
    if (!currentSession) return;
    try {
      const event = await createScoreEventApi({
        classroomId,
        studentId,
        sessionId: currentSession.id,
        points,
        category: "QUESTION",
        description: "Buzzer · resposta correta",
        source: "BUZZER",
      });
      patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, event] }));
      notify(`+${points} XP do Buzzer registrado.`);
    } catch (error) {
      notify(errorMessage(error));
    }
  }

  async function copySessionCode() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode.code);
      notify("Código da sessão copiado.");
    } catch {
      notify("Não foi possível copiar o código automaticamente.");
    }
  }

  function openProjector() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }
    const projectorUrl = `/projector?code=${encodeURIComponent(joinCode.code)}`;
    window.open(projectorUrl, "_blank", "noopener,noreferrer");
  }

  const selected = students.find((student) => student.id === selectedId);
  const selectedXp = selected ? xpForStudent(data.scoreEvents, classroomId, selected.id) : 0;
  const activeActivity = data.activities.find((activity) => activity.id === (currentSession?.activityId ?? activityId));
  const currentQuestion = activeActivity?.questions?.find((question) => question.id === currentSession?.currentQuestionId);
  const recentDrawEvents = sessionEvents
    .filter((event) => event.eventType === "DRAW_COMPLETED")
    .sort((a, b) => b.sequenceNo - a.sequenceNo);
  const drawnStudentIds = new Set(
    Object.entries(currentSession?.drawCounts ?? {})
      .filter(([, count]) => count > 0)
      .map(([studentId]) => studentId),
  );
  const drawCoverage = currentSession?.presentStudentIds.length
    ? Math.round((drawnStudentIds.size / currentSession.presentStudentIds.length) * 100)
    : 0;
  const selectedDrawEvent = selectedId
    ? recentDrawEvents.find((event) => event.payload.studentId === selectedId)
    : undefined;
  const bossHpPercent = currentSession?.boss
    ? Math.max(0, Math.round((currentSession.boss.currentHp / currentSession.boss.maxHp) * 100))
    : 0;
  const bossDamageTotal = currentSession?.boss
    ? currentSession.boss.maxHp - currentSession.boss.currentHp
    : 0;
  const bossPhase = !currentSession?.boss
    ? "Aguardando"
    : currentSession.boss.currentHp === 0
      ? "Derrotado"
      : bossHpPercent <= 30
        ? "Crítico"
        : bossHpPercent <= 70
          ? "Enfraquecido"
          : "Inteiro";
  const visibleParticipants = sessionParticipants.filter((participant) => {
    const student = data.students.find((item) => item.id === participant.studentId);
    const query = participantSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      student?.name,
      student?.nickname,
      participant.displayName,
      participant.preferredName,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  if (!currentSession) {
    return (
      <div className="two-col uneven">
        <Panel title="Abrir nova sessão" subtitle="A presença define quem participa dos sorteios">
          <div className="form-grid">
            <label className="field-label">Título da sessão</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="field-label">Fonte dos desafios</label>
            <select className="select full" value={activityId} onChange={(e) => { void changeArenaActivity(e.target.value); }}>
              <option value="">Modo livre — pergunta oral ou conteúdo externo</option>
              {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}
            </select>
            {activeActivity && (
              <div className="arena-source-note">
                <strong>{activeActivity.title}</strong>
                <span>
                  {activeActivity.topic || "Sem tópico"} ·{" "}
                  {liveFlowState?.activityId === activeActivity.id
                    && liveFlowState.steps.length > 0
                    ? `${liveFlowState.steps.length} bloco(s) no roteiro`
                    : `${activeActivity.questions?.length ?? 0} questão(ões)`}
                </span>
              </div>
            )}
          </div>
          <div className="attendance-head"><strong>Presença</strong><span>{presentIds.length}/{students.length} presentes</span></div>
          <div className="attendance-list">
            {students.map((student) => (
              <label key={student.id} className="check-row">
                <input type="checkbox" checked={presentIds.includes(student.id)} onChange={(e) => setPresentIds((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />
                <Avatar student={student} />
                <span>{student.name}</span>
              </label>
            ))}
          </div>
          <div className="inline-actions"><button className="text-button" onClick={() => setPresentIds(students.map((s) => s.id))}>Marcar todos</button><button className="text-button" onClick={() => setPresentIds([])}>Limpar</button></div>
          <button className="button primary large full" onClick={() => { void startSession(); }} disabled={!presentIds.length || sessionBusy}>{sessionBusy ? "Iniciando..." : "Iniciar Arena"}</button>
        </Panel>
        <Panel title="Como funciona" subtitle="Fluxo recomendado em aula">
          <div className="steps">
            <Step n="01" title="Todos pensam" text="Apresente a questão antes do sorteio para manter a turma inteira ativa." />
            <Step n="02" title="Sorteio inteligente" text="Quem foi menos sorteado ganha mais peso; a repetição imediata é evitada." />
            <Step n="03" title="Registre XP" text="Resposta, debug, desafio, colaboração ou ajuste ficam no histórico." />
            <Step n="04" title="Varie a dinâmica" text="Use Boss Battle e duplas/grupos para alternar competição e cooperação." />
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="stack-lg arena-session-workspace">
      <div className="arena-header compact arena-desktop-session-header">
        <div className="arena-session-context">
          <button type="button" className="arena-back-to-class" onClick={onBack} aria-label="Voltar para a turma">
            ←
          </button>
          <div>
            <span className="arena-session-breadcrumb">
              {classroom?.name ?? "Turma"} · {ARENA_DYNAMIC_LABELS[activeDynamic]}
            </span>
            <div className="arena-session-title-row">
              <h2>{currentSession.title}</h2>
              <Badge variant="live" dot>AO VIVO</Badge>
            </div>
          </div>
        </div>

        <div className="topbar-actions arena-session-actions">
          <div className="arena-session-elapsed" aria-label={`Tempo de sessão ${formatSessionElapsed(currentSession.startedAt, sessionNow)}`}>
            <span aria-hidden="true">◷</span>
            <div>
              <strong>{formatSessionElapsed(currentSession.startedAt, sessionNow)}</strong>
              <small>Tempo de sessão</small>
            </div>
          </div>
          <Button
            variant={activeTool === "attendance" ? "primary" : "secondary"}
            onClick={() => setActiveTool((tool) => tool === "attendance" ? null : "attendance")}
            disabled={!joinCode}
          >
            Presença
          </Button>
          <Button
            variant="secondary"
            onClick={openProjector}
            disabled={!joinCode}
          >
            Modo Projetor ↗
          </Button>
          <Button
            variant="danger"
            loading={sessionBusy}
            loadingLabel="Encerrando..."
            onClick={() => { void endSession(); }}
          >
            Encerrar sessão
          </Button>
        </div>
      </div>

      <div className="arena-cockpit">
        <aside className="arena-cockpit-nav" aria-label="Ferramentas da Arena">
          <div className="arena-cockpit-nav-group">
            <span className="arena-cockpit-nav-label">DINÂMICAS</span>
            {([
              ["draw", "◎", "Sorteio"],
              ["quiz", "?", "Quiz"],
              ["poll", "◉", "Votação"],
              ["wordcloud", "☁", "Nuvem de Palavras"],
              ["buzzer", "⚡", "Buzzer"],
              ["boss", "◆", "Boss Battle"],
            ] as const).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                className={activeDynamic === id ? "active" : ""}
                aria-current={activeDynamic === id ? "page" : undefined}
                onClick={() => {
                  setActiveDynamic(id);
                  setActiveTool(null);
                }}
              >
                <span aria-hidden="true">{icon}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>

          <div className="arena-cockpit-nav-group">
            <span className="arena-cockpit-nav-label">FERRAMENTAS</span>
            <button type="button" className={activeDynamic === "runbook" ? "active" : ""} onClick={() => { setActiveDynamic("runbook"); setActiveTool(null); }}>
              <span aria-hidden="true">▶</span><strong>Roteiro da aula</strong>
            </button>
            <button type="button" className={activeTool === "timer" ? "active" : ""} onClick={() => setActiveTool("timer")}>
              <span aria-hidden="true">◷</span><strong>Timer</strong>
            </button>
            <button type="button" className={activeTool === "groups" ? "active" : ""} onClick={() => setActiveTool("groups")}>
              <span aria-hidden="true">👥</span><strong>Organizar turma</strong>
            </button>
            <button type="button" className={activeTool === "attendance" ? "active" : ""} onClick={() => setActiveTool("attendance")}>
              <span aria-hidden="true">✓</span><strong>Presença</strong>
            </button>
            <button type="button" className={activeTool === "score" ? "active" : ""} onClick={() => setActiveTool("score")}>
              <span aria-hidden="true">＋</span><strong>Pontuação rápida</strong>
            </button>
          </div>
        </aside>

        <main className="arena-cockpit-main">

      {activeDynamic === "runbook" && (
        <div className="stack-lg arena-tab-content">
          <div className="arena-activity-strip">
            <div>
              <span className="eyebrow accent">FONTE DA ARENA</span>
              <strong>{activeActivity?.title ?? "Modo livre"}</strong>
            </div>
            <select className="select" value={currentSession.activityId ?? ""} onChange={(e) => { void changeArenaActivity(e.target.value); }}>
              <option value="">Modo livre</option>
              {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
            </select>
          </div>

          {activeActivity
            && liveFlowState?.activityId === activeActivity.id
            && liveFlowState.steps.length > 0 ? (
              <LiveFlowConductor
                flow={liveFlowState}
                currentQuestion={currentQuestion}
                busy={liveFlowBusy}
                onStart={() => { void startPreparedFlow(); }}
                onPrevious={() => { void movePreparedFlow("previous"); }}
                onNext={() => { void movePreparedFlow("next"); }}
                onOpenWordCloud={() => {
                  setActiveDynamic("wordcloud");
                  setActiveTool(null);
                }}
              />
            ) : activeActivity ? (
              <Panel
                title="Questão da Arena"
                subtitle={`${activeActivity.title} · ${(currentSession.answeredQuestionIds ?? []).length}/${activeActivity.questions?.length ?? 0} apresentadas`}
              >
                {currentQuestion ? (
                  <div className="arena-question-card">
                    <div className="question-meta">
                      <span>{QUESTION_TYPE_LABEL[currentQuestion.type]}</span>
                      <span>{QUESTION_DIFFICULTY_LABEL[currentQuestion.difficulty]}</span>
                      <span>{currentQuestion.points} XP sugeridos</span>
                    </div>
                    <h3>{currentQuestion.statement}</h3>
                    {currentQuestion.code && <pre>{currentQuestion.code}</pre>}
                    {currentQuestion.options && (
                      <div className="arena-question-options">
                        {currentQuestion.options.map((option) => (
                          <div key={option.id}>
                            <b>{option.id}</b>
                            <span>{option.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <MiniEmpty text="Clique em próxima questão quando quiser usar o conteúdo da atividade na Arena." />
                )}
                <div className="inline-actions solid-actions">
                  {(currentSession.answeredQuestionIds?.length ?? 0)
                    >= (activeActivity.questions?.length ?? 0)
                    && (
                      <button
                        className="button ghost"
                        onClick={() => { void restartActivityQuestions(); }}
                      >
                        Reiniciar questões
                      </button>
                    )}
                  <button
                    className="button primary"
                    onClick={() => { void nextActivityQuestion(); }}
                  >
                    Próxima questão
                  </button>
                </div>
              </Panel>
            ) : null}

        </div>
      )}

      {activeDynamic !== "runbook" && (
        <div className="stack-lg arena-tab-content">
          {activeDynamic === "draw" ? (
          <div className="smart-draw-workspace">
            <div className="smart-draw-hero">
              <div className="smart-draw-titlebar">
                <div className="smart-draw-title-copy">
                  <span className="smart-draw-title-icon" aria-hidden="true">◎</span>
                  <div>
                    <span className="eyebrow accent">DINÂMICA AO VIVO</span>
                    <h2>Sorteio Inteligente</h2>
                    <p>Escolha um aluno de forma justa e dinâmica, mantendo toda a turma em jogo.</p>
                  </div>
                </div>
                <button type="button" className="smart-draw-settings" onClick={() => setDrawSettingsOpen(true)}>
                  ⚙ Configurações
                </button>
              </div>

              <div className="draw-wheel-hero-stage">
                <section className="draw-wheel-zone" aria-label="Roleta de participantes">
                  <div className="draw-wheel-viewport">
                    <div
                      className={drawPhase === "drawing" ? "draw-wheel-semicircle is-spinning" : "draw-wheel-semicircle"}
                      style={{
                        "--segment-count": Math.max(currentSession.presentStudentIds.length, 1),
                      } as CSSProperties}
                    >
                      <div
                        className="draw-wheel-ring"
                        style={{ "--rotation": `${drawRotation}deg` } as CSSProperties}
                        aria-hidden="true"
                      />

                      {students
                        .filter((student) => currentSession.presentStudentIds.includes(student.id))
                        .map((student, index, participants) => {
                          const count = participants.length;
                          const progress = count === 1 ? 0.5 : index / (count - 1);
                          const startAngle = Math.PI * 1.035;
                          const endAngle = Math.PI * 1.965;
                          const angle = startAngle + progress * (endAngle - startAngle);
                          const left = 50 + Math.cos(angle) * 44;
                          const top = 50 + Math.sin(angle) * 39;
                          const densityClass = count >= 15 ? "crowded" : count >= 10 ? "dense" : "spacious";
                          return (
                            <div
                              className={[
                                "draw-wheel-student",
                                densityClass,
                                student.id === selectedId ? "selected" : "",
                              ].filter(Boolean).join(" ")}
                              key={student.id}
                              style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                "--slot-progress": progress,
                              } as CSSProperties}
                              title={student.nickname || student.name}
                            >
                              <div className="draw-wheel-student-face">
                                <Avatar student={student} />
                                <span>{student.nickname || student.name.split(" ")[0]}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="draw-wheel-center"
                    onClick={() => { void draw(); }}
                    disabled={drawPhase === "drawing"}
                    aria-label={drawPhase === "drawing" ? "Sorteio em andamento" : "Sortear aluno"}
                  >
                    <span aria-hidden="true">◆</span>
                    <strong>{drawPhase === "drawing" ? "SORTEANDO..." : "SORTEAR"}</strong>
                    <small>{drawPhase === "drawing" ? "aguarde" : "clique para iniciar"}</small>
                  </button>
                </section>
              </div>

              <div className="draw-context-strip">
                <section className="draw-recent-strip" aria-label="Últimos sorteados">
                  <div className="draw-context-label">
                    <strong>Últimos sorteados</strong>
                    <span>{recentDrawEvents.length}</span>
                  </div>
                  <div className="draw-recent-people">
                    {recentDrawEvents.slice(0, 5).map((event) => {
                      const studentId = typeof event.payload.studentId === "string" ? event.payload.studentId : "";
                      const student = students.find((item) => item.id === studentId);
                      return (
                        <div className="draw-recent-person" key={event.id} title={dateTime(event.occurredAt)}>
                          {student ? <Avatar student={student} /> : <span className="draw-history-dot" />}
                          <span>{student?.nickname || student?.name?.split(" ")[0] || "Aluno"}</span>
                        </div>
                      );
                    })}
                    {recentDrawEvents.length === 0 && (
                      <small className="draw-history-empty">O histórico aparecerá após o primeiro sorteio.</small>
                    )}
                  </div>
                </section>

                <section className="draw-coverage-inline" aria-label="Cobertura do sorteio">
                  <div>
                    <strong>{drawnStudentIds.size}/{currentSession.presentStudentIds.length}</strong>
                    <span>já sorteados</span>
                  </div>
                  <div className="draw-coverage-ring" style={{ "--coverage": `${drawCoverage}%` } as CSSProperties}>
                    <strong>{drawCoverage}%</strong>
                  </div>
                </section>
              </div>

              <div className={selected ? "selected-student-bar active" : "selected-student-bar"}>
                {selected ? (
                  <>
                    <Avatar student={selected} large />
                    <div className="selected-student-copy">
                      <div className="selected-student-name-row">
                        <h3>{selected.nickname || selected.name}</h3>
                        <span>🏆 Sorteado agora</span>
                      </div>
                      <p>
                        Último sorteio: {selectedDrawEvent ? dateTime(selectedDrawEvent.occurredAt) : "agora"}
                        <b>·</b>
                        Participações nesta sessão: {currentSession.drawCounts[selected.id] ?? 0}
                        <b>·</b>
                        <em>+{selectedXp} XP</em>
                      </p>
                    </div>
                    <button type="button" className="selected-student-cta" onClick={() => { setReason("Participação"); void addScore(5, "COLLABORATION", "Participação"); }}>
                      Confirmar e pontuar →
                    </button>
                  </>
                ) : (
                  <>
                    <div className="draw-result-placeholder" aria-hidden="true">◎</div>
                    <div className="selected-student-copy">
                      <h3>Aguardando o próximo sorteio</h3>
                      <p>O resultado aparecerá aqui e poderá ser pontuado imediatamente.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <section className="quick-score-dock" aria-label="Ações rápidas de pontuação">
              <div className="quick-score-head">
                <div><strong>Ações rápidas</strong><small>{selected ? `Pontuar ${selected.nickname || selected.name}` : "Selecione ou sorteie um aluno"}</small></div>
                <select className="select" value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || undefined)}>
                  <option value="">Selecionar aluno</option>
                  {students.filter((student) => currentSession.presentStudentIds.includes(student.id)).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </div>
              <div className="quick-score-actions">
                {SCORE_PRESETS.map((preset) => (
                  <button key={`${preset.points}-${preset.label}`} disabled={!selected} onClick={() => { setReason(preset.label); void addScore(preset.points, preset.category, preset.label); }}>
                    <b>+{preset.points}</b><span>{preset.points === 5 ? "Participação" : preset.label}</span>
                  </button>
                ))}
                <button className="quick-score-custom-trigger" disabled={!selected} onClick={() => setReason("Outra pontuação")}>
                  <b>✎</b><span>Outra pontuação</span>
                </button>
                <div className="quick-score-custom">
                  <input className="input compact" type="number" value={customPoints} onChange={(e) => setCustomPoints(Number(e.target.value))} />
                  <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Adicionar observação..." />
                  <button className="button primary" disabled={!selected || !reason.trim()} onClick={() => addScore(customPoints, "ADJUSTMENT", reason)}>Aplicar</button>
                </div>
              </div>
            </section>
          </div>
          ) : activeDynamic === "wordcloud" ? (
            <WordCloudPanel
              sessionId={currentSession.id}
              state={wordCloudState}
              onStateChange={setWordCloudState}
              notify={notify}
              joinCode={joinCode}
              publicBaseUrl={publicBaseUrl}
              realtimeStatus={realtimeStatus}
              connectedCount={sessionParticipants.filter((participant) => participant.connected).length}
              presentCount={sessionParticipants.filter((participant) => participant.present).length}
              showAccessCard={false}
            />
          ) : activeDynamic === "poll" ? (
            <PollPanel
              sessionId={currentSession.id}
              state={pollState}
              onStateChange={setPollState}
              notify={notify}
              joinCode={joinCode}
              publicBaseUrl={publicBaseUrl}
              realtimeStatus={realtimeStatus}
              connectedCount={sessionParticipants.filter((participant) => participant.connected).length}
              presentCount={sessionParticipants.filter((participant) => participant.present).length}
              showAccessCard={false}
            />
          ) : activeDynamic === "quiz" ? (
            <QuizPanel
              sessionId={currentSession.id}
              state={quizState}
              onStateChange={setQuizState}
              questions={activeActivity?.questions ?? []}
              presentCount={sessionParticipants.filter((participant) => participant.present).length}
              joinCode={joinCode}
              notify={notify}
              canAdvanceFlow={Boolean(liveFlowState?.started && liveFlowState.hasNext)}
              onContinue={() => movePreparedFlow("next")}
            />
          ) : activeDynamic === "buzzer" ? (
            <div className="buzzer-workspace">
              <section className="buzzer-hero">
                <div className="buzzer-titlebar">
                  <div>
                    <span className="eyebrow accent">DINÂMICA AO VIVO</span>
                    <h2>Buzzer</h2>
                    <p>Velocidade com ordem oficial definida pelo servidor.</p>
                  </div>
                  <span className={`buzzer-status-badge ${buzzerState.status.toLowerCase()}`}>
                    {buzzerState.status === "OPEN" ? "● VALENDO" : buzzerState.status === "CLOSED" ? "FECHADO" : "AGUARDANDO"}
                  </span>
                </div>

                <div className="buzzer-stage">
                  <div className={`buzzer-orb ${buzzerState.status.toLowerCase()}`}>
                    <span className="buzzer-orb-icon" aria-hidden="true">⚡</span>
                    <strong>
                      {buzzerState.status === "OPEN"
                        ? "VALENDO!"
                        : buzzerState.status === "CLOSED"
                          ? "RODADA ENCERRADA"
                          : "PRONTO"}
                    </strong>
                    <small>
                      {buzzerState.status === "OPEN"
                        ? "Aguardando o primeiro clique"
                        : buzzerState.status === "CLOSED"
                          ? `${buzzerState.presses.length} resposta(s) registradas`
                          : "Abra uma rodada quando quiser"}
                    </small>
                  </div>

                  <div className="buzzer-stage-actions">
                    <button
                      type="button"
                      className="button primary buzzer-primary-action"
                      onClick={() => { void toggleBuzzer(true); }}
                      disabled={realtimeBusy}
                    >
                      {buzzerState.status === "OPEN" ? "Nova rodada" : "Abrir Buzzer"}
                    </button>
                    <button
                      type="button"
                      className="button danger-outline"
                      onClick={() => { void toggleBuzzer(false); }}
                      disabled={realtimeBusy || buzzerState.status !== "OPEN"}
                    >
                      Encerrar rodada
                    </button>
                  </div>

                  <div className="buzzer-metrics">
                    <div>
                      <strong>{sessionParticipants.filter((participant) => participant.connected).length}</strong>
                      <span>conectados</span>
                    </div>
                    <div>
                      <strong>{buzzerState.presses.length}</strong>
                      <span>cliques</span>
                    </div>
                    <div>
                      <strong>{buzzerState.openedAt ? dateTime(buzzerState.openedAt) : "—"}</strong>
                      <span>abertura</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="buzzer-ranking-card">
                <div className="buzzer-ranking-head">
                  <div>
                    <span className="eyebrow accent">ORDEM OFICIAL</span>
                    <h3>Quem apertou primeiro?</h3>
                  </div>
                  <span>{buzzerState.presses.length} resposta(s)</span>
                </div>

                {buzzerState.presses.length > 0 ? (
                  <div className="buzzer-podium-list">
                    {buzzerState.presses.map((press) => {
                      const student = students.find((item) => item.id === press.studentId);
                      return (
                        <div className={press.position === 1 ? "buzzer-podium-row winner" : "buzzer-podium-row"} key={press.id}>
                          <div className="buzzer-position">#{press.position}</div>
                          {student ? <Avatar student={student} /> : <div className="buzzer-avatar-fallback">{(press.displayName || press.nickname || press.name).slice(0, 1)}</div>}
                          <div className="buzzer-student-copy">
                            <strong>{press.displayName || press.nickname || press.name}</strong>
                            <small>{press.position === 1 ? "Primeiro clique confirmado pelo servidor" : dateTime(press.receivedAt)}</small>
                          </div>
                          {press.position === 1 ? (
                            <div className="buzzer-winner-actions">
                              <button type="button" onClick={() => { void addBuzzerScore(press.studentId, 5); }}>+5 XP</button>
                              <button type="button" onClick={() => { void addBuzzerScore(press.studentId, 10); }}>+10 XP</button>
                            </div>
                          ) : (
                            <span className="buzzer-order-time">{dateTime(press.receivedAt)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="buzzer-empty-state">
                    <span aria-hidden="true">⚡</span>
                    <strong>{buzzerState.status === "OPEN" ? "Aguardando o primeiro clique" : "Nenhuma rodada disputada ainda"}</strong>
                    <p>{buzzerState.status === "OPEN" ? "Assim que alguém apertar, a ordem aparecerá aqui em tempo real." : "Abra o Buzzer quando quiser transformar uma pergunta em disputa ao vivo."}</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="boss-workspace">
              <section className="boss-hero">
                <div className="boss-titlebar">
                  <div>
                    <span className="eyebrow accent">DESAFIO COLETIVO</span>
                    <h2>Boss Battle</h2>
                    <p>Transforme desafios da aula em dano coletivo contra um objetivo compartilhado.</p>
                  </div>
                  <div className="boss-title-actions">
                    <span className={`boss-phase-badge ${currentSession.boss?.currentHp === 0 ? "defeated" : currentSession.boss ? "active" : "idle"}`}>
                      {bossPhase}
                    </span>
                    <button type="button" className="smart-draw-settings" onClick={openProjector} disabled={!joinCode}>
                      Projetor ↗
                    </button>
                  </div>
                </div>

                {currentSession.boss ? (
                  <div className="boss-live-grid">
                    <section className="boss-stage" aria-label={`Boss ${currentSession.boss.name}`}>
                      <div className={`boss-core ${currentSession.boss.currentHp === 0 ? "defeated" : bossHpPercent <= 30 ? "critical" : ""}`}>
                        <span className="boss-core-rune" aria-hidden="true">◆</span>
                        <span className="boss-core-label">BOSS</span>
                        <strong>{currentSession.boss.name}</strong>
                        <small>{bossPhase}</small>
                      </div>

                      <div className="boss-hp-panel">
                        <div className="boss-hp-head">
                          <span>HP DO BOSS</span>
                          <strong>{currentSession.boss.currentHp} / {currentSession.boss.maxHp}</strong>
                        </div>
                        <div className="boss-hp-track" role="progressbar" aria-label="Vida do Boss" aria-valuemin={0} aria-valuemax={currentSession.boss.maxHp} aria-valuenow={currentSession.boss.currentHp}>
                          <span style={{ width: `${bossHpPercent}%` }} />
                        </div>
                        <div className="boss-hp-foot">
                          <span>{bossHpPercent}% restante</span>
                          <span>{bossDamageTotal} de dano acumulado</span>
                        </div>
                      </div>

                      <div className="boss-session-metrics">
                        <div><strong>{currentSession.presentStudentIds.length}</strong><span>heróis presentes</span></div>
                        <div><strong>{bossDamageTotal}</strong><span>dano causado</span></div>
                        <div><strong>{bossPhase}</strong><span>estado atual</span></div>
                      </div>

                      {currentSession.boss.currentHp === 0 && (
                        <div className="boss-victory-banner" role="status">
                          <span aria-hidden="true">🏆</span>
                          <div>
                            <strong>BOSS DERROTADO</strong>
                            <p>Objetivo coletivo concluído. A vitória já foi persistida na sessão.</p>
                          </div>
                        </div>
                      )}
                    </section>

                    <aside className="boss-combat-panel">
                      <div className="boss-combat-head">
                        <div>
                          <span className="eyebrow accent">CONTROLE DE COMBATE</span>
                          <h3>Aplicar dano</h3>
                        </div>
                        <span>manual</span>
                      </div>

                      <p className="boss-combat-note">
                        Dano manual nesta versão — Quiz e XP não reduzem HP automaticamente.
                      </p>

                      <div className="boss-attacks">
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(10); }}>
                          <span>⚔</span><strong>−10 HP</strong><small>Ataque leve</small>
                        </button>
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(20); }}>
                          <span>⚡</span><strong>−20 HP</strong><small>Ataque médio</small>
                        </button>
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(30); }}>
                          <span>✦</span><strong>−30 HP</strong><small>Ataque crítico</small>
                        </button>
                      </div>

                      <div className="boss-rule-card">
                        <strong>Regra desta versão</strong>
                        <p>O professor decide quando um desafio foi cumprido e aplica o dano. O backend persiste HP, derrota e sincroniza participantes e Projetor.</p>
                      </div>

                      {currentSession.boss.currentHp === 0 && (
                        <div className="boss-next-challenge">
                          <span className="eyebrow accent">PRÓXIMO DESAFIO</span>
                          <input className="input" value={bossName} onChange={(event) => setBossName(event.target.value)} placeholder="Nome do novo Boss" />
                          <div className="boss-hp-config">
                            <input className="input" type="number" min="10" value={bossHp} onChange={(event) => setBossHp(Math.max(10, Number(event.target.value)))} aria-label="HP do novo Boss" />
                            <button className="button primary" disabled={mechanicsBusy} onClick={() => { void createBoss(); }}>Iniciar novo Boss</button>
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                ) : (
                  <div className="boss-setup-grid">
                    <section className="boss-setup-card">
                      <span className="eyebrow accent">PREPARAR BATALHA</span>
                      <h3>Crie o objetivo coletivo</h3>
                      <p>Defina um nome memorável e a quantidade de HP. O Boss será sincronizado com toda a sessão.</p>

                      <label>
                        <span>Nome do Boss</span>
                        <input className="input" value={bossName} onChange={(event) => setBossName(event.target.value)} placeholder="Ex.: Spaghetti Code" />
                      </label>

                      <label>
                        <span>HP inicial</span>
                        <input className="input" type="number" min="10" value={bossHp} onChange={(event) => setBossHp(Math.max(10, Number(event.target.value)))} />
                      </label>

                      <div className="boss-hp-presets" aria-label="Atalhos de HP">
                        {[50, 100, 150, 200].map((hp) => (
                          <button key={hp} type="button" className={bossHp === hp ? "active" : ""} onClick={() => setBossHp(hp)}>
                            {hp} HP
                          </button>
                        ))}
                      </div>

                      <button className="button primary boss-start-button" disabled={mechanicsBusy || !bossName.trim()} onClick={() => { void createBoss(); }}>
                        {mechanicsBusy ? "Invocando..." : "Iniciar Boss Battle"}
                      </button>
                    </section>

                    <aside className="boss-preview-card">
                      <span className="eyebrow accent">PREVIEW</span>
                      <div className="boss-core preview">
                        <span className="boss-core-rune" aria-hidden="true">◆</span>
                        <span className="boss-core-label">BOSS</span>
                        <strong>{bossName.trim() || "Seu Boss"}</strong>
                        <small>{bossHp} HP</small>
                      </div>
                      <div className="boss-rule-card">
                        <strong>Objetivo compartilhado</strong>
                        <p>Todos acompanham a mesma vida do Boss. Cada ataque aplicado pelo professor é persistido e transmitido em tempo real.</p>
                      </div>
                    </aside>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}


        </main>

        <aside className="arena-context-rail" aria-label="Contexto da sessão">
          <section className="arena-participants-card">
            <div className="arena-context-head">
              <div>
                <strong>Participantes</strong>
                <small>{currentSession.presentStudentIds.length}/{sessionParticipants.length}</small>
              </div>
              <button type="button" onClick={() => setActiveTool("attendance")}>Presença</button>
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
              {visibleParticipants.slice(0, 12).map((participant) => {
                const student = data.students.find((item) => item.id === participant.studentId);
                if (!student) return null;
                return (
                  <div className="arena-participant-row" key={participant.id}>
                    <Avatar student={student} />
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
                      className={participant.connected ? "arena-status-dot online" : participant.present ? "arena-status-dot present" : "arena-status-dot offline"}
                      aria-label={participant.connected ? "Online" : participant.present ? "Presente, offline" : "Ausente"}
                    />
                  </div>
                );
              })}
            </div>

            {visibleParticipants.length > 12 && (
              <button className="arena-context-more" type="button" onClick={() => setActiveTool("attendance")}>
                Ver todos ({visibleParticipants.length}) →
              </button>
            )}
          </section>

          <section className="arena-session-code-card">
            <div>
              <span className="arena-context-label">CÓDIGO DA SESSÃO</span>
              <div className="arena-session-code-row">
                <strong>{joinCode?.code ?? "------"}</strong>
                <button
                  type="button"
                  onClick={() => { void copySessionCode(); }}
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
              <img
                src={joinQrImageUrl(currentSession.id, publicBaseUrl, joinCode.code, 180)}
                alt={`QR Code da sessão ${joinCode.code}`}
              />
            ) : (
              <div className="arena-qr-placeholder">QR</div>
            )}
          </section>
        </aside>
      </div>

      <ArenaToolDrawer
        open={drawSettingsOpen}
        title="Configurações do Sorteio"
        subtitle="Entenda as políticas ativas sem ocupar o palco da dinâmica."
        onClose={() => setDrawSettingsOpen(false)}
      >
        <div className="draw-settings-panel">
          <section className="draw-settings-mode">
            <span className="draw-settings-label">MODO ATIVO</span>
            <div className="draw-settings-mode-card">
              <span className="draw-mode-radio" aria-hidden="true" />
              <div>
                <strong>Balanceado</strong>
                <p>Prioriza quem foi sorteado menos vezes durante a sessão.</p>
              </div>
            </div>
          </section>

          <section className="draw-settings-rules">
            <span className="draw-settings-label">POLÍTICAS DO BACKEND</span>
            <div className="draw-settings-rule">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Apenas presentes</strong>
                <p>Somente alunos marcados como presentes entram no sorteio.</p>
              </div>
            </div>
            <div className="draw-settings-rule">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Evita repetição imediata</strong>
                <p>Quando há mais de um participante, o último sorteado não é escolhido novamente na rodada seguinte.</p>
              </div>
            </div>
          </section>

          <section className="draw-settings-explainer">
            <strong>Como o balanceamento funciona</strong>
            <p>
              Todos continuam com chance de serem sorteados, mas o peso aumenta para quem participou menos.
              A decisão final continua sendo feita pelo servidor.
            </p>
          </section>
        </div>
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "timer"}
        title="Timer"
        subtitle="Controle o tempo sem sair da dinâmica atual."
        onClose={() => setActiveTool(null)}
      >
        <TimerPanel
          sessionId={currentSession.id}
          state={timerState}
          onStateChange={setTimerState}
          notify={notify}
        />
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "groups"}
        title="Organizar turma"
        subtitle="Monte duplas e grupos mantendo a dinâmica principal visível."
        onClose={() => setActiveTool(null)}
      >
        <div className="arena-tool-groups">
          <div className="group-controls">
            <label>
              Formato
              <select className="select" value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))}>
                <option value={1}>Individual</option>
                <option value={2}>Duplas</option>
                <option value={3}>Trios</option>
                <option value={4}>Grupos de 4</option>
                <option value={5}>Grupos de 5</option>
              </select>
            </label>
            <button className="button primary" onClick={() => { void createGroups(); }}>
              {groupSize === 1 ? "Ativar individual" : "Organizar turma"}
            </button>
          </div>
          {groups.length > 0 ? (
            <div className="groups-grid arena-tool-groups-grid">
              {groups.map((group, index) => (
                <div className="group-card" key={index}>
                  <b>{groupSize === 1 ? `INDIVIDUAL ${String(index + 1).padStart(2, "0")}` : `GRUPO ${String(index + 1).padStart(2, "0")}`}</b>
                  {group.map((id) => (
                    <span key={id}>
                      {students.find((student) => student.id === id)?.nickname || students.find((student) => student.id === id)?.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <MiniEmpty text="Escolha um formato e organize a turma quando precisar." />
          )}
        </div>
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "attendance"}
        title="Presença e acesso"
        subtitle="Gerencie check-in, presença e dispositivos sem abandonar a dinâmica."
        size="wide"
        onClose={() => setActiveTool(null)}
      >
        <div className="arena-tool-attendance">
          <SessionAccessCard
            sessionId={currentSession.id}
            joinCode={joinCode}
            publicBaseUrl={publicBaseUrl}
            notify={notify}
            realtimeStatus={realtimeStatus}
            connectedCount={sessionParticipants.filter((participant) => participant.connected).length}
            presentCount={sessionParticipants.filter((participant) => participant.present).length}
            onRotate={rotateSessionCode}
            rotateBusy={realtimeBusy}
            compact
            drawer
            title="Entrada dos alunos"
            subtitle="O código permanece válido durante a sessão."
          />

          <div className="arena-tool-roster">
            <div className="arena-tool-roster-head">
              <strong>Participantes</strong>
              <span>{currentSession.presentStudentIds.length}/{sessionParticipants.length} presentes</span>
            </div>
            {sessionParticipants.map((participant) => {
              const student = data.students.find((item) => item.id === participant.studentId);
              if (!student) return null;
              return (
                <div key={participant.id} className="arena-tool-roster-row">
                  <Avatar student={student} />
                  <div>
                    <strong>{student.name}</strong>
                    <small>{participant.connected ? "online" : "offline"}</small>
                  </div>
                  <label className="arena-checkin-presence-control">
                    <input
                      type="checkbox"
                      checked={participant.present}
                      disabled={presenceBusyId === participant.id}
                      onChange={(event) => { void changePresence(participant, event.target.checked); }}
                    />
                    <span aria-hidden="true" />
                    <small>{participant.present ? "Presente" : "Ausente"}</small>
                  </label>
                  {participant.connected && (
                    <button
                      type="button"
                      className="arena-tool-release"
                      onClick={() => { void releaseDevice(participant); }}
                      aria-label={`Liberar dispositivo de ${student.name}`}
                      title="Liberar dispositivo"
                    >
                      ⋯
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "score"}
        title="Pontuação rápida"
        subtitle="Aplique XP mantendo a dinâmica principal no palco."
        onClose={() => setActiveTool(null)}
      >
        <div className="arena-tool-score">
          <label className="field-label">Aluno</label>
          <select className="select full" value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || undefined)}>
            <option value="">Selecione um aluno</option>
            {students
              .filter((student) => currentSession.presentStudentIds.includes(student.id))
              .map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>

          <div className="score-presets arena-tool-score-presets">
            {SCORE_PRESETS.map((preset) => (
              <button
                key={`${preset.points}-${preset.label}`}
                disabled={!selected}
                onClick={() => { setReason(preset.label); void addScore(preset.points, preset.category, preset.label); }}
              >
                <b>+{preset.points}</b>
                <span>{preset.points === 5 ? "Participação" : preset.label}</span>
              </button>
            ))}
          </div>

          <div className="custom-score arena-tool-score-custom">
            <input className="input compact" type="number" value={customPoints} onChange={(event) => setCustomPoints(Number(event.target.value))} />
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo ou observação" />
            <button className="button primary" disabled={!selected || !reason.trim()} onClick={() => addScore(customPoints, "ADJUSTMENT", reason)}>
              Aplicar
            </button>
          </div>
        </div>
      </ArenaToolDrawer>
    </div>
  );
}

function ActivitiesView({ data, classroomId, classroomName, students, onUseInArena, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  classroomName: string;
  students: Student[];
  onUseInArena: (activityId: string) => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  type ActivityModal = "editor" | "delivery" | "import" | "external-results" | null;
  type EditorTab = "general" | "questions" | "flow";

  const [modal, setModal] = useState<ActivityModal>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [activityId, setActivityId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState(10);
  const [bonus, setBonus] = useState(5);
  const [resourceKind, setResourceKind] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [platform, setPlatform] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([]);
  const [stepsActivityId, setStepsActivityId] = useState<string | undefined>();
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsDirty, setStepsDirty] = useState(false);
  const [deliveryActivityId, setDeliveryActivityId] = useState<string | undefined>();
  const [dashboardActivityId, setDashboardActivityId] = useState<string | undefined>();
  const [externalResultActivityId, setExternalResultActivityId] = useState<string | undefined>();
  const [delivered, setDelivered] = useState<string[]>([]);
  const [onTime, setOnTime] = useState<string[]>([]);
  const [sourceClassroomId, setSourceClassroomId] = useState("");
  const [sourceActivityId, setSourceActivityId] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId).slice().sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [data.activities, classroomId],
  );
  const otherClassrooms = data.classrooms.filter((classroom) => classroom.id !== classroomId);
  const sourceActivities = data.activities.filter((activity) => activity.classroomId === sourceClassroomId);
  const deliveryActivity = classActivities.find((activity) => activity.id === deliveryActivityId);
  const dashboardActivity = classActivities.find((activity) => activity.id === dashboardActivityId);
  const externalResultActivity = classActivities.find((activity) => activity.id === externalResultActivityId);
  const activityEvents = data.scoreEvents.filter((event) => event.classroomId === classroomId && (event.source === "ACTIVITY" || event.category === "SUBMISSION"));
  const totalQuestions = classActivities.reduce((sum, activity) => sum + (activity.questions?.length ?? 0), 0);
  const activityXp = activityEvents.reduce((sum, event) => sum + event.points, 0);

  function draftInput(): ActivityUpsertInput {
    return {
      classroomId,
      title: title.trim(),
      topic: topic.trim() || undefined,
      points,
      onTimeBonus: bonus,
      resource: {
        kind: resourceKind,
        platform: resourceKind === "EXTERNAL" ? platform.trim() || undefined : undefined,
        url: resourceKind === "EXTERNAL" ? resourceUrl.trim() || undefined : undefined,
      },
      questions,
    };
  }

  function resetDraft() {
    setActivityId(undefined);
    setTitle("");
    setTopic("");
    setPoints(10);
    setBonus(5);
    setResourceKind("INTERNAL");
    setPlatform("");
    setResourceUrl("");
    setQuestions([]);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab("general");
  }

  function openNewActivity() {
    resetDraft();
    setModal("editor");
  }

  function openActivity(activity: Activity, tab: EditorTab = "general") {
    setActivityId(activity.id);
    setTitle(activity.title);
    setTopic(activity.topic ?? "");
    setPoints(activity.points);
    setBonus(activity.onTimeBonus);
    setResourceKind(activity.resource?.kind ?? "INTERNAL");
    setPlatform(activity.resource?.platform ?? "");
    setResourceUrl(activity.resource?.url ?? "");
    setQuestions(activity.questions ?? []);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab(tab);
    setModal("editor");
  }

  function validateDraft() {
    if (!title.trim()) {
      notify("Informe o título da atividade.");
      return false;
    }
    if (resourceKind === "EXTERNAL" && resourceUrl.trim()) {
      try {
        new URL(resourceUrl.trim());
      } catch {
        notify("Informe um link externo válido.");
        return false;
      }
    }
    return true;
  }

  async function saveActivity(closeAfter = true): Promise<Activity | undefined> {
    if (!validateDraft() || activityBusy) return undefined;
    setActivityBusy(true);
    try {
      const existing = activityId ? data.activities.find((activity) => activity.id === activityId) : undefined;
      const saved = existing
        ? await updateActivityApi(existing.id, draftInput())
        : await createActivityApi(draftInput());
      patch((current) => ({
        ...current,
        activities: existing
          ? current.activities.map((item) => item.id === saved.id ? saved : item)
          : [...current.activities, saved],
      }));
      setActivityId(saved.id);
      setQuestions(saved.questions ?? []);
      notify(existing ? "Atividade atualizada no PostgreSQL." : "Atividade criada no PostgreSQL.");
      if (closeAfter) setModal(null);
      return saved;
    } catch (error) {
      notify(errorMessage(error));
      return undefined;
    } finally {
      setActivityBusy(false);
    }
  }

  async function loadFlow(activityIdToLoad: string) {
    setStepsLoading(true);
    try {
      const steps = await fetchActivitySteps(activityIdToLoad);
      setActivitySteps(steps);
      setStepsActivityId(activityIdToLoad);
      setStepsDirty(false);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setStepsLoading(false);
    }
  }

  async function openFlowTab() {
    if (activityBusy || stepsLoading) return;

    const saved = await saveActivity(false);
    if (!saved) return;

    if (stepsActivityId !== saved.id) {
      await loadFlow(saved.id);
    }

    setEditorTab("flow");
  }

  async function saveFlow() {
    if (!activityId || activityBusy || stepsLoading) return;

    const errors = validateActivitySteps(activitySteps, questions);
    if (errors.length) {
      notify(errors[0]);
      return;
    }

    setActivityBusy(true);
    try {
      const saved = await replaceActivitySteps(activityId, activitySteps);
      setActivitySteps(saved);
      setStepsActivityId(activityId);
      setStepsDirty(false);
      notify("Roteiro ao Vivo salvo no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setActivityBusy(false);
    }
  }

  function openDelivery(activity: Activity) {
    setDeliveryActivityId(activity.id);
    setDelivered([]);
    setOnTime([]);
    setModal("delivery");
  }

  async function registerDelivery() {
    if (!deliveryActivity || !delivered.length) return;
    try {
      const inputs = delivered.flatMap((studentId) => {
        const rows: CreateScoreEventInput[] = [];
        if (deliveryActivity.points) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.points,
            category: "SUBMISSION" as const,
            description: `Entrega: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        if (onTime.includes(studentId) && deliveryActivity.onTimeBonus) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.onTimeBonus,
            category: "BONUS" as const,
            description: `Bônus no prazo: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        return rows;
      });
      if (!inputs.length) {
        notify("A atividade não possui XP configurado para registrar.");
        return;
      }
      const events = await createScoreEventsApi(inputs);
      patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
      setModal(null);
      notify(`XP persistido para ${delivered.length} aluno(s).`);
    } catch (error) {
      notify(errorMessage(error));
    }
  }


  function openExternalResults(activity: Activity) {
    setExternalResultActivityId(activity.id);
    setModal("external-results");
  }

  function handleExternalImported(events: ArenaData["scoreEvents"]) {
    if (!events.length) return;
    patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
  }

  function openImport() {
    const firstClassroom = otherClassrooms[0]?.id ?? "";
    setSourceClassroomId(firstClassroom);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === firstClassroom)?.id ?? "");
    setModal("import");
  }

  function changeSourceClassroom(nextClassroomId: string) {
    setSourceClassroomId(nextClassroomId);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === nextClassroomId)?.id ?? "");
  }

  async function importActivityCopy() {
    const source = data.activities.find((activity) => activity.id === sourceActivityId && activity.classroomId === sourceClassroomId);
    if (!source || activityBusy) {
      if (!source) notify("Selecione uma atividade de origem.");
      return;
    }
    setActivityBusy(true);
    try {
      const copy = await copyActivityApi(source.id, classroomId);
      patch((current) => ({ ...current, activities: [...current.activities, copy] }));
      setModal(null);
      notify(`Atividade "${source.title}" copiada para ${classroomName} no PostgreSQL.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setActivityBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-action-bar">
        <div>
          <span className="eyebrow accent">CONTEXTO DA TURMA</span>
          <h2>{classroomName}</h2>
          <p>Atividades, questões e XP desta página pertencem à turma selecionada no topo.</p>
        </div>
        <div className="page-action-buttons">
          <button className="button" onClick={openImport}>Importar atividade</button>
          <button className="button primary" onClick={openNewActivity}>+ Nova atividade</button>
        </div>
      </div>

      <div className="metrics-grid activity-metrics">
        <Metric label="Atividades" value={classActivities.length.toString()} hint="nesta turma" />
        <Metric label="Questões" value={totalQuestions.toString()} hint="conteúdo reutilizável na Arena" />
        <Metric label="XP de atividades" value={activityXp.toString()} hint="entregas e bônus registrados" />
        <Metric label="Integração" value="Arena" hint="atividades podem alimentar desafios" />
      </div>

      {dashboardActivity && (
        <ActivitySubmissionDashboard
          activityId={dashboardActivity.id}
          activityTitle={dashboardActivity.title}
          onClose={() => setDashboardActivityId(undefined)}
        />
      )}

      <Panel title="Atividades da turma" subtitle="Abra para editar, acompanhar entregas ou usar as questões diretamente na Arena">
        {classActivities.length ? (
          <div className="activity-catalog">
            {classActivities.map((activity) => {
              const submissionCount = new Set(activityEvents.filter((event) => event.activityId === activity.id && event.description.startsWith("Entrega:")).map((event) => event.studentId)).size;
              return (
                <article className="activity-catalog-card" key={activity.id}>
                  <div className="activity-card-head">
                    <div>
                      <div className="activity-card-kicker">{activity.resource?.kind === "EXTERNAL" ? activity.resource.platform || "Recurso externo" : "Atividade interna"}</div>
                      <h3>{activity.title}</h3>
                      <p>{activity.topic || "Sem tópico definido"}</p>
                    </div>
                    <div className="activity-xp"><strong>{activity.points} XP</strong><span>+{activity.onTimeBonus} prazo</span></div>
                  </div>
                  <div className="activity-card-stats">
                    <span>{activity.questions?.length ?? 0} questões</span>
                    <span>{submissionCount}/{students.length} entregaram</span>
                    {activity.copiedFromClassroomId && <span>Cópia reutilizada</span>}
                  </div>
                  {activity.resource?.kind === "EXTERNAL" && activity.resource.url && <a className="activity-resource-link" href={activity.resource.url} target="_blank" rel="noreferrer">Abrir recurso externo ↗</a>}
                  <div className="activity-card-actions">
                    <button className="button ghost" onClick={() => openActivity(activity)}>Abrir / editar</button>
                    <button className="button" onClick={() => setDashboardActivityId(activity.id)}>Entregas</button>
                    <button className="button" onClick={() => openDelivery(activity)}>Registrar XP manual</button>
                    {activity.resource?.kind === "EXTERNAL" && <button className="button" onClick={() => openExternalResults(activity)}>Importar resultados</button>}
                    <button className="button primary" disabled={!(activity.questions?.length)} onClick={() => onUseInArena(activity.id)}>Usar na Arena</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nenhuma atividade nesta turma" text="Crie uma atividade do zero ou importe uma cópia de outra turma. Questões podem ser reutilizadas depois na Arena." actionLabel="Criar atividade" onAction={openNewActivity} />
        )}
      </Panel>

      <Modal open={modal === "editor"} title={activityId ? "Editar atividade" : "Nova atividade"} subtitle={`Turma: ${classroomName}`} size="large" onClose={() => setModal(null)}>
        <div className="modal-tabs">
          <button className={editorTab === "general" ? "active" : ""} onClick={() => setEditorTab("general")}>Geral e XP</button>
          <button className={editorTab === "questions" ? "active" : ""} onClick={() => setEditorTab("questions")}>Questões <span>{questions.length}</span></button>
          <button
            className={editorTab === "flow" ? "active" : ""}
            disabled={activityBusy || stepsLoading}
            onClick={() => { void openFlowTab(); }}
          >
            Roteiro
            {stepsActivityId === activityId && <span>{activitySteps.length}</span>}
          </button>
        </div>
        {editorTab === "general" ? (
          <div className="modal-section-stack">
            <div className="context-lock"><span>Turma</span><strong>{classroomName}</strong><small>A atividade será salva somente neste contexto.</small></div>
            <div className="form-grid">
              <label className="field-label">Título</label>
              <input className="input" placeholder="Ex.: Atividade 07 — Funções" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="form-two">
                <label>Tema / tópico<input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Estruturas de repetição" /></label>
                <label>Tipo<select className="select full" value={resourceKind} onChange={(e) => setResourceKind(e.target.value as "INTERNAL" | "EXTERNAL")}><option value="INTERNAL">Atividade interna</option><option value="EXTERNAL">Atividade / recurso externo</option></select></label>
              </div>
              {resourceKind === "EXTERNAL" && <div className="form-two"><label>Plataforma<input className="input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Wayground, Forms, Kahoot..." /></label><label>Link<input className="input" type="url" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." /></label></div>}
              <div className="form-two"><label>XP da entrega<input className="input" type="number" min="0" value={points} onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))} /></label><label>Bônus no prazo<input className="input" type="number" min="0" value={bonus} onChange={(e) => setBonus(Math.max(0, Number(e.target.value) || 0))} /></label></div>
            </div>
            <div className="activity-summary-line"><span>{questions.length} questão(ões) vinculadas</span><button className="text-button" onClick={() => setEditorTab("questions")}>Gerenciar questões →</button></div>
          </div>
        ) : editorTab === "questions" ? (
          <ActivityQuestionBuilder questions={questions} setQuestions={setQuestions} defaultTheme={topic || title} notify={notify} />
        ) : stepsLoading ? (
          <div className="loading-screen compact">Carregando roteiro...</div>
        ) : (
          <ActivityStepEditor
            steps={activitySteps}
            questions={questions}
            disabled={activityBusy}
            onChange={(steps) => {
              setActivitySteps(steps);
              setStepsDirty(true);
            }}
          />
        )}
        <div className="modal-footer">
          <button className="button ghost" onClick={() => setModal(null)}>
            {editorTab === "flow" && stepsDirty ? "Fechar sem salvar" : "Cancelar"}
          </button>
          {editorTab === "flow" ? (
            <button
              className="button primary"
              disabled={!activityId || activityBusy || stepsLoading || !stepsDirty}
              onClick={() => { void saveFlow(); }}
            >
              {activityBusy ? "Salvando..." : stepsDirty ? "Salvar roteiro" : "Roteiro salvo"}
            </button>
          ) : (
            <button
              className="button primary"
              disabled={activityBusy}
              onClick={() => {
                if (!title.trim()) {
                  setEditorTab("general");
                  notify("As questões já estão no rascunho. Informe o título da atividade para salvar.");
                  return;
                }
                void saveActivity(true);
              }}
            >
              {activityBusy ? "Salvando..." : title.trim() ? "Salvar atividade" : "Definir título e salvar"}
            </button>
          )}
        </div>
      </Modal>

      <Modal open={modal === "delivery"} title="Registrar entrega / participação" subtitle={deliveryActivity?.title} size="medium" onClose={() => setModal(null)}>
        {deliveryActivity && <>
          <div className="delivery-summary"><div><span>XP da entrega</span><strong>+{deliveryActivity.points}</strong></div><div><span>Bônus no prazo</span><strong>+{deliveryActivity.onTimeBonus}</strong></div><div><span>Selecionados</span><strong>{delivered.length}</strong></div></div>
          <div className="delivery-list modal-delivery-list">
            {students.map((student) => (
              <div className="delivery-row" key={student.id}>
                <label><input type="checkbox" checked={delivered.includes(student.id)} onChange={(e) => { setDelivered((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)); if (!e.target.checked) setOnTime((current) => current.filter((id) => id !== student.id)); }} /><Avatar student={student} /><span>{student.name}</span></label>
                <label className="on-time"><input type="checkbox" disabled={!delivered.includes(student.id)} checked={onTime.includes(student.id)} onChange={(e) => setOnTime((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />No prazo</label>
              </div>
            ))}
          </div>
          <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!delivered.length} onClick={() => { void registerDelivery(); }}>Registrar e aplicar XP</button></div>
        </>}
      </Modal>

      <ExternalResultImportModal
        open={modal === "external-results"}
        activity={externalResultActivity}
        students={students}
        onClose={() => setModal(null)}
        onImported={handleExternalImported}
        notify={notify}
      />

      <Modal open={modal === "import"} title="Importar atividade de outra turma" subtitle={`Destino: ${classroomName}`} size="medium" onClose={() => setModal(null)}>
        {otherClassrooms.length ? (
          <div className="modal-section-stack">
            <div className="form-grid">
              <label className="field-label">Turma de origem</label>
              <select className="select full" value={sourceClassroomId} onChange={(e) => changeSourceClassroom(e.target.value)}>{otherClassrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
              <label className="field-label">Atividade</label>
              <select className="select full" value={sourceActivityId} onChange={(e) => setSourceActivityId(e.target.value)}><option value="">Selecione</option>{sourceActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}</select>
            </div>
            <div className="copy-policy"><strong>Será criada uma cópia independente.</strong><p>Conteúdo, questões, roteiro, XP e recurso externo são copiados. Entregas, alunos, resultados, ScoreEvents e histórico não são copiados.</p></div>
            <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!sourceActivityId || activityBusy} onClick={() => { void importActivityCopy(); }}>Importar cópia</button></div>
          </div>
        ) : <MiniEmpty text="Crie uma segunda turma para reutilizar atividades entre contextos. Em uma evolução futura, modelos também poderão vir de uma biblioteca." />}
      </Modal>
    </div>
  );
}

function RankingView({ leaderboard, events, classroomId }: { leaderboard: { student: Student; xp: number }[]; events: ArenaData["scoreEvents"]; classroomId: string }) {
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  return (
    <div className="stack-lg">
      <div className="ranking-podium">
        {leaderboard.slice(0, 3).map((row, index) => <div key={row.student.id} className={`podium p${index + 1}`}><span>#{index + 1}</span><Avatar student={row.student} large /><strong>{row.student.nickname || row.student.name}</strong><b>{row.xp} XP</b><small>{getLevel(row.xp).name}</small></div>)}
      </div>
      <Panel title="Ranking geral" subtitle="XP total e progressão por nível">
        <div className="ranking-full">
          {leaderboard.map((row, index) => {
            const level = getLevel(row.xp);
            const weekly = events.filter((e) => e.classroomId === classroomId && e.studentId === row.student.id && new Date(e.createdAt) >= weekStart).reduce((sum, e) => sum + e.points, 0);
            return <div className="ranking-full-row" key={row.student.id}><b className="place">#{index + 1}</b><Avatar student={row.student} /><div className="rank-main"><div><strong>{row.student.name}</strong><span>{level.name}</span></div><div className="progress"><span style={{ width: `${getLevelProgress(row.xp)}%` }} /></div></div><div className="weekly">7 dias <b>{weekly >= 0 ? "+" : ""}{weekly}</b></div><strong>{row.xp} XP</strong></div>;
          })}
          {!leaderboard.length && <MiniEmpty text="O ranking aparecerá após cadastrar alunos." />}
        </div>
      </Panel>
    </div>
  );
}

function HistoryView({ classroomId, events, students, onReverse }: { classroomId: string; events: ArenaData["scoreEvents"]; students: Student[]; onReverse: (id: string) => void }) {
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

function BackupView({ data, setData, notify, refreshClassroomDomain }: {
  data: ArenaData;
  setData: React.Dispatch<React.SetStateAction<ArenaData>>;
  notify: (message: string) => void;
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
        notify("Arquivo de snapshot inválido.");
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
      notify(errorMessage(error));
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

function Modal({ open, title, subtitle, size = "medium", bodyClassName, onClose, children }: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "medium" | "large";
  bodyClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={`modal-card ${size}`} role="dialog" aria-modal="true" aria-labelledby="arena-modal-title">
        <header className="modal-header">
          <div><h2 id="arena-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="modal-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>
        <div className={bodyClassName ? `modal-body ${bodyClassName}` : "modal-body"}>{children}</div>
      </section>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{children}</div>;
}
function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function Avatar({ student, large = false }: { student: Student; large?: boolean }) { const initials = student.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <div className={large ? "avatar large" : "avatar"}>{initials}</div>; }
function MiniEmpty({ text }: { text: string }) { return <div className="mini-empty">{text}</div>; }
function EmptyState({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel: string; onAction: () => void }) { return <div className="empty-state"><div className="target-mark">A</div><h2>{title}</h2><p>{text}</p><button className="button primary large" onClick={onAction}>{actionLabel}</button></div>; }
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="step"><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
