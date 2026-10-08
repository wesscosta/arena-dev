"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnchoredMarkdown } from "@/components/LibraryContentViews";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  fetchContentLibrary, fetchLibraryResource, type LearningResource,
} from "@/lib/learning-resource-api";
import {
  fetchArenaContextMaterial, linkArenaContextMaterial, unlinkArenaContextMaterial,
  type ArenaContextMaterial,
} from "@/lib/arena-context-material-api";
import styles from "./ArenaContextualMaterial.module.css";

type Props = { sessionId: string; notify: (message: string) => void };

/** Teacher-only placement. Does not publish material to student/projector or advance steps. */
export default function ArenaContextualMaterial({ sessionId, notify }: Props) {
  const [placement, setPlacement] = useState<ArenaContextMaterial | null>(null);
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
    setSelected(null);
    setOpen(false);
    void fetchArenaContextMaterial(sessionId)
      .then((value) => { if (active) setPlacement(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao buscar material."); });
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
      (triggerRef.current ?? previousFocus)?.focus();
    };
  }, [open]);

  async function attach(resourceId: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const saved = await linkArenaContextMaterial(sessionId, resourceId);
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
      setPlacement(null); setSelected(null);
      notify("Vínculo removido. O material original permanece na Biblioteca e na Jornada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao desvincular material.");
    } finally { setBusy(false); }
  }

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
          Material
        </button>
      </div>
      {open && (
        <div className={styles.backdrop}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} className={styles.dialog}>
            <header className={styles.header}>
              <div>
                <h2 id={headingId}>Biblioteca nesta aula</h2>
                <p>Use o mesmo material da Biblioteca e da Jornada, sem duplicar conteúdo nem alterar o palco.</p>
              </div>
              <button type="button" className={styles.close} onClick={() => setOpen(false)}
                aria-label="Fechar material e voltar à Arena">Fechar e voltar à Arena</button>
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
            <footer className={styles.footer}>
              <button type="button" className={styles.action} onClick={() => setOpen(false)}>Voltar à aula</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
