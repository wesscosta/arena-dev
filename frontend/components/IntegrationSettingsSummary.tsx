"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  fetchMicrosoftReadiness,
  fetchNotionReadiness,
  startMicrosoftOAuth,
  startNotionOAuth,
  disableIntegrationConnection,
  type IntegrationConnection,
  type MicrosoftReadiness,
  type NotionReadiness,
} from "@/lib/microsoft-integration-api";
import { fetchClassroomIntegrationState } from "@/lib/classroom-integrations";

export default function IntegrationSettingsSummary({
  onManage,
}: {
  onManage: () => void;
}) {
  const [readiness, setReadiness] = useState<MicrosoftReadiness | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [notionReadiness, setNotionReadiness] = useState<NotionReadiness | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchMicrosoftReadiness(),
      fetchClassroomIntegrationState(),
      fetchNotionReadiness(),
    ])
      .then(([ready, state, notionReady]) => {
        if (!active) return;
        setReadiness(ready);
        setConnections(state.connections);
        setNotionReadiness(notionReady);
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
  const activeNotion = connections.find((item) => item.provider === "NOTION" && item.status === "ACTIVE");
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
          <div className="integration-provider-icon">N</div>
          <div><strong>Notion</strong><small>Importe páginas e transforme sua hierarquia em jornadas.</small></div>
          <Badge variant={activeNotion ? "success" : notionReadiness?.delegatedOAuthConfigured ? "warning" : "neutral"} dot={Boolean(activeNotion)}>
            {activeNotion ? "Conectado" : notionReadiness?.delegatedOAuthConfigured ? "Pronto para conectar" : "Não configurado"}
          </Badge>
        </div>
        {activeNotion && <div className="integration-provider-meta"><span>{activeNotion.displayName}</span><small>Workspace autorizado</small></div>}
        <div className="integration-provider-actions">
          <Button size="sm" disabled={!activeNotion && !notionReadiness?.delegatedOAuthConfigured} onClick={() => {
            if (activeNotion) { void disableIntegrationConnection(activeNotion.id).then(() => setConnections((items) => items.map((item) => item.id === activeNotion.id ? {...item,status:"DISABLED"} : item))).catch((cause)=>setError(cause instanceof Error?cause.message:"Falha ao desconectar Notion.")); return; }
            void startNotionOAuth().then(({authorizationUrl})=>window.location.assign(authorizationUrl)).catch((cause)=>setError(cause instanceof Error?cause.message:"Falha ao iniciar conexão com Notion."));
          }}>{activeNotion ? "Desconectar" : "Conectar Notion"}</Button>
        </div>
      </article>

      <article className="integration-provider-card integration-provider-card-muted">
        <div className="integration-provider-head">
          <div className="integration-provider-icon">G</div>
          <div>
            <strong>Google Classroom</strong>
            <small>Provider mantido em standby para uma etapa futura.</small>
          </div>
          <Badge>Standby</Badge>
        </div>
        <p className="integration-provider-note">
          O foco operacional desta versão permanece no Microsoft Teams.
        </p>
      </article>
    </div>
  );
}
