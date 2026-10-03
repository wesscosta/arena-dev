"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  bootstrapJourneyRedemption,
  fetchAllStudyJourneys,
  previewJourneyCode,
  redeemJourneyCode,
  StudyApiError,
  type JourneyRedemptionPreview,
  type MultiClassroomJourneySummary,
} from "@/lib/study-api";
import styles from "@/components/study/study.module.css";

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<MultiClassroomJourneySummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [classroom, setClassroom] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [preview, setPreview] = useState<JourneyRedemptionPreview | null>(null);
  const [identity, setIdentity] = useState("");

  async function refreshJourneys() {
    try {
      setJourneys(await fetchAllStudyJourneys());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refreshJourneys();
    const incoming = new URLSearchParams(window.location.search).get("redeem");
    if (incoming) {
      const normalized = incoming.toUpperCase();
      setRedeemCode(normalized);
      setRedeemOpen(true);
      window.history.replaceState(null, "", "/learn/journeys");
      void redeem(normalized);
    }
  }, []);

  const classrooms = useMemo(
    () => Array.from(new Map(journeys.map((journey) => [journey.classroomId, journey.classroomName || "Turma"]))).entries(),
    [journeys],
  );
  const filtered = journeys.filter((journey) =>
    (classroom === "ALL" || journey.classroomId === classroom)
    && (status === "ALL"
      || (status === "DONE"
        ? journey.progress.percent === 100
        : status === "ACTIVE"
          ? journey.progress.percent > 0 && journey.progress.percent < 100
          : journey.progress.percent === 0))
    && journey.title.toLowerCase().includes(query.toLowerCase()));
  const groups = Array.from(new Map(
    filtered.map((journey) => [
      journey.classroomId,
      {
        name: journey.classroomName || "Sua turma",
        items: filtered.filter((item) => item.classroomId === journey.classroomId),
      },
    ]),
  ).values());

  function resetRedemption() {
    setPreview(null);
    setIdentity("");
    setRedeemMessage("");
  }

  async function redeem(codeValue = redeemCode) {
    const code = codeValue.trim().toUpperCase();
    if (!code) return;
    setRedeeming(true);
    setRedeemMessage("");
    try {
      const result = await redeemJourneyCode(code);
      setRedeemMessage(result.alreadyAdded
        ? "Esta Jornada já faz parte do seu espaço de estudo."
        : result.title + " foi adicionada às suas Jornadas.");
      setRedeemCode("");
      setPreview(null);
      await refreshJourneys();
    } catch (error) {
      if (error instanceof StudyApiError && error.status === 401) {
        try {
          const validated = await previewJourneyCode(code);
          setPreview(validated);
          setRedeemMessage("");
        } catch (previewError) {
          setRedeemMessage(previewError instanceof Error ? previewError.message : "Não foi possível validar o código da Jornada.");
        }
      } else {
        setRedeemMessage(error instanceof Error ? error.message : "Não foi possível adicionar a Jornada.");
      }
    } finally {
      setRedeeming(false);
    }
  }

  async function bootstrap(event: React.FormEvent) {
    event.preventDefault();
    if (!identity.trim() || !redeemCode.trim()) return;
    setRedeeming(true);
    setRedeemMessage("");
    try {
      const result = await bootstrapJourneyRedemption(redeemCode, identity);
      setRedeemMessage(result.redemption.alreadyAdded
        ? "Esta Jornada já faz parte do seu espaço de estudo."
        : result.redemption.title + " foi adicionada às suas Jornadas.");
      setRedeemCode("");
      setPreview(null);
      setIdentity("");
      await refreshJourneys();
    } catch (error) {
      setRedeemMessage(error instanceof Error ? error.message : "Não foi possível identificar o aluno.");
    } finally {
      setRedeeming(false);
    }
  }

  return <>
    <p className={styles.eyebrow}>Jornadas</p>
    <h1 className={styles.title}>Seus percursos de estudo</h1>
    <div className={styles.journeyHeading}>
      <p className={styles.lead}>Encontre conteúdos das suas turmas e materiais adicionados ao seu perfil.</p>
      <button type="button" className={styles.redeemButton} onClick={() => {
        setRedeemOpen((value) => !value);
        resetRedemption();
      }}>+ Adicionar com código</button>
    </div>

    {redeemOpen && !preview && <form className={styles.redeemPanel} onSubmit={(event) => {
      event.preventDefault();
      void redeem();
    }}>
      <div>
        <strong>Adicionar Jornada</strong>
        <span>Digite o código J-... compartilhado pelo professor. No primeiro acesso, identificaremos você na turma.</span>
      </div>
      <div className={styles.redeemControls}>
        <input
          aria-label="Código da Jornada"
          placeholder="J-ABC123"
          value={redeemCode}
          onChange={(event) => {
            setRedeemCode(event.target.value.toUpperCase());
            setRedeemMessage("");
          }}
        />
        <button type="submit" disabled={redeeming || !redeemCode.trim()}>
          {redeeming ? "Validando…" : "Continuar"}
        </button>
      </div>
      {redeemMessage && <p>{redeemMessage}</p>}
    </form>}

    {redeemOpen && preview && <form className={styles.redeemPanel} onSubmit={(event) => void bootstrap(event)}>
      <div>
        <strong>{preview.title}</strong>
        <span>{preview.classroomName} · informe sua matrícula ou nome completo para vincular esta Jornada ao seu perfil.</span>
      </div>
      <div className={styles.redeemControls}>
        <input
          aria-label="Matrícula ou nome"
          placeholder="Matrícula ou nome completo"
          value={identity}
          onChange={(event) => setIdentity(event.target.value)}
          autoFocus
        />
        <button type="submit" disabled={redeeming || !identity.trim()}>
          {redeeming ? "Entrando…" : "Adicionar ao meu perfil"}
        </button>
      </div>
      <button type="button" className={styles.liveBack} onClick={() => {
        setPreview(null);
        setIdentity("");
        setRedeemMessage("");
      }}>← trocar código</button>
      {redeemMessage && <p>{redeemMessage}</p>}
    </form>}

    <div className={styles.libraryFilters}>
      <input aria-label="Buscar jornadas" placeholder="Buscar jornadas..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Filtrar por turma" value={classroom} onChange={(event) => setClassroom(event.target.value)}>
        <option value="ALL">Todas as turmas</option>
        {classrooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="ALL">Todos os estados</option>
        <option value="NEW">Não iniciadas</option>
        <option value="ACTIVE">Em andamento</option>
        <option value="DONE">Concluídas</option>
      </select>
    </div>

    {state === "loading" && <div className={styles.empty}>Carregando jornadas…</div>}
    {state === "error" && <div className={styles.error}>
      Este dispositivo ainda não possui um perfil de estudo. Use “Adicionar com código” ou <Link href="/learn/live">entre em uma aula ao vivo</Link>.
    </div>}
    {state === "ready" && groups.map((group) => <section className={styles.journeyGroup} key={group.items[0].classroomId}>
      <div className={styles.sectionHead}><div><span className={styles.groupLabel}>TURMA</span><h2>{group.name}</h2></div></div>
      <div className={styles.list}>{group.items.map((journey) => <Link key={`${journey.classroomId}:${journey.id}`} href={`/learn/journeys/${journey.id}`} className={styles.card}>
        <div><h3>{journey.title}</h3><p>{journey.progress.percent === 100
          ? "Jornada concluída"
          : journey.currentContentTitle
            ? `${journey.started ? "Continuar" : "Começar"}: ${journey.currentContentTitle}`
            : journey.description || "Percurso de estudo"}</p></div>
        <span className={styles.percent}>{journey.progress.percent}%</span>
      </Link>)}</div>
    </section>)}
    {state === "ready" && !filtered.length && <div className={styles.empty}>Nenhuma jornada corresponde aos filtros atuais.</div>}
  </>;
}
