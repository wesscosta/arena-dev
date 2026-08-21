"use client";

import { FormEvent, useState } from "react";
import { loginTeacher, type TeacherSession } from "@/lib/auth-api";

export default function TeacherLogin({ onAuthenticated }: { onAuthenticated: (session: TeacherSession) => void }) {
  const [username, setUsername] = useState("professor");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      onAuthenticated(await loginTeacher(username.trim(), password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível autenticar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="teacher-login-shell">
      <section className="teacher-login-card">
        <div className="brand-mark teacher-login-mark">A</div>
        <span className="eyebrow accent">ARENA DEV</span>
        <h1>Acesso do professor</h1>
        <p>Entre para administrar turmas, sessões, pontuação e mecânicas.</p>
        <form onSubmit={submit} className="teacher-login-form">
          <label>Usuário<input className="input" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label>Senha<input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /></label>
          {error && <div className="api-alert teacher-login-error"><strong>Acesso negado.</strong><span>{error}</span></div>}
          <button className="button primary large" type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
        </form>
        <small className="teacher-login-note">As credenciais do MVP são definidas no arquivo <code>.env</code>.</small>
      </section>
    </main>
  );
}
