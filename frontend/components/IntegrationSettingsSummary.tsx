"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  fetchMicrosoftReadiness,
  type IntegrationConnection,
  type MicrosoftReadiness,
} from "@/lib/microsoft-integration-api";
import { fetchClassroomIntegrationState } from "@/lib/classroom-integrations";

export default function IntegrationSettingsSummary({
  onManage,
}: {
  onManage: () => void;
}) {
  const [readiness, setReadiness] = useState<MicrosoftReadiness | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchMicrosoftReadiness(),
      fetchClassroomIntegrationState(),
    ])
      .then(([ready, state]) => {
        if (!active) return;
        setReadiness(ready);
        setConnections(state.connections);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Falha ao consultar integrações.");
      });

    return () => {
      active = false;
    };
  }, []);

  const teams = useMemo(
    () => connections.filter((item) => item.provider === "MICROSOFT_TEAMS"),
    [connections],
  );
  const activeTeams = teams.find((item) => item.status === "ACTIVE");

  return (
    <div className="integration-settings-grid">
      <article className="integration-provider-card">
        <div className="integration-provider-head">
          <div className="integration-provider-icon">T</div>
          <div>
            <strong>Microsoft Teams</strong>
            <small>Turmas, alunos, atividades e entregas.</small>
          </div>
          <Badge
            variant={activeTeams ? "success" : readiness?.applicationCredentialsConfigured ? "warning" : "neutral"}
            dot={Boolean(activeTeams)}
          >
            {activeTeams
              ? "Conectado"
              : readiness?.applicationCredentialsConfigured
                ? "Pronto para conectar"
                : "Não configurado"}
          </Badge>
        </div>

        {activeTeams && (
          <div className="integration-provider-meta">
            <span>{activeTeams.displayName}</span>
            <small>{activeTeams.externalTenantId ?? "Tenant não informado"}</small>
          </div>
        )}

        {error && <small className="integration-provider-error">{error}</small>}

        <Button size="sm" onClick={onManage}>
          {activeTeams ? "Gerenciar integração" : "Configurar Teams"}
        </Button>
      </article>

      <article className="integration-provider-card integration-provider-card-muted">
        <div className="integration-provider-head">
          <div className="integration-provider-icon">G</div>
          <div>
            <strong>Google Classroom</strong>
            <small>Arquitetura preparada para novo provider.</small>
          </div>
          <Badge>Em breve</Badge>
        </div>
        <p className="integration-provider-note">
          A conexão será adicionada sem alterar o modelo principal de turmas do Arena.
        </p>
      </article>
    </div>
  );
}
