"use client";

import { useEffect, useState } from "react";
import StudentJoinFlow from "@/components/StudentJoinFlow";
import { fetchAllStudyLiveSessions, type LiveSessionSummary } from "@/lib/study-api";
import styles from "../study.module.css";

export default function LivePage() {
  const [sessions, setSessions] = useState<LiveSessionSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    void fetchAllStudyLiveSessions().then(setSessions).finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  if (selectedCode) return <>
    <button type="button" className={styles.liveBack} onClick={() => { setSelectedCode(""); refresh(); }}>← Voltar para aulas ao vivo</button>
    <div className={styles.embeddedJoin}><StudentJoinFlow embedded initialCode={selectedCode} /></div>
  </>;

  return <>
    <p className={styles.eyebrow}>Arena ao vivo</p>
    <h1 className={styles.title}>Entrar ao vivo</h1>
    <p className={styles.lead}>Participe das aulas e atividades conduzidas pelo professor. Sessões das suas turmas aparecem aqui automaticamente.</p>

    {!loading && sessions.length > 0 && <section className={styles.liveNow} aria-labelledby="live-now-title">
      <div className={styles.liveSectionHead}><div><span>ACONTECENDO AGORA</span><h2 id="live-now-title">{sessions.length === 1 ? "Sua aula está ao vivo" : "Aulas disponíveis agora"}</h2></div><button type="button" onClick={refresh}>Atualizar</button></div>
      <div className={styles.liveSessionList}>{sessions.map((session) =>
        <article className={styles.liveSessionCard} key={session.sessionId}>
          <div><span>{session.classroomName}</span><strong>{session.sessionTitle}</strong><small>Aula em andamento</small></div>
          <button type="button" onClick={() => setSelectedCode(session.joinCode)}>Entrar na aula</button>
        </article>
      )}</div>
    </section>}

    <section className={styles.liveManual}>
      {sessions.length > 0 && <div className={styles.liveDivider}><span>OU ENTRE COM CÓDIGO</span></div>}
      <div className={styles.embeddedJoin}><StudentJoinFlow embedded /></div>
    </section>
  </>;
}
