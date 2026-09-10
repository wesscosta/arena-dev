"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import {
  fetchSessionEvents,
  type SessionEvent,
  type SessionEventType,
} from "@/lib/session-event-api";
import styles from "./SessionTimeline.module.css";

const CATEGORY_LABEL: Record<string, string> = {
  session: "Sessão",
  flow: "Condução",
  dynamic: "Dinâmica",
  time: "Tempo",
  organization: "Organização",
};
const ACTOR_LABEL: Record<SessionEvent["actor"], string> = {
  TEACHER: "Professor",
  SYSTEM: "Sistema",
};

function categoryOf(type: SessionEventType) {
  if (type.startsWith("SESSION_")) return "session";
  if (type.startsWith("FLOW_") || type.startsWith("ARENA_")) return "flow";
  if (type.startsWith("TIMER_")) return "time";
  if (type === "GROUPS_ORGANIZED") return "organization";
  return "dynamic";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SessionTimeline({ classroomId }: { classroomId: string }) {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setEvents(await fetchSessionEvents(classroomId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a linha do tempo.");
    } finally {
      setBusy(false);
    }
  }, [classroomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) => {
      const category = CATEGORY_LABEL[categoryOf(event.eventType)];
      return `${event.summary} ${event.sessionTitle} ${category} ${event.eventType}`
        .toLowerCase()
        .includes(needle);
    });
  }, [events, query]);

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar evento, sessão ou dinâmica..."
          aria-label="Buscar na linha do tempo da aula"
        />
        <Button variant="secondary" size="sm" loading={busy} loadingLabel="Atualizando..." onClick={() => { void load(); }}>
          Atualizar
        </Button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {!error && !busy && filtered.length === 0 && (
        <div className={styles.empty}>Nenhum evento operacional encontrado para esta turma.</div>
      )}

      <div className={styles.timeline}>
        {filtered.map((event) => {
          const category = categoryOf(event.eventType);
          return (
            <article className={styles.row} key={event.id} data-event-type={event.eventType}>
              <span className={styles.marker} aria-hidden="true" />
              <div className={styles.content}>
                <strong>{event.summary}</strong>
                <div className={styles.meta}>
                  <span>{event.sessionTitle}</span>
                  <span>·</span>
                  <span>{ACTOR_LABEL[event.actor]}</span>
                  <span>·</span>
                  <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
                </div>
              </div>
              <span className={styles.tag}>{CATEGORY_LABEL[category]}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
