"use client";

import { useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  fetchClassroomIntegrationSummary,
  type ClassroomIntegrationSummary,
} from "@/lib/classroom-integrations";

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
  const [summary, setSummary] = useState<ClassroomIntegrationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchClassroomIntegrationSummary(classroomId)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch(() => {
        if (active) setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classroomId]);

  if (loading) {
    return (
      <section className="classroom-integration-workspace subtle">
        <div>
          <span className="eyebrow">PLATAFORMA EDUCACIONAL</span>
          <strong>Verificando integração...</strong>
        </div>
      </section>
    );
  }

  const integration = summary?.integrations[0];

  if (!integration) {
    return (
      <section className="classroom-integration-workspace empty">
        <div className="classroom-integration-copy">
          <span className="eyebrow">PLATAFORMA EDUCACIONAL</span>
          <strong>Sem integração externa</strong>
          <small>
            Esta turma funciona normalmente no Arena. Você pode vinculá-la ao Teams ou a outra plataforma quando precisar.
          </small>
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
    <section className="classroom-integration-workspace">
      <div className="classroom-integration-main">
        <div className="classroom-integration-title">
          <span className="eyebrow">PLATAFORMA EDUCACIONAL</span>
          <div>
            <Badge variant="success" dot>
              {providerLabel(integration.provider)}
            </Badge>
            <strong>Integração ativa nesta turma</strong>
          </div>
        </div>

        <div className="classroom-integration-kpis">
          <div>
            <strong>{integration.linkedStudents}/{studentCount}</strong>
            <span>alunos vinculados</span>
            <small>{studentCoverage}% da turma</small>
          </div>
          <div>
            <strong>{integration.mappedActivities}/{activityCount}</strong>
            <span>atividades mapeadas</span>
            <small>{activityCoverage}% das atividades</small>
          </div>
        </div>
      </div>

      <div className="classroom-integration-actions">
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
