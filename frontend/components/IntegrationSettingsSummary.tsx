"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  fetchMicrosoftReadiness,
  startMicrosoftOAuth,
  type IntegrationConnection,
  type MicrosoftReadiness,
} from "@/lib/microsoft-integration-api";
import { fetchClassroomIntegrationState } from "@/lib/classroom-integrations";
import { fetchGoogleReadiness, startGoogleOAuth, type GoogleReadiness } from "@/lib/google-integration-api";

export default function IntegrationSettingsSummary({
  onManage,
}: {
  onManage: () => void;
}) {
  const [readiness, setReadiness] = useState<MicrosoftReadiness | null>(null);
  const [googleReadiness, setGoogleReadiness] = useState<GoogleReadiness | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchMicrosoftReadiness(),
      fetchGoogleReadiness(),
      fetchClassroomIntegrationState(),
    ])
      .then(([ready, googleReady, state]) => {
        if (!active) return;
        setReadiness(ready);
        setGoogleReadiness(googleReady);
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
  const googleConnections = useMemo(
    () => connections.filter((item) => item.provider === "GOOGLE_CLASSROOM"),
    [connections],
  );
  const activeGoogle = googleConnections.find((item) => item.status === "ACTIVE");

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

        <Button
          size="sm"
          onClick={() => {
            if (activeTeams) {
              onManage();
              return;
            }
            void startMicrosoftOAuth()
              .then(({ authorizationUrl }) => window.location.assign(authorizationUrl))
              .catch((cause) => setError(
                cause instanceof Error ? cause.message : "Falha ao iniciar login Microsoft."
              ));
          }}
          disabled={!activeTeams && !readiness?.delegatedOAuthConfigured}
        >
          {activeTeams ? "Gerenciar integração" : "Entrar com Microsoft 365"}
        </Button>
      </article>

      <article className="integration-provider-card">
        <div className="integration-provider-head">
          <div className="integration-provider-icon">G</div>
          <div>
            <strong>Google Classroom</strong>
            <small>Turmas do Classroom conectadas ao mesmo modelo Arena.</small>
          </div>
          <Badge variant={activeGoogle ? "success" : googleReadiness?.delegatedOAuthConfigured ? "warning" : "neutral"} dot={Boolean(activeGoogle)}>
            {activeGoogle ? "Conectado" : googleReadiness?.delegatedOAuthConfigured ? "Pronto para conectar" : "Não configurado"}
          </Badge>
        </div>
        {activeGoogle && <div className="integration-provider-meta"><span>{activeGoogle.displayName}</span><small>OAuth Google ativo</small></div>}
        <Button
          size="sm"
          disabled={Boolean(activeGoogle) || !googleReadiness?.delegatedOAuthConfigured}
          onClick={() => void startGoogleOAuth()
            .then(({ authorizationUrl }) => window.location.assign(authorizationUrl))
            .catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao iniciar login Google."))}
        >
          {activeGoogle ? "Google conectado" : "Entrar com Google"}
        </Button>
      </article>
    </div>
  );
}
