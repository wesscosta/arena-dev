"use client";

import Link from "next/link";
import StudentAccessibilityControls from "@/components/student/StudentAccessibilityControls";
import { useEffect, useState, type FormEvent } from "react";
import { fetchAllStudentProfiles, updateStudentProfile, type StudentProfileEntry } from "@/lib/study-api";
import styles from "@/components/study/study.module.css";
import { revokeRememberedDevice } from "@/lib/realtime-api";
import { clearStudentDeviceAccess } from "@/lib/student-session";

function ProfileForm({ profile, onSaved, onForgot }: { profile: StudentProfileEntry; onSaved: (next: StudentProfileEntry) => void; onForgot: (classroomId: string, studentId: string) => void }) {
  const [name, setName] = useState(profile.namePending ? "" : profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [saving, setSaving] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const dirty = (profile.namePending && name.trim() !== "") || (!profile.emailSetByTeacher && email.trim() !== (profile.email ?? ""));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = await updateStudentProfile(profile.studyToken, {
        name: profile.namePending ? name : undefined,
        email: profile.emailSetByTeacher ? undefined : email,
      });
      onSaved({ ...next, studyToken: profile.studyToken, classroomId: profile.classroomId });
      setMessage({ kind: "ok", text: "Cadastro atualizado." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function forgetDevice() {
    if (forgetting || !window.confirm("Esquecer este cadastro neste dispositivo? Será necessário identificar-se novamente para acessar a turma.")) return;
    setForgetting(true);
    setMessage(null);
    try {
      await revokeRememberedDevice(profile.studyToken);
      clearStudentDeviceAccess(profile.classroomId, profile.studentId, profile.studyToken);
      onForgot(profile.classroomId, profile.studentId);
    } catch (cause) {
      setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "Não foi possível revogar este dispositivo. Tente novamente conectado." });
    } finally { setForgetting(false); }
  }

  return <form className={styles.profileCard} onSubmit={save}>
    <p className={styles.profileContext}>{profile.classroomName}{profile.registration ? ` · Matrícula ${profile.registration}` : ""}</p>
    {profile.namePending ? <label className={styles.profileField}>
      <span>Nome completo</span>
      <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Como está na sua matrícula" required />
      <small>Seu professor cadastrou você pelo e-mail. Informe seu nome para completar o cadastro.</small>
    </label> : <div className={styles.profileField}>
      <span>Nome completo</span>
      <strong>{profile.name}</strong>
      {profile.preferredName && <small>Na turma você aparece como {profile.preferredName}.</small>}
    </div>}
    {profile.emailSetByTeacher ? <div className={styles.profileField}>
      <span>E-mail</span>
      <strong>{profile.email}</strong>
      <small>Cadastrado pelo professor. Para alterar, fale com ele.</small>
    </div> : <label className={styles.profileField}>
      <span>E-mail <em>opcional</em></span>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="seu.nome@exemplo.com" />
      <small>Você poderá usar o e-mail para entrar nas aulas, no lugar do nome.</small>
    </label>}
    {message && <p className={message.kind === "ok" ? styles.profileOk : styles.profileError} role="status">{message.text}</p>}
    {(profile.namePending || !profile.emailSetByTeacher) && <button className={styles.button} disabled={saving || !dirty}>{saving ? "Salvando…" : "Salvar"}</button>}
    <button type="button" className={styles.forgetDevice} disabled={saving || forgetting} onClick={() => void forgetDevice()}>{forgetting ? "Revogando dispositivo…" : "Esquecer este dispositivo"}</button>
  </form>;
}

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<StudentProfileEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAllStudentProfiles().then((loaded) => { if (active) setProfiles(loaded); });
    return () => { active = false; };
  }, []);

  return <>
    <p className={styles.eyebrow}>Minha conta</p>
    <h1 className={styles.title}>Configurações</h1>
    <p className={styles.lead}>Ajuste sua experiência de estudo e gerencie seus dados e dispositivos em um só lugar.</p>
    <section className={styles.profilePreferences} aria-labelledby="study-preferences-heading">
      <h2 id="study-preferences-heading">Aparência e acessibilidade</h2>
      <p>Tamanho do conteúdo, tema e movimento. O tamanho ajusta os materiais e a área de estudo, sem ampliar o menu de navegação.</p>
      <StudentAccessibilityControls />
    </section>
    <h2 className={styles.profileSectionHeading}>Cadastro e dispositivos</h2>
    {!profiles && <div className={`${styles.empty} ${styles.skeleton}`}>Carregando seu cadastro…</div>}
    {profiles && profiles.length === 0 && <div className={styles.empty}><strong>Nenhum cadastro lembrado neste dispositivo.</strong><p>Entre em uma aula com a opção “Lembrar neste dispositivo” marcada. <Link href="/join">Entrar em uma aula</Link></p></div>}
    {profiles?.map((profile) => <ProfileForm
      key={profile.classroomId + ":" + profile.studentId}
      profile={profile}
      onSaved={(next) => setProfiles((current) => current?.map((item) => item.classroomId === next.classroomId && item.studentId === next.studentId ? next : item) ?? null)}
      onForgot={(classroomId, studentId) => setProfiles((current) => current?.filter((item) => item.classroomId !== classroomId || item.studentId !== studentId) ?? null)}
    />)}
  </>;
}
