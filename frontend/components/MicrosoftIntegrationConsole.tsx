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
  linkMicrosoftAssignment,
  linkMicrosoftClass,
  type ClassroomLink,
  type IntegrationConnection,
  type MicrosoftClassDiscovery,
  type MicrosoftReadiness,
  type MicrosoftRoster,
  type MicrosoftActivityMapping,
  type MicrosoftSubmissionTracking,
  type RosterReconciliation,
  type RosterReconciliationItem,
  type StudentMatchItem,
  type StudentMatchPreview,
  type StudentMatchStatus,
} from "@/lib/microsoft-integration-api";
import styles from "./MicrosoftIntegrationConsole.module.css";

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
    fetchClassroomLinks(connectionId)
      .then((items) => active && setLinks(items))
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
          <span className={styles.eyebrow}>INTEGRAÇÕES</span>
          <h2>Microsoft Teams</h2>
          <p>Conecte o tenant, descubra turmas, associe-as ao Arena Dev e valide o roster antes de sincronizar alunos.</p>
        </div>
        <Button variant="ghost" onClick={onBack}>← Visão geral</Button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <div className={styles.steps}>
        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>01</span><h3>Prontidão Microsoft</h3></div>
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
            <div><span className={styles.stepNumber}>02</span><h3>Conexão do tenant</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>03</span><h3>Turmas do Teams</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>04</span><h3>Turmas vinculadas</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>05</span><h3>Roster e correspondência</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>06</span><h3>Reconciliação do roster</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>07</span><h3>Atividades e tarefas</h3></div>
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

        <Card className={styles.stepCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.stepNumber}>08</span><h3>Entregas individuais</h3></div>
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
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
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
