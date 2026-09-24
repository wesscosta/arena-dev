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
  presentCount?: number;
  onRotate?: () => void | Promise<void>;
  rotateBusy?: boolean;
  compact?: boolean;
  drawer?: boolean;
  title?: string;
  subtitle?: string;
};


function connectionLabel(
  status: RealtimeStatus,
  connectedCount?: number,
  presentCount?: number,
) {
  if (status === "connecting") return "Conectando...";
  if (status === "offline") return "Sessão offline";

  if (connectedCount !== undefined && presentCount !== undefined) {
    return `${connectedCount} online · ${presentCount} presentes`;
  }

  if (connectedCount !== undefined) {
    return `${connectedCount} aluno(s) online`;
  }

  return "Sessão online";
}

export default function SessionAccessCard({
  sessionId,
  joinCode,
  publicBaseUrl,
  notify,
  realtimeStatus,
  connectedCount,
  presentCount,
  onRotate,
  rotateBusy = false,
  compact = false,
  drawer = false,
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
    <section className={`${styles.card} ${compact ? styles.compact : ""} ${drawer ? styles.drawer : ""}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ENTRADA NA SESSÃO</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        {realtimeStatus && (
          <span className={`${styles.connection} ${styles[realtimeStatus]}`}>
            <i />
            {connectionLabel(realtimeStatus, connectedCount, presentCount)}
          </span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.details}>
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>CÓDIGO DA SESSÃO</span>
            <div className={styles.codeRow}>
              <strong>{joinCode?.code ?? "------"}</strong>
            </div>
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
                drawer ? 180 : compact ? 260 : 380,
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
          <strong>URL local — use o IP da máquina para acesso pelo celular.</strong>
        </div>
      )}
    </section>
  );
}
