"use client";

import { joinQrImageUrl, type JoinCode } from "@/lib/realtime-api";
import { isLoopbackBaseUrl, sessionJoinUrl } from "@/lib/session-access";
import styles from "./SessionAccessCard.module.css";

type RealtimeStatus = "offline" | "connecting" | "online";

type Props = {
  sessionId: string;
  joinCode: JoinCode | null;
  publicBaseUrl: string;
  notify: (message: string) => void;
  realtimeStatus?: RealtimeStatus;
  connectedCount?: number;
  onRotate?: () => void | Promise<void>;
  rotateBusy?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function connectionLabel(status: RealtimeStatus, connectedCount?: number) {
  const state = status === "online"
    ? "Tempo real conectado"
    : status === "connecting"
      ? "Conectando..."
      : "Tempo real offline";

  return connectedCount === undefined
    ? state
    : `${state} · ${connectedCount} conectado(s)`;
}

export default function SessionAccessCard({
  sessionId,
  joinCode,
  publicBaseUrl,
  notify,
  realtimeStatus,
  connectedCount,
  onRotate,
  rotateBusy = false,
  compact = false,
  title = "Acesso dos alunos",
  subtitle = "O mesmo acesso permanece válido durante toda a sessão.",
}: Props) {
  const joinUrl = joinCode
    ? sessionJoinUrl(publicBaseUrl, joinCode.code)
    : "";

  async function copyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      notify("Link de entrada copiado.");
    } catch {
      notify("Não foi possível copiar o link automaticamente.");
    }
  }

  function openAsStudent() {
    if (!joinUrl) return;
    window.open(joinUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className={`${styles.card} ${compact ? styles.compact : ""}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ENTRADA NA SESSÃO</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        {realtimeStatus && (
          <span className={`${styles.connection} ${styles[realtimeStatus]}`}>
            <i />
            {connectionLabel(realtimeStatus, connectedCount)}
          </span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.details}>
          <div className={styles.codeRow}>
            <strong>{joinCode?.code ?? "------"}</strong>
            <span>
              {joinCode
                ? `Válido até ${dateTime(joinCode.expiresAt)}`
                : "Gerando código da sessão..."}
            </span>
          </div>

          <div className={styles.urlBlock}>
            <span>URL PARA OS ALUNOS</span>
            <code className={styles.url}>
              {joinUrl || "Aguardando código e endereço público..."}
            </code>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={!joinUrl}
              onClick={() => void copyLink()}
            >
              Copiar link
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={!joinUrl}
              onClick={openAsStudent}
            >
              Abrir como aluno ↗
            </button>
            {onRotate && (
              <button
                type="button"
                className={styles.ghost}
                disabled={rotateBusy}
                onClick={() => void onRotate()}
              >
                {rotateBusy ? "Gerando..." : "Gerar novo código"}
              </button>
            )}
          </div>
        </div>

        <div className={styles.qr}>
          {joinCode && publicBaseUrl ? (
            <img
              src={joinQrImageUrl(
                sessionId,
                publicBaseUrl,
                joinCode.code,
                compact ? 220 : 280,
              )}
              alt={`QR Code da sessão ${joinCode.code}`}
            />
          ) : (
            <div className={styles.placeholder}>QR</div>
          )}
          <small>Escaneie para abrir a participação da aula no /join.</small>
        </div>
      </div>

      {isLoopbackBaseUrl(publicBaseUrl) && (
        <div className={styles.warning}>
          <strong>URL não acessível pelo celular</strong>
          <span>
            O endereço atual usa localhost/loopback. Abra o Arena Dev pelo IP da
            máquina na rede local antes de exibir ou compartilhar este QR Code.
          </span>
        </div>
      )}
    </section>
  );
}
