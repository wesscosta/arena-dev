"use client";

import { useEffect, useState } from "react";
import {
  fetchTeacherPreferences,
  formatSessionTimeout,
  saveSessionTimeout,
  SESSION_TIMEOUT_OPTIONS,
  type TeacherPreferences,
} from "@/lib/teacher-preferences-api";

/** Lets the teacher choose how long an idle login lasts (applies now and on the next login). */
export default function TeacherSessionSettings() {
  const [preferences, setPreferences] = useState<TeacherPreferences | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTeacherPreferences()
      .then((value) => { if (active) setPreferences(value); })
      .catch((error: unknown) => {
        if (active) setStatus({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível carregar a duração da sessão." });
      });
    return () => { active = false; };
  }, []);

  async function choose(minutes: number) {
    setSaving(true);
    setStatus(null);
    try {
      setPreferences(await saveSessionTimeout(minutes));
      setStatus({ tone: "ok", text: `Duração salva: ${formatSessionTimeout(minutes)}. Já vale para este acesso.` });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível salvar a duração da sessão." });
    } finally {
      setSaving(false);
    }
  }

  const options = preferences && !SESSION_TIMEOUT_OPTIONS.includes(preferences.sessionTimeoutMinutes as (typeof SESSION_TIMEOUT_OPTIONS)[number])
    ? [...SESSION_TIMEOUT_OPTIONS, preferences.sessionTimeoutMinutes].sort((a, b) => a - b)
    : SESSION_TIMEOUT_OPTIONS;

  return (
    <div className="teacher-session-settings">
      <label className="field" htmlFor="teacher-session-timeout">
        <span>Encerrar o acesso depois de</span>
        <select
          id="teacher-session-timeout"
          className="select"
          value={preferences?.sessionTimeoutMinutes ?? ""}
          disabled={!preferences || saving}
          onChange={(event) => { void choose(Number(event.target.value)); }}
        >
          {!preferences && <option value="">Carregando…</option>}
          {options.map((minutes) => (
            <option key={minutes} value={minutes}>
              {formatSessionTimeout(minutes)} sem uso{preferences?.defaultSessionTimeoutMinutes === minutes ? " (padrão da instalação)" : ""}
            </option>
          ))}
        </select>
      </label>
      <small className="settings-theme-note">
        O tempo conta a partir da última ação. Use uma duração maior que a aula para não precisar entrar de novo no meio dela.
      </small>
      {status && (
        <p className={status.tone === "error" ? "api-alert" : "settings-theme-note"} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
    </div>
  );
}
