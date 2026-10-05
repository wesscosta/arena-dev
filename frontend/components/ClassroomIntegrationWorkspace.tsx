"use client";

import { useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  fetchClassroomIntegrationSummary,
  type ClassroomIntegrationSummary,
} from "@/lib/classroom-integrations";
import styles from "@/components/ClassroomIntegrationWorkspace.module.css";

function providerLabel(provider?: string | null) {
  if (provider === "MICROSOFT_TEAMS") return "Microsoft Teams";
  if (provider === "GOOGLE_CLASSROOM") return "Google Classroom";
  return provider || "Plataforma externa";
}

export default function ClassroomIntegrationWorkspace({
  classroomId,
  studentCount,
  activityCount,
  onManage,
}: {
  classroomId: string;
  studentCount: number;
  activityCount: number;
  onManage: () => void;
}) {
  const [resolvedSummary, setResolvedSummary] = useState<{
    classroomId: string;
    summary: ClassroomIntegrationSummary | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    fetchClassroomIntegrationSummary(classroomId)
      .then((result) => {
        if (active) setResolvedSummary({ classroomId, summary: result });
      })
      .catch(() => {
        if (active) setResolvedSummary({ classroomId, summary: null });
      });

    return () => {
      active = false;
    };
  }, [classroomId]);

  const loading = resolvedSummary?.classroomId !== classroomId;
  const summary = loading ? null : resolvedSummary.summary;

  if (loading) {
    return (
      <section
        className={`${styles.workspace} ${styles.subtle}`}
        data-testid="classroom-integration-workspace"
      >
        <div>
          <span className="eyebrow">INTEGRAÇÕES</span>
          <strong>Verificando integração...</strong>
        </div>
      </section>
    );
  }

  const integration = summary?.integrations[0];

  if (!integration) {
    return (
      <section
        className={`${styles.workspace} ${styles.empty}`}
        data-testid="classroom-integration-workspace"
      >
        <div className={styles.copy}>
          <span className="eyebrow">INTEGRAÇÕES</span>
          <strong>Nenhuma plataforma conectada</strong>
          <small>Opcional — a turma funciona normalmente sem integração externa.</small>
        </div>
        <Button size="sm" variant="ghost" onClick={onManage}>
          Vincular plataforma
        </Button>
      </section>
    );
  }

  const studentCoverage = studentCount
    ? Math.round((integration.linkedStudents / studentCount) * 100)
    : 0;
  const activityCoverage = activityCount
    ? Math.round((integration.mappedActivities / activityCount) * 100)
    : 0;

  return (
    <section className={styles.workspace} data-testid="classroom-integration-workspace">
      <div className={styles.main}>
        <div className={styles.title}>
          <span className="eyebrow">INTEGRAÇÕES</span>
          <div>
            <Badge variant="success" dot>
              {providerLabel(integration.provider)}
            </Badge>
            <strong>Integração ativa nesta turma</strong>
          </div>
        </div>

        <div className={styles.kpis}>
          <div>
            <strong>
              {integration.linkedStudents}/{studentCount}
            </strong>
            <span>alunos vinculados</span>
            <small>{studentCoverage}% da turma</small>
          </div>
          <div>
            <strong>
              {integration.mappedActivities}/{activityCount}
            </strong>
            <span>atividades mapeadas</span>
            <small>{activityCoverage}% das atividades</small>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <small>
          {integration.connectionName}
          {integration.connectionStatus ? ` · ${integration.connectionStatus}` : ""}
        </small>
        <Button size="sm" variant="ghost" onClick={onManage}>
          Gerenciar integração
        </Button>
      </div>
    </section>
  );
}
