"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnchoredMarkdown } from "@/components/LibraryContentViews";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { fetchLiveStageState } from "@/lib/live-stage-api";
import {
  getMaterialPresentation, publishMaterial, withdrawMaterial, materialRequestId,
  type MaterialPublication,
} from "@/lib/material-presentation-api";
import {
  fetchContentLibrary, fetchLibraryResource, type LearningResource,
} from "@/lib/learning-resource-api";
import {
  fetchArenaContextMaterial, linkArenaContextMaterial, unlinkArenaContextMaterial,
  type ArenaContextMaterial,
} from "@/lib/arena-context-material-api";
import styles from "./ArenaContextualMaterial.module.css";
import { DialogCloseButton } from "@/components/ui";
import { ArenaGlyph } from "@/components/arena/live/ArenaLiveChrome";

type Props = { sessionId: string; notify: (message: string) => void };

/** Teacher-only placement. Does not publish material to student/projector or advance steps. */
export default function ArenaContextualMaterial({ sessionId, notify }: Props) {
  const [placement, setPlacement] = useState<ArenaContextMaterial | null>(null);
  const [presentation, setPresentation] = useState<MaterialPublication | null>(null);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selected, setSelected] = useState<LearningResource | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const headingId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    let active = true;
    setPlacement(null);
    setPresentation(null);
    setSelected(null);
    setOpen(false);
    void fetchArenaContextMaterial(sessionId)
      .then((value) => { if (active) setPlacement(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao buscar material."); });
    void getMaterialPresentation(sessionId)
      .then((value) => { if (active) setPresentation(value); })
      .catch(() => { if (active) setPresentation(null); });
    return () => { active = false; };
  }, [sessionId]);

  useEffect(() => {
    const onMaterialUpdated = (event: Event) => {
      if ((event as CustomEvent<{ sessionId: string }>).detail?.sessionId !== sessionId) return;
      void fetchArenaContextMaterial(sessionId)
        .then(setPlacement)
        .catch(() => setError("Não foi possível atualizar o vínculo do material."));
    };
    window.addEventListener("arena-context-material-updated", onMaterialUpdated);
    return () => window.removeEventListener("arena-context-material-updated", onMaterialUpdated);
  }, [sessionId]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getMaterialPresentation(sessionId)
      .then((value) => { if (active) setPresentation(value); })
      .catch(() => { if (active) setPresentation(null); });
    return () => { active = false; };
  }, [open, sessionId]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    void fetchContentLibrary({ sort: "TITLE_ASC" })
      .then((rows) => { if (active) setResources(rows.filter((row) => row.libraryVisible && !row.archivedAt)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Biblioteca indisponível."); })
      .finally(() => { if (active) setLoading(false); });
    if (placement?.available) {
      void fetchLibraryResource(placement.resourceId)
        .then((resource) => { if (active) setSelected(resource); })
        .catch(() => { if (active) setSelected(null); });
    }
    return () => { active = false; };
  }, [open, sessionId, placement?.resourceId, placement?.available]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button");
    first?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]),select:not([disabled]),input:not([disabled]),a[href],textarea:not([disabled])',
      )].filter((element) => element.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault(); controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault(); controls[0].focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const trigger = triggerRef.current;
      const mobileMenu = document.querySelector<HTMLButtonElement>('.arena-nav-menu-trigger');
      const visibleTrigger = trigger && trigger.getClientRects().length > 0 ? trigger : null;
      (visibleTrigger ?? (mobileMenu && mobileMenu.getClientRects().length > 0 ? mobileMenu : null) ?? previousFocus)?.focus();
    };
  }, [open]);

  async function attach(resourceId: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const saved = await linkArenaContextMaterial(sessionId, resourceId);
      if (placement?.resourceId !== resourceId) setPresentation(null);
      setPlacement(saved);
      const resource = resources.find((item) => item.id === resourceId);
      if (resource) setSelected(resource);
      notify("Material vinculado a esta sessão. O palco e o roteiro permanecem inalterados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao vincular material.");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await unlinkArenaContextMaterial(sessionId);
      setPlacement(null); setSelected(null); setPresentation(null);
      notify("Vínculo removido. O material original permanece na Biblioteca e na Jornada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao desvincular material.");
    } finally { setBusy(false); }
  }

  async function present() {
    if (busy || !placement?.available || !selected || placement.resourceId !== selected.id
        || selected.format === "LINK" || !selected.body?.trim()) return;
    setBusy(true); setError(null);
    try {
      const stage = await fetchLiveStageState(sessionId);
      const result = await publishMaterial(sessionId, selected.id, stage.stageVersion ?? 0, materialRequestId());
      setPresentation(result);
      notify("Material publicado no palco. O projetor conectado receberá a leitura da aula.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível apresentar o material.");
      void getMaterialPresentation(sessionId).then(setPresentation).catch(() => setPresentation(null));
    } finally { setBusy(false); }
  }

  async function withdraw() {
    if (busy || !presentation || presentation.status !== "ACTIVE") return;
    setBusy(true); setError(null);
    try {
      const stage = await fetchLiveStageState(sessionId);
      await withdrawMaterial(sessionId, presentation.id, stage.stageVersion ?? 0, materialRequestId());
      setPresentation(null);
      notify("Material retirado do projetor. A fonte permanece vinculada à sessão.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível retirar o material.");
      void getMaterialPresentation(sessionId).then(setPresentation).catch(() => setPresentation(null));
    } finally { setBusy(false); }
  }

  const isPresented = presentation?.status === "ACTIVE"
    && presentation.resourceId === placement?.resourceId;
  const hasNewRevision = Boolean(isPresented && selected && presentation
    && selected.revision > presentation.resourceRevision);

  const visible = resources.filter((item) =>
    `${item.title} ${item.subject ?? ""} ${item.tags.join(" ")}`
      .toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  const externalUrl = selected?.format === "LINK" && selected.sourceUrl
    && /^https:\/\/[^\s]+$/i.test(selected.sourceUrl) ? selected.sourceUrl : null;

  return (
    <>
      <div className={styles.strip}>
        <span className={styles.caption}>Material da aula</span>
        <strong className={styles.title}>{placement?.title ?? "Nenhum material vinculado"}</strong>
        {placement && !placement.available && <span className={styles.warning}>Indisponível no acervo</span>}
        <button type="button" ref={triggerRef} className={styles.action}
          title={placement?.title ?? "Selecionar material da Biblioteca"}
          aria-label={placement ? "Abrir material" : "Selecionar material"}
          onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
          <ArenaGlyph name="material" /> Material da aula{isPresented ? " · No palco" : ""}
        </button>
      </div>
      {open && typeof document !== "undefined" && createPortal(
        <div className={styles.backdrop}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} className={styles.dialog}>
            <header className={styles.header}>
              <div>
                <h2 id={headingId}>Biblioteca nesta aula</h2>
                <p>Vincule um material da Biblioteca. A apresentação no projetor só acontece quando você confirmar.</p>
              </div>
              <DialogCloseButton onClick={() => setOpen(false)} label="Fechar biblioteca" />
            </header>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.content}>
              <div className={styles.catalog}>
                <label htmlFor={`${headingId}-search`}>Encontrar material na Biblioteca</label>
                <input id={`${headingId}-search`} value={query} onChange={(event) => setQuery(event.target.value)}
                  placeholder="Título, assunto ou tag" />
                {loading ? <p role="status">Carregando materiais…</p> : (
                  <ul className={styles.list} aria-label="Materiais disponíveis">
                    {visible.map((item) => <li key={item.id}>
                      <button type="button" disabled={busy}
                        aria-pressed={placement?.resourceId === item.id}
                        onClick={() => { void attach(item.id); }}>
                        <strong>{item.title}</strong>
                        <span>{item.subject ?? "Sem assunto"} · revisão {item.revision}</span>
                      </button>
                    </li>)}
                    {!visible.length && <li>Nenhum material disponível para a busca.</li>}
                  </ul>
                )}
              </div>
              <div className={styles.preview}>
                {selected && placement?.available ? (
                  <>
                    <h3>{selected.title}</h3>
                    <div className={styles.presentationBar} role="group" aria-label="Apresentação do material">
                      <p className={styles.presentationStatus} role="status" aria-live="polite">
                        {isPresented ? `Publicado no palco · revisão ${presentation?.resourceRevision}`
                          : "Material vinculado · ainda não apresentado"}
                        {hasNewRevision ? " · Há uma revisão mais recente na Biblioteca" : ""}
                      </p>
                      <div className={styles.presentationActions}>
                        {isPresented ? (
                          <>
                            <button className={styles.withdrawAction} type="button"
                              disabled={busy} onClick={() => { void withdraw(); }}>
                              {busy ? "Processando…" : "Retirar do projetor"}
                            </button>
                            {hasNewRevision && (
                              <button type="button" className={styles.presentAction}
                                disabled={busy} onClick={() => { void present(); }}>
                                Publicar revisão atual
                              </button>
                            )}
                          </>
                        ) : (
                          <button type="button" className={styles.presentAction}
                            disabled={busy || selected.format === "LINK" || !selected.body?.trim()}
                            onClick={() => { void present(); }}>
                            {busy ? "Publicando…" : "Apresentar no projetor"}
                          </button>
                        )}
                      </div>
                      {selected.format === "LINK"
                        ? <p className={styles.explanation}>Links externos não são publicados. Use Markdown ou texto da Biblioteca.</p>
                        : <p className={styles.explanation}>A apresentação substituirá o palco atual. Não registra XP ou progresso de estudo.</p>}
                    </div>
                    {selected.summary && <p>{selected.summary}</p>}
                    <p className={styles.meta}>Origem: Biblioteca canônica · revisão {selected.revision}</p>
                    {selected.format === "LINK" ? (
                      externalUrl
                        ? <a href={externalUrl} target="_blank" rel="noopener noreferrer"
                            className={styles.action}>Abrir fonte externa (nova aba)</a>
                        : <p>O link não utiliza HTTPS válido. Corrija a fonte na Biblioteca.</p>
                    ) : selected.format === "MARKDOWN" ? (
                      <AnchoredMarkdown>{selected.body ?? ""}</AnchoredMarkdown>
                    ) : <p className={styles.plain}>{selected.body ?? ""}</p>}
                    <button type="button" className={styles.remove} disabled={busy} onClick={() => { void remove(); }}>
                      Desvincular desta aula
                    </button>
                  </>
                ) : <p>Selecione um material publicado. O acesso aqui é apenas do professor; não o publica automaticamente para estudantes ou projetor.</p>}
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
