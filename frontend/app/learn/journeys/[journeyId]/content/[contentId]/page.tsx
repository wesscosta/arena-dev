"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import JourneyContentReader from "@/components/study/JourneyContentReader";
import { completeStudyContent, fetchStudyContent, fetchStudyJourney, startStudyContent, studyDeviceClaims, type JourneyContentDetailView, type JourneyStudyView } from "@/lib/study-api";
import styles from "../../../../study.module.css";

type ReaderData = { token: string; journey: JourneyStudyView; content: JourneyContentDetailView };

export default function ContentReaderPage() {
  const { journeyId, contentId } = useParams<{ journeyId: string; contentId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ReaderData | null>(null);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => { let active = true; (async () => {
    for (const claim of studyDeviceClaims()) {
      try {
        const [journey, content] = await Promise.all([fetchStudyJourney(journeyId, claim.token), fetchStudyContent(journeyId, contentId, claim.token)]);
        if (content.state === "CURRENT") await startStudyContent(journeyId, contentId, claim.token);
        if (active) setData({ token: claim.token, journey, content });
        return;
      } catch {}
    }
    if (active) setError("Não foi possível abrir este conteúdo. Ele pode estar bloqueado ou sua identificação de estudo pode ter expirado.");
  })(); return () => { active = false; }; }, [journeyId, contentId]);

  const navigation = useMemo(() => {
    if (!data) return { previous: null, next: null, position: 0, total: 0, moduleTitle: "Jornada" };
    const flat = data.journey.modules.flatMap(module => module.contents.map(content => ({ ...content, moduleTitle: module.title })));
    const index = flat.findIndex(content => content.id === contentId);
    return { previous: index > 0 ? flat[index - 1] : null, next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null, position: index + 1, total: flat.length, moduleTitle: flat[index]?.moduleTitle || "Jornada" };
  }, [data, contentId]);

  async function conclude() {
    if (!data || completing) return;
    setCompleting(true);
    try {
      const updated = await completeStudyContent(journeyId, contentId, data.token);
      const flat = updated.modules.flatMap(module => module.contents);
      const next = flat.find(content => content.state === "CURRENT");
      router.push(next ? `/learn/journeys/${journeyId}/content/${next.id}` : `/learn/journeys/${journeyId}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível concluir o conteúdo."); setCompleting(false); }
  }

  if (error && !data) return <div className={styles.error}>{error}<div className={styles.readerErrorAction}><Link href={`/learn/journeys/${journeyId}`}>Voltar à jornada</Link></div></div>;
  if (!data) return <div className={styles.empty}>Carregando conteúdo…</div>;

  return <div className={styles.readerView}>
    <header className={styles.readerTopbar}><Link href={`/learn/journeys/${journeyId}`}>← {navigation.moduleTitle}</Link><span>{navigation.position} / {navigation.total}</span></header>
    <div className={styles.readerHeading}><p className={styles.eyebrow}>Conteúdo de estudo</p><h1>{data.content.title}</h1>{data.content.description && <p>{data.content.description}</p>}</div>
    <JourneyContentReader content={data.content} />
    {error && <div className={styles.error}>{error}</div>}
    <footer className={styles.readerFooter}>
      <div>{navigation.previous && navigation.previous.state !== "LOCKED" ? <Link href={`/learn/journeys/${journeyId}/content/${navigation.previous.id}`}><span>Anterior</span><strong>← {navigation.previous.title}</strong></Link> : <span />}</div>
      <div>{data.content.state === "COMPLETED" ? (navigation.next && navigation.next.state !== "LOCKED" ? <Link className={styles.readerPrimary} href={`/learn/journeys/${journeyId}/content/${navigation.next.id}`}>Próximo conteúdo →</Link> : <Link className={styles.readerPrimary} href={`/learn/journeys/${journeyId}`}>Voltar à jornada</Link>) : <button type="button" className={styles.readerPrimary} disabled={completing} onClick={conclude}>{completing ? "Concluindo…" : navigation.next ? "Concluir e continuar →" : "Concluir conteúdo"}</button>}</div>
    </footer>
  </div>;
}
