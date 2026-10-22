import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import LiveFlowConductor from "@/components/LiveFlowConductor";
import TimerPanel from "@/components/TimerPanel";
import ArenaToolDrawer from "@/components/ArenaToolDrawer";
import ParticipantSelectionExperience from "@/components/arena/selection/ParticipantSelectionExperience";
import DrawSettingsDrawer from "@/components/arena/selection/DrawSettingsDrawer";
import RankingPanel from "@/components/arena/ranking/RankingPanel";
import ArenaContextRail from "@/components/arena/live/ArenaContextRail";
import { useArenaRealtime } from "@/components/arena/live/useArenaRealtime";
import { useProjectorControl } from "@/components/arena/live/useProjectorControl";
import { useArenaScoring } from "@/components/arena/live/useArenaScoring";
import { useArenaToolState } from "@/components/arena/live/useArenaToolState";
import ArenaContextualMaterial from "@/components/arena/live/ArenaContextualMaterial";
import TeacherLearningOverview from "@/components/learning/TeacherLearningOverview";
import WheelParticipantSelector from "@/components/arena/selection/WheelParticipantSelector";
import { presentationToSelectorMode, selectorModeToPresentation } from "@/components/arena/selection/selector-mode";
import type { ParticipantSelectorMode } from "@/components/arena/selection/selection.types";
import { useDrawSession } from "@/components/arena/selection/useDrawSession";
import DrawOutcomeActions from "@/components/arena/selection/DrawOutcomeActions";
import { ArenaLiveShell, ArenaProjectorButton, ArenaSessionHeader, ArenaSidebar } from "@/components/arena/live/ArenaLiveChrome";
import WordCloudPanel from "@/components/WordCloudPanel";
import DynamicHeader from "@/components/arena/dynamics/DynamicHeader";
import PollPanel from "@/components/PollPanel";
import QuizPanel from "@/components/QuizPanel";
import LearningCheckPanel from "@/components/LearningCheckPanel";
import SessionAccessCard from "@/components/SessionAccessCard";
import { DialogCloseButton, type Notify } from "@/components/ui";
import { QUESTION_DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/activity-questions";
import { xpForStudent } from "@/lib/game";
import { createSession as createSessionApi, fetchSessionParticipants, finishSession as finishSessionApi, releaseParticipantDevice, setParticipantPresence } from "@/lib/session-api";
import { damageBoss as damageBossApi, fetchLiveFlow, fetchSessionMechanics, mergeSessionMechanics, nextArenaQuestion as nextArenaQuestionApi, nextLiveFlow, organizeGroups as organizeGroupsApi, saveGroups as saveGroupsApi, previousLiveFlow, restartArenaQuestions as restartArenaQuestionsApi, setArenaActivity as setArenaActivityApi, setDrawPresentation as setDrawPresentationApi, startBoss as startBossApi, startLiveFlow, type LiveFlowState } from "@/lib/mechanics-api";
import { fetchScoreEvents } from "@/lib/score-api";
import { closeBuzzer as closeBuzzerApi, joinQrImageUrl, openBuzzer as openBuzzerApi, rotateJoinCode } from "@/lib/realtime-api";
import { fetchSessionEventsBySession, type SessionEvent } from "@/lib/session-event-api";
import { updateRankingPresentation, type RankingPresentationInput } from "@/lib/ranking-api";
import { dateTime, errorMessage, formatSessionElapsed, todayTitle } from "./format";
import { Avatar, MiniEmpty, Panel, Step } from "./ui";
import type { ArenaData, ScoreCategory, SessionParticipant, Student } from "@/lib/types";

const SCORE_PRESETS: { points: number; label: string; category: ScoreCategory }[] = [
  { points: 5, label: "Parcial / complemento", category: "QUESTION" },
  { points: 10, label: "Resposta correta", category: "QUESTION" },
  { points: 15, label: "Debug / código", category: "DEBUG" },
  { points: 20, label: "Desafio avançado", category: "CHALLENGE" },
];

export function ArenaView({ data, classroomId, students, currentSession, sessionParticipants, preferredActivityId, onPreferredActivityChange, onBack, onGoDashboard, teacherUsername, onOpenSettings, onLogout, onSessionEnded, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  sessionParticipants: SessionParticipant[];
  preferredActivityId?: string;
  onPreferredActivityChange: (activityId?: string) => void;
  onBack: () => void;
  onGoDashboard: () => void;
  teacherUsername: string;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSessionEnded: () => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: Notify;
}) {
  const [presentIds, setPresentIds] = useState<string[]>(students.map((s) => s.id));
  const [title, setTitle] = useState(`Aula · ${todayTitle()}`);
  const [drawPresentationBusy, setDrawPresentationBusy] = useState(false);
  const {
    activeDynamic,
    activeTool,
    drawSettingsOpen,
    sessionQrOpen,
    selectDynamic,
    selectTool,
    closeTool,
    resetNavigation,
    openDrawSettings,
    closeDrawSettings,
    openSessionQr,
    closeSessionQr,
  } = useArenaToolState();
  const [groups, setGroups] = useState<string[][]>(currentSession?.groups ?? []);
  const [groupSize, setGroupSize] = useState(currentSession?.groupSize ?? 2);
  const [groupsDirty, setGroupsDirty] = useState(false);
  const [bossName, setBossName] = useState("Spaghetti Code");
  const [bossHp, setBossHp] = useState(100);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [presenceBusyId, setPresenceBusyId] = useState<string | undefined>();
  const [mechanicsBusy, setMechanicsBusy] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [realtimeBusy, setRealtimeBusy] = useState(false);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [liveFlowState, setLiveFlowState] = useState<LiveFlowState | null>(null);
  const [liveFlowBusy, setLiveFlowBusy] = useState(false);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const classroom = data.classrooms.find((item) => item.id === classroomId);
  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId),
    [data.activities, classroomId],
  );
  const [activityId, setActivityId] = useState<string>(currentSession?.activityId ?? preferredActivityId ?? "");
  const selectorMode = presentationToSelectorMode(currentSession?.selectorPresentation);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const drawSession = useDrawSession(currentSession?.id);
  const drawBusy = drawSession.busy || drawSession.loading || drawSession.needsReconciliation;
  const currentDrawAttempt = drawSession.state?.currentAttempt;
  useEffect(() => {
    setSelectedId(undefined);
  // A identidade da sessão define o contexto da seleção do professor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  const {
    reason,
    setReason,
    customPoints,
    setCustomPoints,
    addScore,
    addBuzzerScore,
    scoreBusy,
  } = useArenaScoring({
    classroomId,
    sessionId: currentSession?.id,
    activityId: currentSession?.activityId,
    questionId: currentSession?.currentQuestionId,
    selectedStudentId: selectedId,
    onScoreEvent: (event) => {
      patch((current) => ({
        ...current,
        scoreEvents: [...current.scoreEvents.filter((existing) => existing.id !== event.id), event],
      }));
    },
    notify,
  });

  const {
    joinCode,
    setJoinCode,
    buzzerState,
    setBuzzerState,
    timerState,
    setTimerState,
    wordCloudState,
    setWordCloudState,
    pollState,
    setPollState,
    quizState,
    setQuizState,
    learningCheckState,
    setLearningCheckState,
    rankingState,
    setRankingState,
    realtimeStatus,
  } = useArenaRealtime({
    sessionId: currentSession?.id,
    notify,
    onSelectedStudent: setSelectedId,
    onParticipantsChanged: refreshRealtimeParticipants,
  });

  const projectorControl = useProjectorControl(joinCode?.code, notify);

  useEffect(() => {
    if (typeof window !== "undefined") setPublicBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!sessionQrOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSessionQr();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionQrOpen]);

  useEffect(() => {
    if (!currentSession) return;
    setSessionNow(Date.now());
    const intervalId = window.setInterval(() => setSessionNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [currentSession?.id]);

  // The dashboard loads only session summaries. Hydrate authoritative mechanics for the
  // single session actually opened by the teacher, never for hundreds of historical runs.
  useEffect(() => {
    if (!currentSession) return;
    let active = true;
    void fetchSessionMechanics(currentSession.id)
      .then((runtime) => {
        if (!active) return;
        patch((current) => ({
          ...current,
          sessions: current.sessions.map((session) => session.id === runtime.sessionId
            ? mergeSessionMechanics(session, runtime) : session),
        }));
      })
      .catch((error) => { if (active) notify(errorMessage(error), "error"); });
    return () => { active = false; };
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
        if (active) notify(errorMessage(error), "error");
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

  // Every mechanics update builds a new groups array, so compare by value, and
  // never overwrite a composition the teacher has not saved yet (rc.6).
  const savedGroupsKey = JSON.stringify(currentSession?.groups ?? []);
  const groupsSessionId = useRef(currentSession?.id);
  useEffect(() => {
    const sessionChanged = groupsSessionId.current !== currentSession?.id;
    groupsSessionId.current = currentSession?.id;
    if (groupsDirty && !sessionChanged) return;
    setGroups(JSON.parse(savedGroupsKey) as string[][]);
    setGroupSize(currentSession?.groupSize ?? 2);
    setGroupsDirty(false);
  }, [currentSession?.id, savedGroupsKey, currentSession?.groupSize, groupsDirty]);

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
      resetNavigation(activityId ? "runbook" : "draw");
      notify("Arena iniciada. Sessão e mecânicas estão no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error), "error");
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
      setGroupsDirty(false);
      resetNavigation("draw");
      setLiveFlowState(null);
      onPreferredActivityChange(undefined);
      notify("Sessão encerrada e persistida.");

      // Navega em uma nova task depois que o estado da sessão foi limpo.
      window.setTimeout(() => {
        onSessionEnded();
      }, 0);
    } catch (error) {
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
    } finally {
      setPresenceBusyId(undefined);
    }
  }

  async function drawParticipant() {
    try {
      const result = await drawSession.draw();
      if (result) setSelectedId(result.studentId);
    } catch (error) { notify(errorMessage(error), "error"); }
  }

  async function resolveParticipant(outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) {
    if (!currentSession || !currentDrawAttempt) return;
    try {
      await drawSession.resolve(currentDrawAttempt.attemptId, outcome, points);
      setSelectedId(undefined);
      if (points != null) {
        const updated = await fetchScoreEvents(classroomId);
        patch((current) => ({ ...current,
          scoreEvents: [...current.scoreEvents.filter((event) => event.classroomId !== classroomId), ...updated],
        }));
      }
      notify(outcome === "CONFIRMED" ? (points == null ? "Participação confirmada sem XP." : `Participação confirmada: +${points} XP.`)
        : outcome === "PASSED" ? "Vez passada sem pontuação." : "Sorteio anulado; participante volta a ficar elegível.");
    } catch (error) { notify(errorMessage(error), "error"); }
  }

  async function changeDrawPolicy(policy: "ROUND_ROBIN_SHUFFLED" | "BALANCED_WEIGHTED") {
    try { await drawSession.changePolicy(policy); }
    catch (error) { notify(errorMessage(error), "error"); }
  }

  async function startNextDrawRound() {
    try { await drawSession.nextRound(); }
    catch (error) { notify(errorMessage(error), "error"); }
  }

  async function changeDrawPresentation(mode: ParticipantSelectorMode) {
    if (!currentSession || drawPresentationBusy || mode === selectorMode) return;

    setDrawPresentationBusy(true);
    try {
      const runtime = await setDrawPresentationApi(
        currentSession.id,
        selectorModeToPresentation(mode),
      );
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === currentSession.id
            ? mergeSessionMechanics(session, runtime)
            : session
        ),
      }));
      notify(
        mode === "wheel"
          ? "Apresentação do sorteio alterada para Roleta."
          : "Apresentação do sorteio alterada para Grid + Spotlight.",
      );
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setDrawPresentationBusy(false);
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      setGroupsDirty(false);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      notify(groupSize === 1 ? "Organização individual ativada." : `${result.groups.length} grupo(s) organizado(s) com histórico persistido.`);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setMechanicsBusy(false);
    }
  }

  function moveGroupMember(studentId: string, sourceIndex: number, targetIndex: number) {
    if (sourceIndex === targetIndex || targetIndex < 0 || targetIndex >= groups.length) return;
    if ((groups[targetIndex]?.length ?? 0) >= 12) {
      notify("Um grupo pode ter no máximo 12 participantes.");
      return;
    }

    setGroups((current) => current.map((group, index) => {
      if (index === sourceIndex) return group.filter((id) => id !== studentId);
      if (index === targetIndex && !group.includes(studentId)) return [...group, studentId];
      return group;
    }));
    setGroupsDirty(true);
  }

  function addManualGroup() {
    setGroups((current) => [...current, []]);
    setGroupsDirty(true);
  }

  async function saveManualGroups() {
    if (!currentSession || mechanicsBusy || !groupsDirty) return;
    const compactGroups = groups.filter((group) => group.length > 0);
    if (!compactGroups.length) {
      notify("Mantenha ao menos um grupo com participantes.");
      return;
    }

    setMechanicsBusy(true);
    try {
      const result = await saveGroupsApi(currentSession.id, compactGroups);
      setGroups(result.groups);
      setGroupSize(result.runtime.groupSize ?? 2);
      setGroupsDirty(false);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      notify("Composição dos grupos salva.");
    } catch (error) {
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
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
      notify(errorMessage(error), "error");
    } finally {
      setRealtimeBusy(false);
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
      notify("Não foi possível copiar o código automaticamente.", "error");
    }
  }

  async function changeRankingPresentation(input: RankingPresentationInput) {
    if (!currentSession || rankingBusy) return;
    setRankingBusy(true);
    try {
      const next = await updateRankingPresentation(currentSession.id, input);
      setRankingState(next);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setRankingBusy(false);
    }
  }

  const selected = students.find((student) => student.id === (currentDrawAttempt?.studentId ?? selectedId));
  const selectedXp = selected ? xpForStudent(data.scoreEvents, classroomId, selected.id) : 0;
  const activeActivity = data.activities.find((activity) => activity.id === (currentSession?.activityId ?? activityId));
  const currentQuestion = activeActivity?.questions?.find((question) => question.id === currentSession?.currentQuestionId);
  const recentDrawEvents = sessionEvents
    .filter((event) => event.eventType === "DRAW_COMPLETED")
    .sort((a, b) => b.sequenceNo - a.sequenceNo);
  const presentStudentIdSet = new Set(currentSession?.presentStudentIds ?? []);
  const drawAttemptCounts = (drawSession.state?.history ?? []).reduce<Record<string, number>>((counts, attempt) => {
    if (attempt.status !== "VOIDED") counts[attempt.studentId] = (counts[attempt.studentId] ?? 0) + 1;
    return counts;
  }, {});
  const drawRoundCounts = (drawSession.state?.history ?? [])
    .filter((attempt) => attempt.roundNumber === drawSession.state?.roundNumber)
    .reduce<Record<string, number>>((counts, attempt) => {
      if (attempt.status === "CONFIRMED" || attempt.status === "PASSED") {
        counts[attempt.studentId] = (counts[attempt.studentId] ?? 0) + 1;
      }
      return counts;
    }, {});
  const drawnStudentIds = new Set((drawSession.state?.history ?? [])
    .filter((attempt) => attempt.roundNumber === drawSession.state?.roundNumber)
    .filter((attempt) => attempt.status === "CONFIRMED" || attempt.status === "PASSED")
    .filter((attempt) => presentStudentIdSet.has(attempt.studentId))
    .map((attempt) => attempt.studentId));
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
  const bossLifecycle = !currentSession?.boss
    ? "PREPARAR"
    : currentSession.boss.currentHp === 0
      ? "RESULTADO"
      : "AO VIVO";
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
    <ArenaLiveShell
      sidebar={
        <ArenaSidebar
          activeDynamic={activeDynamic}
          activeTool={activeTool}
          teacherUsername={teacherUsername}
          sessionElapsed={formatSessionElapsed(currentSession.startedAt, sessionNow)}
          sessionBusy={sessionBusy}
          materialAction={<ArenaContextualMaterial sessionId={currentSession.id} notify={notify} />}
          evidenceAction={<TeacherLearningOverview key={currentSession.id} sessionId={currentSession.id}
            onOpenLearningCheck={() => selectDynamic("learning-check")} />}
          projectorAction={<ArenaProjectorButton
            canProject={Boolean(joinCode)}
            onToggleProjector={projectorControl.toggle}
            projectorActive={projectorControl.projecting}
            projectorPending={projectorControl.pending}
          />}
          onEndSession={() => { void endSession(); }}
          onGoDashboard={onGoDashboard}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
          onSelectDynamic={(dynamic) => {
            selectDynamic(dynamic);
          }}
          onSelectTool={selectTool}
        />
      }
      header={
        <ArenaSessionHeader
          classroomName={classroom?.name ?? "Turma"}
          elapsed={formatSessionElapsed(currentSession.startedAt, sessionNow)}
          sessionBusy={sessionBusy}
          canProject={Boolean(joinCode)}

          onBack={onBack}
          onToggleProjector={projectorControl.toggle}
          projectorActive={projectorControl.projecting}
          projectorPending={projectorControl.pending}
          onEndSession={() => { void endSession(); }}
        />
      }
    >
      <div className="arena-cockpit">
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
                  selectDynamic("wordcloud");
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
            {drawSession.needsReconciliation ? (
              <section role="alert" className="arena-legacy-draw-warning" data-testid="draw-reconciliation-warning">
                <h2>Verificar estado do sorteio</h2>
                <p>A conexão falhou durante um comando. Ele pode ter sido registrado no servidor. Não repita o sorteio nem conceda XP até conferir o estado atualizado.</p>
                <button type="button" className="button secondary" onClick={() => {
                  void drawSession.refresh().catch(() => notify("Ainda sem conexão. Tente sincronizar ao reconectar.", "error"));
                }}>Sincronizar sorteio</button>
              </section>
            ) : drawSession.error ? (
              <section role="alert" className="arena-legacy-draw-warning">
                <h2>Sorteio indisponível nesta sessão</h2>
                <p>{errorMessage(drawSession.error)}</p>
                <p>Se a sessão começou com o sorteio de outra versão, conclua-a antes de usar o novo formato com confirmação.</p>
                <button type="button" className="button secondary" onClick={() => {
                  void drawSession.refresh().catch((error) => notify(errorMessage(error), "error"));
                }}>Tentar novamente</button>
              </section>
            ) : selectorMode === "grid-spotlight" ? (
              <ParticipantSelectionExperience
                students={students}
                presentStudentIds={currentSession.presentStudentIds}
                drawCounts={drawRoundCounts}
                selectedStudentId={currentDrawAttempt?.studentId}
                phase={currentDrawAttempt ? "revealed" : "ready"}
                busy={drawBusy}
                canStartNextRound={drawSession.state?.canStartNextRound ?? false}
                onNextRound={() => { void startNextDrawRound(); }}
                onDraw={() => { void drawParticipant(); }}
                onResolve={(outcome, points) => { void resolveParticipant(outcome, points); }}
                onOpenSettings={openDrawSettings}
              />
            ) : (
            <div className="smart-draw-hero">
              <DynamicHeader dynamic="draw"
                title="Sorteio Inteligente"
                description="Escolha um aluno de forma justa e dinâmica, mantendo toda a turma em jogo."
                actions={(
                  <>
                    <button type="button" className="smart-draw-settings" onClick={openDrawSettings}>
                      ⚙ Ajustes
                    </button>
                    {drawSession.state?.canStartNextRound && (
                      <button className="button primary" disabled={drawBusy} type="button"
                        onClick={() => { void startNextDrawRound(); }}>Iniciar próxima rodada</button>
                    )}
                  </>
                )}
              />

              <WheelParticipantSelector
                participants={students.filter((student) => currentSession.presentStudentIds.includes(student.id))}
                selectedStudentId={selectedId}
                drawing={drawBusy}
                disabled={Boolean(currentDrawAttempt) || Boolean(drawSession.state?.canStartNextRound)}
                onDraw={() => { void drawParticipant(); }}
              />

              <div className={selected ? "selected-student-bar active" : "selected-student-bar"}>
                <div className="selected-student-primary">
                  <div className="selected-student-main">
                    {selected ? (
                      <>
                        <Avatar student={selected} large />
                        <div className="selected-student-copy">
                          <div className="selected-student-name-row">
                            <h3>{selected.nickname || selected.name}</h3>
                            <span>🏆 Sorteado agora</span>
                          </div>
                          <p>
                            Vezes chamado nesta sessão: {drawAttemptCounts[selected.id] ?? 0}
                            <b>·</b>
                            <em>{selectedXp} XP acumulados na turma</em>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="draw-result-placeholder" aria-hidden="true">◎</div>
                        <div className="selected-student-copy">
                          {currentSession.presentStudentIds.length === 0 ? (
                            <>
                              <h3>Nenhum aluno presente</h3>
                              <p>Marque a presença dos alunos para habilitar o sorteio.</p>
                            </>
                          ) : (
                            <>
                              <h3>Aguardando o próximo sorteio</h3>
                              <p>O professor registra a participação e decide separadamente se haverá XP.</p>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {currentDrawAttempt && <DrawOutcomeActions busy={drawBusy}
                    onResolve={(outcome, points) => { void resolveParticipant(outcome, points); }} />}
                </div>

                <section className="draw-coverage-summary" aria-label={`Cobertura do sorteio: ${drawnStudentIds.size} de ${currentSession.presentStudentIds.length}, ${drawCoverage}%`}>
                  <div className="draw-coverage-count">
                    <span className="draw-coverage-badge">chamados nesta rodada</span>
                    <details className="draw-history-popover draw-history-inline">
                      <summary aria-label="Exibir últimos sorteados" title="Exibir últimos sorteados">
                        <strong>{drawnStudentIds.size}/{currentSession.presentStudentIds.length}</strong>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <div className="draw-history-menu" aria-label="Últimos sorteados">
                        {recentDrawEvents.length > 0 ? recentDrawEvents.slice(0, 10).map((event, index) => {
                          const studentId = typeof event.payload.studentId === "string" ? event.payload.studentId : "";
                          const student = students.find((item) => item.id === studentId);
                          return (
                            <span key={event.id} title={dateTime(event.occurredAt)}>
                              {index > 0 && <i aria-hidden="true">·</i>}
                              {student?.nickname || student?.name?.split(" ")[0] || "Aluno"}
                            </span>
                          );
                        }) : (
                          <small>Nenhum sorteio registrado nesta sessão.</small>
                        )}
                      </div>
                    </details>
                  </div>

                  <div
                    className="draw-coverage-ring"
                    style={{ "--coverage-angle": `${drawCoverage * 3.6}deg` } as CSSProperties}
                    aria-hidden="true"
                  >
                    <span>{drawCoverage}%</span>
                  </div>
                </section>
              </div>
            </div>

            )}

            {/* Manual XP lives in Tools → Pontuação rápida. Draw outcome XP is separate. */}
          </div>
          ) : activeDynamic === "wordcloud" ? (
            <div className="arena-dynamic-workspace">
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
            </div>
          ) : activeDynamic === "poll" ? (
            <div className="arena-dynamic-workspace">
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
            </div>
          ) : activeDynamic === "quiz" ? (
            <div className="arena-quiz-workspace">
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
            </div>
          ) : activeDynamic === "learning-check" ? (
            <div className="arena-dynamic-workspace">
              <LearningCheckPanel
                sessionId={currentSession.id}
                state={learningCheckState}
                onStateChange={setLearningCheckState}
                presentCount={sessionParticipants.filter((participant) => participant.present).length}
                notify={notify}
                onOpenGroups={() => selectTool("groups")}
              />
            </div>
          ) : activeDynamic === "buzzer" ? (
            <div className="arena-dynamic-workspace buzzer-workspace">
                <DynamicHeader dynamic="buzzer"
                  title="Buzzer"
                  description="Velocidade com ordem oficial definida pelo servidor."
                  status={buzzerState.status === "OPEN" ? "AO VIVO" : buzzerState.status === "CLOSED" ? "ENCERRADO" : undefined}
                  />
              <section className="buzzer-hero">
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
            <div className="arena-dynamic-workspace boss-workspace">
                <DynamicHeader dynamic="boss"
                  title="Boss Battle"
                  description="Transforme desafios da aula em dano coletivo contra um objetivo compartilhado."
                  status={bossLifecycle === "PREPARAR" ? undefined : bossLifecycle}
                  />
              <section className="boss-hero">
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

        <ArenaContextRail
          activeDynamic={activeDynamic}
          selectorMode={selectorMode}
          students={students}
          presentStudentIds={currentSession.presentStudentIds}
          sessionParticipants={sessionParticipants}
          drawnCount={drawnStudentIds.size}
          drawHistory={(drawSession.state?.history ?? [])
            .filter((attempt) => attempt.status !== "VOIDED")
            .slice().reverse().map((attempt) => ({
              id: attempt.attemptId,
              studentId: attempt.studentId,
              occurredAt: attempt.selectedAt,
            }))}
          sessionId={currentSession.id}
          joinCode={joinCode}
          publicBaseUrl={publicBaseUrl}
          onOpenAttendance={() => selectTool("attendance")}
          onCopySessionCode={() => { void copySessionCode(); }}
          onOpenQr={openSessionQr}
        />
      </div>

      {sessionQrOpen && joinCode && publicBaseUrl && (
        <div
          className="arena-session-qr-modal"
          role="presentation"
          onClick={closeSessionQr}
        >
          <section
            className="arena-session-qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arena-session-qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <DialogCloseButton
              className="arena-session-qr-close"
              onClick={closeSessionQr}
              label="Fechar QR Code ampliado"
            />
            <span className="arena-session-qr-eyebrow">ENTRE NA ARENA</span>
            <h2 id="arena-session-qr-title">Escaneie para participar</h2>
            <div className="arena-session-qr-large">
              <img
                src={joinQrImageUrl(currentSession.id, publicBaseUrl, joinCode.code, 720)}
                alt={`QR Code ampliado da sessão ${joinCode.code}`}
              />
            </div>
            <strong>{joinCode.code}</strong>
            <p>Aponte a câmera do celular para acessar a sessão.</p>
          </section>
        </div>
      )}

      <DrawSettingsDrawer
        open={drawSettingsOpen}
        mode={selectorMode}
        busy={drawPresentationBusy || drawBusy}
        policy={drawSession.state?.policy ?? "ROUND_ROBIN_SHUFFLED"}
        policyLocked={Boolean(currentDrawAttempt)}
        onPolicyChange={(policy) => { void changeDrawPolicy(policy); }}
        onClose={closeDrawSettings}
        onPresentationChange={(mode) => { void changeDrawPresentation(mode); }}
      />

      <ArenaToolDrawer
        open={activeTool === "timer"}
        title="Timer"
        subtitle="Controle o tempo sem sair da dinâmica atual."
        size="wide"
        hideScrollbar
        onClose={closeTool}
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
        onClose={closeTool}
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
            <button className="button primary" disabled={mechanicsBusy} onClick={() => { void createGroups(); }}>
              {groupSize === 1 ? "Ativar individual" : "Organizar turma"}
            </button>
          </div>
          {groups.length > 0 ? (
            <>
              <div className="arena-tool-groups-actions">
                <button type="button" className="button ghost" disabled={mechanicsBusy} onClick={addManualGroup}>
                  + Novo grupo
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={!groupsDirty || mechanicsBusy}
                  onClick={() => { void saveManualGroups(); }}
                >
                  Salvar composição
                </button>
              </div>
              <div className="groups-grid arena-tool-groups-grid">
                {groups.map((group, index) => (
                  <div className="group-card" key={index}>
                    <b>{groupSize === 1 ? `INDIVIDUAL ${String(index + 1).padStart(2, "0")}` : `GRUPO ${String(index + 1).padStart(2, "0")}`}</b>
                    {group.length === 0 ? (
                      <span className="arena-tool-group-empty">Mova um participante para este grupo.</span>
                    ) : group.map((id) => {
                      const student = students.find((item) => item.id === id);
                      const name = student?.nickname || student?.name || "Participante";
                      return (
                        <label className="arena-tool-group-member" key={id}>
                          <span>{name}</span>
                          <select
                            className="select"
                            aria-label={`Mover ${name} para outro grupo`}
                            value={index}
                            onChange={(event) => moveGroupMember(id, index, Number(event.target.value))}
                          >
                            {groups.map((targetGroup, targetIndex) => (
                              <option
                                key={targetIndex}
                                value={targetIndex}
                                disabled={targetIndex !== index && targetGroup.length >= 12}
                              >
                                Grupo {targetIndex + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
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
        onClose={closeTool}
      >
        <div className="arena-tool-attendance">
          <SessionAccessCard
            sessionId={currentSession.id}
            joinCode={joinCode}
            publicBaseUrl={publicBaseUrl}
            notify={notify}
            onRotate={rotateSessionCode}
            rotateBusy={realtimeBusy}
            compact
            drawer
            title="Entrada dos alunos"
            subtitle=""
            onExpandQr={openSessionQr}
          />

          <div className="arena-tool-roster">
            <div className="arena-tool-roster-head">
              <strong>Participantes</strong>
              <div className="arena-tool-roster-badges">
                <span className="online">{sessionParticipants.filter((participant) => participant.connected).length} online</span>
                <span>{currentSession.presentStudentIds.length}/{sessionParticipants.length} presentes</span>
              </div>
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
        open={activeTool === "ranking"}
        title="Ranking da sessão"
        subtitle="Classificação baseada nos pontos acumulados nas dinâmicas desta aula."
        size="wide"
        onClose={closeTool}
      >
        <RankingPanel
          key={currentSession?.id ?? "no-session"}
          state={rankingState}
          busy={rankingBusy}
          onPresentationChange={changeRankingPresentation}
        />
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "score"}
        title="Pontuação rápida"
        subtitle="Aplique XP mantendo a dinâmica principal no palco."
        onClose={closeTool}
      >
        <div className="arena-tool-score">
          <label className="field-label" htmlFor="arena-quick-score-student">Aluno</label>
          <select id="arena-quick-score-student" className="select full" value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || undefined)}>
            <option value="">Selecione um aluno</option>
            {students
              .filter((student) => currentSession.presentStudentIds.includes(student.id))
              .map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>

          <div className="score-presets arena-tool-score-presets">
            {SCORE_PRESETS.map((preset) => (
              <button
                key={`${preset.points}-${preset.label}`}
                disabled={!selected || scoreBusy}
                onClick={() => { setReason(preset.label); void addScore(preset.points, preset.category, preset.label); }}
              >
                <b>+{preset.points}</b>
                <span>{preset.points === 5 ? "Participação" : preset.label}</span>
              </button>
            ))}
          </div>

          <div className="custom-score arena-tool-score-custom">
            <input className="input compact" type="number" aria-label="Quantidade de XP (diferente de zero)" step={1} value={Number.isFinite(customPoints) ? customPoints : ""} onChange={(event) => setCustomPoints(event.target.value === "" ? NaN : Number(event.target.value))} />
            <input className="input" aria-label="Motivo da pontuação" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo ou observação" />
            <button type="button" className="button primary" disabled={!selected || scoreBusy || !reason.trim() || !Number.isSafeInteger(customPoints) || customPoints === 0} onClick={() => { void addScore(customPoints, "ADJUSTMENT", reason); }}>
              Aplicar
            </button>
          </div>
        </div>
      </ArenaToolDrawer>
    </ArenaLiveShell>
  );
}
