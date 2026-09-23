"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import type { Classroom, Student } from "@/lib/types";
import {
  applyStudentMatch,
  connectMicrosoft,
  discoverMicrosoftClasses,
  startMicrosoftOAuth,
  fetchClassroomLinks,
  fetchIntegrationConnections,
  fetchMicrosoftReadiness,
  fetchMicrosoftRoster,
  fetchRosterReconciliation,
  fetchStudentMatchPreview,
  applyRosterReconciliation,
  fetchActivityMapping,
  fetchSubmissionTracking,
  fetchMicrosoftSubmissionOutcome,
  applyMicrosoftSubmissionOutcome,
  publishMicrosoftSubmissionOutcome,
  importMicrosoftSubmission,
  linkMicrosoftAssignment,
  linkMicrosoftClass,
  type ClassroomLink,
  type IntegrationConnection,
  type MicrosoftClassDiscovery,
  type MicrosoftReadiness,
  type MicrosoftRoster,
  type MicrosoftActivityMapping,
  type MicrosoftSubmissionTracking,
  type MicrosoftSubmissionOutcomePreview,
  type RosterReconciliation,
  type RosterReconciliationItem,
  type StudentMatchItem,
  type StudentMatchPreview,
  type StudentMatchStatus,
} from "@/lib/microsoft-integration-api";
import styles from "./MicrosoftIntegrationConsole.module.css";
import { deriveIntegrationOperationState } from "@/lib/integration-operations";
import { fetchIntegrationObservability, type IntegrationObservability } from "@/lib/integration-observability-api";

const MATCH_LABEL: Record<StudentMatchStatus, string> = {
  ALREADY_LINKED: "Já vinculado",
  SAFE_MATCH: "Match seguro",
  NEW_STUDENT: "Novo aluno",
  REVIEW_REQUIRED: "Revisar",
  AMBIGUOUS: "Ambíguo",
  CONFLICT: "Conflito",
  IGNORED_NON_STUDENT: "Ignorado",
};

function badgeVariant(status: StudentMatchStatus): "neutral" | "success" | "warning" | "danger" {
  if (status === "ALREADY_LINKED" || status === "SAFE_MATCH") return "success";
  if (status === "CONFLICT" || status === "AMBIGUOUS") return "danger";
  if (status === "REVIEW_REQUIRED" || status === "NEW_STUDENT") return "warning";
  return "neutral";
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";

export default function MicrosoftIntegrationConsole({
  classrooms,
  students,
  onBack,
}: {
  classrooms: Classroom[];
  students: Student[];
  onBack: () => void;
}) {
  const [readiness, setReadiness] = useState<MicrosoftReadiness | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [displayName, setDisplayName] = useState("Microsoft Teams");
  const [tenantId, setTenantId] = useState("");
  const [discovery, setDiscovery] = useState<MicrosoftClassDiscovery | null>(null);
  const [links, setLinks] = useState<ClassroomLink[]>([]);
  const [localSelection, setLocalSelection] = useState<Record<string, string>>({});
  const [roster, setRoster] = useState<MicrosoftRoster | null>(null);
  const [preview, setPreview] = useState<StudentMatchPreview | null>(null);
  const [reconciliation, setReconciliation] = useState<RosterReconciliation | null>(null);
  const [activityMapping, setActivityMapping] = useState<MicrosoftActivityMapping | null>(null);
  const [submissionTracking, setSubmissionTracking] = useState<MicrosoftSubmissionTracking | null>(null);
  const [outcomePreview, setOutcomePreview] = useState<MicrosoftSubmissionOutcomePreview | null>(null);
  const [observability, setObservability] = useState<IntegrationObservability | null>(null);
  const [activitySelection, setActivitySelection] = useState<Record<string, string>>({});
  const [explicitStudent, setExplicitStudent] = useState<Record<string, string>>({});
  const [inspectedLinkId, setInspectedLinkId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const microsoftConnections = useMemo(
    () => connections.filter((item) => item.provider === "MICROSOFT_TEAMS"),
    [connections],
  );
  const selectedConnection = microsoftConnections.find((item) => item.id === connectionId);

  const pendingStudentMatches = preview
    ? preview.safeMatches + preview.newStudents + preview.reviewRequired + preview.ambiguous + preview.conflicts
    : null;
  const unmappedActivities = activityMapping
    ? Math.max(0, activityMapping.assignments.length - activityMapping.mappings.length)
    : null;
  const importedSubmissions = submissionTracking
    ? submissionTracking.items.filter((item) => Boolean(item.localSubmissionId)).length
    : null;
  const operationState = deriveIntegrationOperationState({
    connectionActive: selectedConnection?.status === "ACTIVE",
    linkedClassrooms: links.length,
    classroomInspected: Boolean(inspectedLinkId),
    pendingStudentMatches,
    unmappedActivities,
    deliveredSubmissions: submissionTracking?.delivered ?? null,
    importedSubmissions,
  });
  const matchConflicts = preview
    ? preview.conflicts + preview.ambiguous + preview.reviewRequired
    : null;
  const rosterConflicts = reconciliation
    ? reconciliation.remoteMissing
      + reconciliation.localInactive
      + reconciliation.brokenLinks
    : null;
  const conflictsEvaluated = preview !== null || reconciliation !== null;
  const conflictCount = conflictsEvaluated
    ? (matchConflicts ?? 0) + (rosterConflicts ?? 0)
    : null;

  const healthLabel: Record<
    NonNullable<IntegrationObservability>["health"],
    string
  > = {
    NO_HISTORY: "Sem histórico",
    HEALTHY: "Saudável",
    ATTENTION: "Atenção",
    ERROR: "Falha",
    SYNCING: "Sincronizando",
  };

  const jumpTo = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    let active = true;
    Promise.all([fetchMicrosoftReadiness(), fetchIntegrationConnections()])
      .then(([ready, all]) => {
        if (!active) return;
        setReadiness(ready);
        setConnections(all);
        const teams = all.filter((item) => item.provider === "MICROSOFT_TEAMS");
        const preferred = teams.find((item) => item.status === "ACTIVE") ?? teams[0];
        if (preferred) setConnectionId(preferred.id);
      })
      .catch((cause) => active && setError(errorMessage(cause)));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!connectionId) {
      setLinks([]);
      return;
    }
    let active = true;
    Promise.all([fetchClassroomLinks(connectionId), fetchIntegrationObservability(connectionId)])
      .then(([items, health]) => { if (!active) return; setLinks(items); setObservability(health); })
      .catch((cause) => active && setError(errorMessage(cause)));
    return () => { active = false; };
  }, [connectionId]);

  async function refreshConnections(preferredId?: string) {
    const all = await fetchIntegrationConnections();
    setConnections(all);
    if (preferredId) setConnectionId(preferredId);
  }

  async function refreshLinks(preferredId?: string) {
    if (!connectionId) return;
    const result = await fetchClassroomLinks(connectionId);
    setLinks(result);
    if (preferredId) setInspectedLinkId(preferredId);
  }

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("connect");
    setError("");
    setNotice("");
    try {
      const connection = await connectMicrosoft({
        displayName: displayName.trim(),
        tenantId: tenantId.trim(),
      });
      await refreshConnections(connection.id);
      setNotice("Conexão Microsoft validada e ativada.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function handleDiscover() {
    if (!connectionId) return;
    setBusy("discover");
    setError("");
    setNotice("");
    try {
      const result = await discoverMicrosoftClasses(connectionId);
      setDiscovery(result);
      setNotice(`${result.count} turma(s) encontrada(s).`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function handleLink(microsoftClassId: string) {
    const classroomId = localSelection[microsoftClassId];
    if (!connectionId || !classroomId) return;
    setBusy(`link:${microsoftClassId}`);
    setError("");
    try {
      const result = await linkMicrosoftClass(connectionId, { classroomId, microsoftClassId });
      await refreshLinks(result.linkId);
      setNotice(`Turma vinculada: ${result.microsoftDisplayName}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function inspect(link: ClassroomLink) {
    if (!connectionId) return;
    setBusy(`inspect:${link.id}`);
    setError("");
    setInspectedLinkId(link.id);
    try {
      const [rosterResult, previewResult, reconciliationResult, activityMappingResult] = await Promise.all([
        fetchMicrosoftRoster(connectionId, link.id),
        fetchStudentMatchPreview(connectionId, link.id),
        fetchRosterReconciliation(connectionId, link.id),
        fetchActivityMapping(connectionId, link.id),
      ]);
      setRoster(rosterResult);
      setPreview(previewResult);
      setReconciliation(reconciliationResult);
      setActivityMapping(activityMappingResult);
    } catch (cause) {
      setRoster(null);
      setPreview(null);
      setReconciliation(null);
      setActivityMapping(null);
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function applyMatch(item: StudentMatchItem) {
    if (!connectionId || !inspectedLinkId) return;

    const explicitId = explicitStudent[item.microsoftUserId];
    const action =
      item.status === "AMBIGUOUS" && explicitId
        ? "LINK_EXISTING_STUDENT"
        : item.status === "NEW_STUDENT"
          ? "CREATE_NEW_STUDENT"
          : "APPLY_SUGGESTED";

    setBusy(`apply:${item.microsoftUserId}`);
    setError("");
    setNotice("");

    try {
      const result = await applyStudentMatch(
        connectionId,
        inspectedLinkId,
        {
          microsoftUserId: item.microsoftUserId,
          action,
          localStudentId: action === "LINK_EXISTING_STUDENT" ? explicitId : null,
        },
      );

      setNotice(
        result.changed
          ? `${result.studentName} vinculado ao Microsoft Teams.`
          : `${result.studentName} já estava vinculado.`,
      );

      const [rosterResult, previewResult, reconciliationResult] = await Promise.all([
        fetchMicrosoftRoster(connectionId, inspectedLinkId),
        fetchStudentMatchPreview(connectionId, inspectedLinkId),
        fetchRosterReconciliation(connectionId, inspectedLinkId),
      ]);
      setRoster(rosterResult);
      setPreview(previewResult);
      setReconciliation(reconciliationResult);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function applyReconciliation(item: RosterReconciliationItem) {
    if (!connectionId || !inspectedLinkId) return;

    const action =
      item.status === "REMOTE_MISSING"
        ? "DEACTIVATE_ENROLLMENT"
        : "REACTIVATE_ENROLLMENT";

    setBusy(`reconcile:${item.externalStudentLinkId}`);
    setError("");
    setNotice("");

    try {
      const result = await applyRosterReconciliation(
        connectionId,
        inspectedLinkId,
        item.externalStudentLinkId,
        action,
      );
      setNotice(
        result.enrollmentActive
          ? `${result.studentName} reativado na turma local.`
          : `${result.studentName} desativado da turma local sem apagar o vínculo histórico.`,
      );
      const refreshed = await fetchRosterReconciliation(connectionId, inspectedLinkId);
      setReconciliation(refreshed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function mapAssignment(microsoftAssignmentId: string) {
    if (!connectionId || !inspectedLinkId) return;
    const activityId = activitySelection[microsoftAssignmentId];
    if (!activityId) return;

    setBusy(`map-assignment:${microsoftAssignmentId}`);
    setError("");
    setNotice("");

    try {
      await linkMicrosoftAssignment(
        connectionId,
        inspectedLinkId,
        { activityId, microsoftAssignmentId },
      );
      const refreshed = await fetchActivityMapping(connectionId, inspectedLinkId);
      setActivityMapping(refreshed);
      setNotice("Atividade Arena vinculada à tarefa do Teams.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function importSubmission(microsoftSubmissionId: string) {
    if (!connectionId || !inspectedLinkId || !submissionTracking) return;
    setBusy(`import-submission:${microsoftSubmissionId}`);
    setError("");
    setNotice("");
    try {
      const result = await importMicrosoftSubmission(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
        microsoftSubmissionId,
      );
      setNotice(
        result.changed
          ? "Entrega importada para o Arena."
          : "Esta entrega já estava importada.",
      );
      const refreshed = await fetchSubmissionTracking(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
      );
      setSubmissionTracking(refreshed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function inspectOutcome(microsoftSubmissionId: string) {
    if (!connectionId || !inspectedLinkId || !submissionTracking) return;

    setBusy(`outcomes:${microsoftSubmissionId}`);
    setError("");
    setNotice("");

    try {
      const result = await fetchMicrosoftSubmissionOutcome(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
        microsoftSubmissionId,
      );
      setOutcomePreview(result);
    } catch (cause) {
      setOutcomePreview(null);
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function applyOutcome(
    action: "APPLY_FEEDBACK_DRAFT" | "APPLY_POINTS_SINGLE_CRITERION",
  ) {
    if (!connectionId || !inspectedLinkId || !submissionTracking || !outcomePreview) return;

    setBusy(`apply-outcome:${action}`);
    setError("");
    setNotice("");

    try {
      const result = await applyMicrosoftSubmissionOutcome(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
        outcomePreview.microsoftSubmissionId,
        action,
      );

      if (action === "APPLY_FEEDBACK_DRAFT") {
        setNotice(
          result.changed
            ? "Feedback do Teams copiado para o rascunho da avaliação Arena."
            : "O rascunho Arena já possui esse feedback.",
        );
      } else {
        setNotice(
          result.changed
            ? `Pontuação ${result.awardedPoints ?? "—"}/${result.maxPoints ?? "—"} aplicada ao critério local.`
            : "A avaliação Arena já possui essa pontuação.",
        );
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function publishOutcome(
    action: "PUSH_ASSESSMENT" | "RETURN_TO_STUDENT",
  ) {
    if (!connectionId || !inspectedLinkId || !submissionTracking || !outcomePreview) return;

    setBusy(`publish-outcome:${action}`);
    setError("");
    setNotice("");

    try {
      const result = await publishMicrosoftSubmissionOutcome(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
        outcomePreview.microsoftSubmissionId,
        action,
      );

      if (action === "PUSH_ASSESSMENT") {
        setNotice(
          `Avaliação enviada ao Teams${result.pointsSent == null ? "" : ` · ${result.pointsSent} ponto(s)`}${result.feedbackSent ? " · feedback incluído" : ""}.`,
        );
      } else {
        setNotice("Entrega devolvida no Teams. Nota e feedback passam a ficar disponíveis ao aluno.");
      }

      const refreshed = await fetchMicrosoftSubmissionOutcome(
        connectionId,
        inspectedLinkId,
        submissionTracking.activityLinkId,
        outcomePreview.microsoftSubmissionId,
      );
      setOutcomePreview(refreshed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  async function inspectSubmissions(activityLinkId: string) {
    if (!connectionId || !inspectedLinkId) return;

    setBusy(`submissions:${activityLinkId}`);
    setError("");
    setNotice("");

    try {
      const result = await fetchSubmissionTracking(
        connectionId,
        inspectedLinkId,
        activityLinkId,
      );
      setSubmissionTracking(result);
      setOutcomePreview(null);
      setNotice(`Entregas carregadas para ${result.activityTitle}.`);
    } catch (cause) {
      setSubmissionTracking(null);
      setError(errorMessage(cause));
    } finally {
      setBusy("");
    }
  }

  const linkByRemoteId = useMemo(
    () => new Map(links.map((link) => [link.externalClassroomId, link])),
    [links],
  );

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>PLATAFORMA EDUCACIONAL</span>
          <h2>Operação Microsoft Teams</h2>
          <p>Acompanhe a conexão, organize os vínculos da turma e trate somente o que precisa da sua atenção.</p>
        </div>
        <Button variant="ghost" onClick={onBack}>← Visão geral</Button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <section className={styles.operationsPanel}>
        <div className={styles.operationsHeader}>
          <div><span className={styles.eyebrow}>CENTRAL DE OPERAÇÃO</span><h3>Visão geral da integração</h3></div>
          <Badge variant={operationState.stage === "HEALTHY" ? "success" : "warning"} dot>
            {operationState.stage === "HEALTHY" ? "Em dia" : "Ação necessária"}
          </Badge>
        </div>
        <div className={styles.operationMetrics}>
          <Metric label="Conexão" value={selectedConnection?.status === "ACTIVE" ? "Ativa" : "Pendente"} />
          <Metric label="Turmas vinculadas" value={links.length} />
          <Metric label="Alunos vinculados" value={preview ? `${preview.alreadyLinked}/${preview.items.length}` : "—"} />
          <Metric label="Atividades mapeadas" value={activityMapping ? `${activityMapping.mappings.length}/${activityMapping.assignments.length}` : "—"} />
          <Metric label="Entregas importadas" value={submissionTracking && importedSubmissions != null ? `${importedSubmissions}/${submissionTracking.delivered}` : "—"} />
        </div>
        <div className={styles.nextAction}>
          <div><span>Próxima ação</span><strong>{operationState.title}</strong><p>{operationState.detail}</p></div>
          <Button size="sm" onClick={() => jumpTo(operationState.targetId)}>Ir para ação</Button>
        </div>
        <div className={styles.healthGrid}>
          <div className={styles.healthCard}>
            <div className={styles.healthCardHead}>
              <span>Saúde da sincronização</span>
              <Badge variant={observability?.health === "HEALTHY" ? "success" : observability?.health === "ERROR" ? "danger" : observability?.health === "NO_HISTORY" ? "neutral" : "warning"}>
                {observability ? healthLabel[observability.health] : "Carregando"}
              </Badge>
            </div>
            <strong>{observability?.recentExecutions ? `${observability.recentExecutions} execução(ões) recente(s)` : "Nenhuma execução registrada"}</strong>
            <p>{observability?.lastSuccessAt ? `Último sucesso: ${new Date(observability.lastSuccessAt).toLocaleString("pt-BR")}.` : "Ainda não há sucesso registrado no histórico disponível."}</p>
          </div>
          <div className={styles.healthCard}>
            <div className={styles.healthCardHead}>
              <span>Conflitos para revisar</span>
              <Badge
                variant={
                  conflictCount == null
                    ? "neutral"
                    : conflictCount > 0
                      ? "warning"
                      : "success"
                }
              >
                {conflictCount == null ? "—" : conflictCount}
              </Badge>
            </div>

            {conflictCount == null ? (
              <>
                <strong>Ainda não avaliado</strong>
                <p>
                  Selecione uma turma vinculada para analisar correspondências de alunos e divergências de matrícula.
                </p>
              </>
            ) : (
              <>
                <strong>
                  {conflictCount > 0
                    ? "Existem decisões pendentes"
                    : "Nenhum conflito encontrado"}
                </strong>
                <p>
                  {matchConflicts ?? 0} correspondência(s) de aluno e {rosterConflicts ?? 0} divergência(s) de matrícula.
                </p>
                {conflictCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => jumpTo(
                      (matchConflicts ?? 0) > 0
                        ? "integration-students"
                        : "integration-conflicts"
                    )}
                  >
                    Revisar conflitos
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <nav className={styles.operationNav} aria-label="Atalhos da integração">
          <button type="button" onClick={() => jumpTo("integration-classrooms")}>Turmas</button>
          <button type="button" onClick={() => jumpTo("integration-students")}>Alunos</button>
          <button type="button" onClick={() => jumpTo("integration-activities")}>Atividades</button>
          <button type="button" onClick={() => jumpTo("integration-submissions")}>Entregas</button>
        </nav>
      </section>

      <div className={styles.steps}>
        <Card id="integration-connection" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>CONEXÃO</span><h3>Prontidão Microsoft</h3></div>
            <Badge variant={readiness?.applicationCredentialsConfigured ? "success" : "warning"} dot>
              {readiness?.applicationCredentialsConfigured ? "Servidor configurado" : "Configuração pendente"}
            </Badge>
          </div>
          <p>Client ID e secret ficam somente no servidor e nunca são exibidos pelo navegador.</p>
          {!readiness?.applicationCredentialsConfigured && (
            <div className={styles.codeBox}>
              <code>APP_INTEGRATIONS_MICROSOFT_CLIENT_ID</code>
              <code>APP_INTEGRATIONS_MICROSOFT_CLIENT_SECRET</code>
            </div>
          )}
        </Card>

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>CONTA</span><h3>Conta Microsoft 365</h3></div>
            {selectedConnection && <Badge variant={selectedConnection.status === "ACTIVE" ? "success" : "warning"}>{selectedConnection.status}</Badge>}
          </div>

          {microsoftConnections.length > 0 && (
            <label className={styles.field}>
              <span>Conexão existente</span>
              <select value={connectionId} onChange={(event) => {
                setConnectionId(event.target.value);
                setDiscovery(null);
                setRoster(null);
                setPreview(null);
                setReconciliation(null);
                setActivityMapping(null);
                setSubmissionTracking(null);
              }}>
                {microsoftConnections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.displayName} · {connection.externalTenantId ?? "sem tenant"} · {connection.status}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.actionRow}>
            <Button
              variant="primary"
              type="button"
              disabled={!readiness?.delegatedOAuthConfigured}
              onClick={() => {
                setBusy("oauth");
                setError("");
                void startMicrosoftOAuth()
                  .then(({ authorizationUrl }) => window.location.assign(authorizationUrl))
                  .catch((cause) => {
                    setError(errorMessage(cause));
                    setBusy("");
                  });
              }}
              loading={busy === "oauth"}
            >
              Entrar com Microsoft 365
            </Button>
            <span>O tenant e a conta são identificados automaticamente após o login.</span>
          </div>
        </Card>

        <Card id="integration-classrooms" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>TURMAS</span><h3>Turmas disponíveis no Teams</h3></div>
            {discovery && <Badge>{discovery.count} encontrada(s)</Badge>}
          </div>
          <div className={styles.actionRow}>
            <Button variant="primary" onClick={() => void handleDiscover()} loading={busy === "discover"} disabled={!connectionId || selectedConnection?.status !== "ACTIVE"}>
              Buscar turmas do Teams
            </Button>
            <span>Somente leitura até você escolher o vínculo.</span>
          </div>

          {discovery && <div className={styles.classList}>
            {discovery.classes.length === 0 && <div className={styles.empty}>Nenhuma turma retornada.</div>}
            {discovery.classes.map((remote) => {
              const existing = linkByRemoteId.get(remote.id);
              const local = existing ? classrooms.find((item) => item.id === existing.classroomId) : undefined;
              return <div key={remote.id} className={styles.classRow}>
                <div className={styles.classIdentity}>
                  <strong>{remote.displayName}</strong>
                  <span>{remote.classCode || "sem código"} · {remote.id}</span>
                </div>
                {existing ? <div className={styles.linkedState}>
                  <Badge variant="success">Vinculada</Badge>
                  <span>{local?.name ?? existing.classroomId}</span>
                  <Button size="sm" onClick={() => void inspect(existing)} loading={busy === `inspect:${existing.id}`}>Ver roster</Button>
                </div> : <div className={styles.linkControls}>
                  <select
                    aria-label={`Turma Arena para ${remote.displayName}`}
                    value={localSelection[remote.id] ?? ""}
                    onChange={(event) => setLocalSelection((current) => ({ ...current, [remote.id]: event.target.value }))}
                  >
                    <option value="">Selecionar turma Arena...</option>
                    {classrooms.filter((item) => item.active).map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}{classroom.code ? ` · ${classroom.code}` : ""}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => void handleLink(remote.id)} loading={busy === `link:${remote.id}`} disabled={!localSelection[remote.id]}>
                    Vincular
                  </Button>
                </div>}
              </div>;
            })}
          </div>}
        </Card>

        <Card id="integration-linked-classrooms" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>TURMA ATIVA</span><h3>Turmas vinculadas</h3></div>
            <Badge>{links.length}</Badge>
          </div>
          {links.length === 0 ? <div className={styles.empty}>Ainda não há turma Arena vinculada ao Teams.</div> : <div className={styles.linkList}>
            {links.map((link) => {
              const local = classrooms.find((item) => item.id === link.classroomId);
              return <button
                key={link.id}
                type="button"
                className={`${styles.linkItem} ${inspectedLinkId === link.id ? styles.linkItemActive : ""}`}
                onClick={() => void inspect(link)}
              >
                <span><strong>{local?.name ?? "Turma Arena"}</strong><small>{link.externalClassroomId}</small></span>
                <span>{busy === `inspect:${link.id}` ? "Carregando..." : "Inspecionar →"}</span>
              </button>;
            })}
          </div>}
        </Card>

        <Card id="integration-students" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>ALUNOS</span><h3>Alunos da turma</h3></div>
            {roster && <Badge variant="success">{roster.studentCount} aluno(s)</Badge>}
          </div>
          {!roster || !preview ? <div className={styles.empty}>Selecione uma turma vinculada para consultar roster e matching.</div> : <>
            <div className={styles.metrics}>
              <Metric label="Membros" value={roster.memberCount} />
              <Metric label="Alunos" value={roster.studentCount} />
              <Metric label="Professores" value={roster.teacherCount} />
              <Metric label="Match seguro" value={preview.safeMatches + preview.alreadyLinked} />
              <Metric label="Novos" value={preview.newStudents} />
              <Metric label="Revisar" value={preview.reviewRequired + preview.ambiguous + preview.conflicts} />
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Microsoft</th><th>Identificador</th><th>Status</th><th>Aluno local</th><th>Motivo</th><th>Ação</th></tr></thead>
                <tbody>{preview.items.map((item) => (
                  <MatchRow
                    key={item.microsoftUserId}
                    item={item}
                    busy={busy === `apply:${item.microsoftUserId}`}
                    students={students}
                    explicitStudentId={explicitStudent[item.microsoftUserId] ?? ""}
                    onExplicitStudentChange={(studentId) => setExplicitStudent((current) => ({
                      ...current,
                      [item.microsoftUserId]: studentId,
                    }))}
                    onApply={() => void applyMatch(item)}
                  />
                ))}</tbody>
              </table>
            </div>
          </>}
        </Card>

        <Card id="integration-conflicts" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>PENDÊNCIAS</span><h3>Pendências de matrícula</h3></div>
            {reconciliation && (
              <Badge variant={reconciliation.remoteMissing || reconciliation.brokenLinks ? "warning" : "success"}>
                {reconciliation.remoteMissing + reconciliation.localInactive + reconciliation.brokenLinks} divergência(s)
              </Badge>
            )}
          </div>

          {!reconciliation ? (
            <div className={styles.empty}>Selecione uma turma vinculada para analisar divergências.</div>
          ) : (
            <>
              <div className={styles.metrics}>
                <Metric label="Em sincronia" value={reconciliation.inSync} />
                <Metric label="Ausentes no Teams" value={reconciliation.remoteMissing} />
                <Metric label="Inativos locais" value={reconciliation.localInactive} />
                <Metric label="Vínculos quebrados" value={reconciliation.brokenLinks} />
              </div>

              <div className={styles.reconciliationList}>
                {reconciliation.items
                  .filter((item) => item.status !== "IN_SYNC")
                  .map((item) => (
                    <div key={item.externalStudentLinkId} className={styles.reconciliationItem}>
                      <div>
                        <strong>{item.studentName ?? item.microsoftUserId}</strong>
                        <small>{item.reason}</small>
                      </div>
                      <div className={styles.linkedState}>
                        <Badge variant={item.status === "BROKEN_LINK" ? "danger" : "warning"}>
                          {item.status}
                        </Badge>
                        {(item.status === "REMOTE_MISSING" || item.status === "LOCAL_INACTIVE") && (
                          <Button
                            size="sm"
                            loading={busy === `reconcile:${item.externalStudentLinkId}`}
                            onClick={() => void applyReconciliation(item)}
                          >
                            {item.status === "REMOTE_MISSING"
                              ? "Desativar matrícula"
                              : "Reativar matrícula"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                {reconciliation.items.every((item) => item.status === "IN_SYNC") && (
                  <div className={styles.empty}>Todos os vínculos estão coerentes com o roster atual.</div>
                )}
              </div>
            </>
          )}
        </Card>

        <Card id="integration-activities" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>ATIVIDADES</span><h3>Atividades e tarefas</h3></div>
            {activityMapping && (
              <Badge variant="success">{activityMapping.mappings.length} vínculo(s)</Badge>
            )}
          </div>

          {!activityMapping ? (
            <div className={styles.empty}>Selecione uma turma vinculada para consultar as tarefas do Teams.</div>
          ) : (
            <div className={styles.classList}>
              {activityMapping.assignments.length === 0 && (
                <div className={styles.empty}>Nenhuma assignment encontrada no Microsoft Teams.</div>
              )}

              {activityMapping.assignments.map((assignment) => {
                const mapping = activityMapping.mappings.find(
                  (item) => item.microsoftAssignmentId === assignment.id,
                );
                const local = mapping
                  ? activityMapping.localActivities.find((item) => item.id === mapping.activityId)
                  : undefined;

                return (
                  <div key={assignment.id} className={styles.classRow}>
                    <div className={styles.classIdentity}>
                      <strong>{assignment.displayName}</strong>
                      <span>
                        {assignment.status || "sem status"}
                        {assignment.dueDateTime
                          ? ` · prazo ${new Date(assignment.dueDateTime).toLocaleDateString("pt-BR")}`
                          : " · sem prazo"}
                      </span>
                      {assignment.webUrl && (
                        <a href={assignment.webUrl} target="_blank" rel="noreferrer">
                          Abrir no Teams ↗
                        </a>
                      )}
                    </div>

                    {mapping ? (
                      <div className={styles.linkedState}>
                        <Badge variant="success">Vinculada</Badge>
                        <span>{local?.title ?? mapping.activityId}</span>
                        <Button
                          size="sm"
                          loading={busy === `submissions:${mapping.id}`}
                          onClick={() => void inspectSubmissions(mapping.id)}
                        >
                          Ver entregas
                        </Button>
                      </div>
                    ) : (
                      <div className={styles.linkControls}>
                        <select
                          value={activitySelection[assignment.id] ?? ""}
                          onChange={(event) => setActivitySelection((current) => ({
                            ...current,
                            [assignment.id]: event.target.value,
                          }))}
                        >
                          <option value="">Selecionar atividade Arena...</option>
                          {activityMapping.localActivities.map((activity) => (
                            <option key={activity.id} value={activity.id}>
                              {activity.title}{activity.topic ? ` · ${activity.topic}` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          disabled={!activitySelection[assignment.id]}
                          loading={busy === `map-assignment:${assignment.id}`}
                          onClick={() => void mapAssignment(assignment.id)}
                        >
                          Vincular atividade
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card id="integration-submissions" className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>ENTREGAS</span><h3>Entregas e avaliações</h3></div>
            {submissionTracking && (
              <Badge variant="success">
                {submissionTracking.delivered}/{submissionTracking.items.length} entregues
              </Badge>
            )}
          </div>

          {!submissionTracking ? (
            <div className={styles.empty}>
              Em uma atividade já vinculada, clique em “Ver entregas”.
            </div>
          ) : (
            <>
              <div>
                <strong>{submissionTracking.activityTitle}</strong>
                <p className={styles.mutedText}>
                  Status lidos diretamente da assignment vinculada no Microsoft Teams.
                </p>
              </div>

              <div className={styles.metrics}>
                <Metric label="Entregues" value={submissionTracking.delivered} />
                <Metric label="Pendentes" value={submissionTracking.pending} />
                <Metric label="Dispensados" value={submissionTracking.excused} />
                <Metric label="Não associados" value={submissionTracking.unmatched} />
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Teams</th>
                      <th>Situação</th>
                      <th>Data da entrega</th>
                      <th>Arena</th>
                      <th>Avaliação</th>
                      <th>Acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionTracking.items.map((item) => (
                      <tr key={item.microsoftSubmissionId}>
                        <td>{item.studentName ?? "Aluno não associado"}</td>
                        <td>{item.microsoftStatus ?? "—"}</td>
                        <td>
                          <Badge
                            variant={
                              item.deliveryStatus === "DELIVERED"
                                ? "success"
                                : item.deliveryStatus === "UNMATCHED"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {item.deliveryStatus === "DELIVERED"
                              ? "Entregue"
                              : item.deliveryStatus === "PENDING"
                                ? "Pendente"
                                : item.deliveryStatus === "EXCUSED"
                                  ? "Dispensado"
                                  : "Não associado"}
                          </Badge>
                        </td>
                        <td>
                          {item.submittedDateTime
                            ? new Date(item.submittedDateTime).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                        <td>
                          {item.localSubmissionId ? (
                            <Badge variant="success">Importada</Badge>
                          ) : item.deliveryStatus === "DELIVERED" && item.externalStudentLinkId ? (
                            <Button
                              size="sm"
                              loading={busy === `import-submission:${item.microsoftSubmissionId}`}
                              onClick={() => void importSubmission(item.microsoftSubmissionId)}
                            >
                              Importar entrega
                            </Button>
                          ) : (
                            <span className={styles.blockedAction}>—</span>
                          )}
                        </td>
                        <td>
                          {item.localSubmissionId ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busy === `outcomes:${item.microsoftSubmissionId}`}
                              onClick={() => void inspectOutcome(item.microsoftSubmissionId)}
                            >
                              Ver avaliação Teams
                            </Button>
                          ) : (
                            <span className={styles.blockedAction}>Importe primeiro</span>
                          )}
                        </td>
                        <td>
                          {item.webUrl ? (
                            <a href={item.webUrl} target="_blank" rel="noreferrer">
                              Abrir ↗
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {outcomePreview && (
                <div className={styles.outcomePreview}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.stepNumber}>09</span>
                      <h3>Avaliação no Microsoft Teams</h3>
                    </div>
                    <Badge variant={outcomePreview.empty ? "neutral" : "success"}>
                      Somente leitura
                    </Badge>
                  </div>

                  {outcomePreview.empty ? (
                    <div className={styles.empty}>
                      O Teams ainda não possui nota ou feedback para esta entrega.
                    </div>
                  ) : (
                    <>
                      <div className={styles.metrics}>
                        <Metric label="Nota atual Teams" value={outcomePreview.points ?? "—"} />
                        <Metric label="Nota publicada" value={outcomePreview.publishedPoints ?? "—"} />
                      </div>
                      <div className={styles.outcomeFeedbackGrid}>
                        <div>
                          <span>Feedback atual</span>
                          <p>{outcomePreview.feedback || "Sem feedback atual."}</p>
                        </div>
                        <div>
                          <span>Feedback publicado ao aluno</span>
                          <p>{outcomePreview.publishedFeedback || "Ainda não publicado."}</p>
                        </div>
                      </div>
                      <div className={styles.actionRow}>
                        <Button
                          size="sm"
                          disabled={!outcomePreview.feedback && !outcomePreview.publishedFeedback}
                          loading={busy === "apply-outcome:APPLY_FEEDBACK_DRAFT"}
                          onClick={() => void applyOutcome("APPLY_FEEDBACK_DRAFT")}
                        >
                          Copiar feedback para rascunho
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={outcomePreview.points == null && outcomePreview.publishedPoints == null}
                          loading={busy === "apply-outcome:APPLY_POINTS_SINGLE_CRITERION"}
                          onClick={() => void applyOutcome("APPLY_POINTS_SINGLE_CRITERION")}
                        >
                          Aplicar pontuação no Arena
                        </Button>
                      </div>
                      <p className={styles.mutedText}>
                        A aplicação é supervisionada. O feedback permanece em rascunho e a pontuação não conclui a correção.
                      </p>

                      <div className={styles.actionRow}>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy === "publish-outcome:PUSH_ASSESSMENT"}
                          onClick={() => void publishOutcome("PUSH_ASSESSMENT")}
                        >
                          Enviar avaliação ao Teams
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy === "publish-outcome:RETURN_TO_STUDENT"}
                          onClick={() => void publishOutcome("RETURN_TO_STUDENT")}
                        >
                          Devolver ao aluno no Teams
                        </Button>
                      </div>
                      <p className={styles.mutedText}>
                        Enviar atualiza nota/feedback no Teams. Devolver é uma ação separada que libera esses dados ao aluno.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}

function MatchRow({
  item,
  busy,
  students,
  explicitStudentId,
  onExplicitStudentChange,
  onApply,
}: {
  item: StudentMatchItem;
  busy: boolean;
  students: Student[];
  explicitStudentId: string;
  onExplicitStudentChange: (studentId: string) => void;
  onApply: () => void;
}) {
  const actionable =
    item.status === "SAFE_MATCH"
    || item.status === "REVIEW_REQUIRED"
    || item.status === "NEW_STUDENT"
    || (item.status === "AMBIGUOUS" && Boolean(explicitStudentId));

  const label =
    item.status === "NEW_STUDENT"
      ? "Criar e vincular"
      : item.status === "AMBIGUOUS"
        ? "Vincular selecionado"
        : item.status === "REVIEW_REQUIRED"
          ? "Confirmar vínculo"
          : "Aprovar vínculo";

  return <tr>
    <td><strong>{item.displayName}</strong><small>{item.userPrincipalName ?? "sem UPN"}</small></td>
    <td>{item.externalId ?? "—"}</td>
    <td><Badge variant={badgeVariant(item.status)}>{MATCH_LABEL[item.status]}</Badge></td>
    <td>{item.localStudentName ?? "—"}</td>
    <td>
      {item.reason}
      {item.status === "AMBIGUOUS" && (
        <select
          className={styles.inlineSelect}
          value={explicitStudentId}
          onChange={(event) => onExplicitStudentChange(event.target.value)}
        >
          <option value="">Selecionar aluno local...</option>
          {students.filter((student) => student.active).map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}{student.registration ? ` · ${student.registration}` : ""}
            </option>
          ))}
        </select>
      )}
    </td>
    <td>
      {actionable ? (
        <Button size="sm" loading={busy} onClick={onApply}>{label}</Button>
      ) : item.status === "ALREADY_LINKED" ? (
        <Badge variant="success">Concluído</Badge>
      ) : (
        <span className={styles.blockedAction}>Requer revisão</span>
      )}
    </td>
  </tr>;
}
