"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  archiveLibraryResource,
  createLibraryResource,
  fetchContentLibrary,
  restoreLibraryResource,
  updateLibraryResource,
  type LearningResource,
} from "@/lib/learning-resource-api";
import { fetchJourneys, updateJourney, type Journey } from "@/lib/journey-api";
import type { Classroom } from "@/lib/types";
import styles from "./LibraryWorkspace.module.css";

type Props = { classrooms: Classroom[]; notify: (message: string) => void };
type Editor = { id?: string; title: string; summary: string; body: string };

const EMPTY: Editor = { title: "", summary: "", body: "" };

export default function LibraryWorkspace({ classrooms, notify }: Props) {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<LearningResource | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [journeys, setJourneys] = useState<Array<Journey & { classroomName: string }>>([]);
  const [targetJourneyId, setTargetJourneyId] = useState("");
  const [targetModule, setTargetModule] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

  async function load(nextQuery = query, nextArchived = archived) {
    setLoading(true);
    try {
      const rows = await fetchContentLibrary(nextQuery, nextArchived);
      setResources(rows);
      if (selected) setSelected(rows.find((row) => row.id === selected.id) ?? null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível carregar a Biblioteca.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(query, archived); }, 220);
    return () => window.clearTimeout(timer);
  }, [query, archived]);

  const targetJourney = useMemo(() => journeys.find((row) => row.id === targetJourneyId), [journeys, targetJourneyId]);
  const modules = useMemo(() => {
    if (!targetJourney) return [];
    return [...new Set(targetJourney.stages.map((stage) => stage.sectionTitle).filter((value): value is string => Boolean(value)))];
  }, [targetJourney]);

  async function saveEditor() {
    if (!editor?.title.trim() || !editor.body.trim() || busy) {
      if (editor && (!editor.title.trim() || !editor.body.trim())) notify("Informe título e conteúdo.");
      return;
    }
    setBusy(true);
    try {
      const input = { title: editor.title.trim(), summary: editor.summary.trim() || undefined, body: editor.body, format: "MARKDOWN" as const, sourceType: "MANUAL" as const };
      const saved = editor.id ? await updateLibraryResource(editor.id, input) : await createLibraryResource(input);
      setSelected(saved); setEditor(null);
      await load();
      notify(editor.id ? "Material atualizado. A nova revisão não altera Jornadas existentes." : "Material criado na Biblioteca.");
    } catch (error) { notify(error instanceof Error ? error.message : "Não foi possível salvar o material."); }
    finally { setBusy(false); }
  }

  async function archive(resource: LearningResource) {
    if (busy) return;
    setBusy(true);
    try { await archiveLibraryResource(resource.id); setSelected(null); await load(); notify("Material arquivado. Jornadas existentes foram preservadas."); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível arquivar."); }
    finally { setBusy(false); }
  }

  async function restore(resource: LearningResource) {
    if (busy) return;
    setBusy(true);
    try { await restoreLibraryResource(resource.id); setSelected(null); await load(); notify("Material restaurado na Biblioteca."); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível restaurar."); }
    finally { setBusy(false); }
  }

  async function openReuse() {
    if (!selected) return;
    setReuseOpen(true); setTargetJourneyId(""); setTargetModule("");
    try {
      const groups = await Promise.all(classrooms.map(async (classroom) => {
        const rows = await fetchJourneys(classroom.id);
        return rows.filter((row) => row.status === "DRAFT").map((row) => ({ ...row, classroomName: classroom.name }));
      }));
      setJourneys(groups.flat());
    } catch (error) { notify(error instanceof Error ? error.message : "Não foi possível carregar as Jornadas."); }
  }

  async function addToJourney() {
    if (!selected || !targetJourney || busy) return;
    setBusy(true);
    try {
      const sectionTitle = targetModule || targetJourney.stages.at(-1)?.sectionTitle || "Módulo 1";
      const saved = await updateJourney(targetJourney.id, {
        classroomId: targetJourney.classroomId,
        title: targetJourney.title,
        description: targetJourney.description ?? undefined,
        stages: [...targetJourney.stages.map((stage) => ({
          id: stage.id, title: stage.title, description: stage.description ?? undefined,
          unlockRule: stage.unlockRule, completionRule: stage.completionRule,
          sectionId: stage.sectionId ?? undefined, sectionTitle: stage.sectionTitle ?? undefined,
          itemType: stage.itemType, learningResourceId: stage.learningResourceId ?? undefined,
        })), {
          title: selected.title, description: selected.summary ?? undefined,
          unlockRule: targetJourney.stages.length === 0 ? "IMMEDIATE" as const : "PREVIOUS_STAGE_COMPLETED" as const,
          completionRule: "MANUAL" as const, sectionTitle, itemType: "CONTENT" as const,
          learningResourceId: selected.id,
        }],
      });
      setJourneys((current) => current.map((row) => row.id === saved.id ? { ...saved, classroomName: row.classroomName } : row));
      setReuseOpen(false);
      notify(`${selected.title} foi adicionado à Jornada como snapshot da revisão ${selected.revision}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Não foi possível adicionar à Jornada."); }
    finally { setBusy(false); }
  }

  if (editor) return <section className={styles.workspace}>
    <button className={styles.back} type="button" onClick={() => setEditor(null)}>← Biblioteca</button>
    <header className={styles.heading}><div><span>MATERIAL</span><h2>{editor.id ? "Editar material" : "Novo material"}</h2><p>Edite em Markdown e confira a apresentação antes de salvar. A Jornada mantém seus próprios snapshots.</p></div></header>
    <div className={styles.editor}>
      <div className={styles.editorMeta}>
        <label><span>Título</span><input value={editor.title} onChange={(e)=>setEditor({...editor,title:e.target.value})}/></label>
        <label><span>Descrição</span><input value={editor.summary} onChange={(e)=>setEditor({...editor,summary:e.target.value})}/></label>
      </div>
      <div className={styles.editorMode} role="group" aria-label="Modo do conteúdo">
        <button type="button" className={editorMode === "edit" ? styles.editorModeActive : ""} aria-pressed={editorMode === "edit"} onClick={()=>setEditorMode("edit")}>Editar</button>
        <button type="button" className={editorMode === "preview" ? styles.editorModeActive : ""} aria-pressed={editorMode === "preview"} onClick={()=>setEditorMode("preview")}>Preview</button>
      </div>
      <div className={styles.editorSplit}>
        <label className={`${styles.contentField} ${editorMode === "preview" ? styles.mobileHidden : ""}`}><span>Markdown</span><textarea value={editor.body} onChange={(e)=>setEditor({...editor,body:e.target.value})} spellCheck={false}/></label>
        <section className={`${styles.previewPane} ${editorMode === "edit" ? styles.mobileHiddenPreview : ""}`} aria-label="Preview do material">
          <span className={styles.previewLabel}>Preview</span>
          <div className={styles.previewScroll}>
            {editor.body.trim() ? <div className={styles.markdown}><ReactMarkdown remarkPlugins={[remarkGfm]}>{editor.body}</ReactMarkdown></div> : <p className={styles.previewEmpty}>O conteúdo formatado aparecerá aqui.</p>}
          </div>
        </section>
      </div>
      <div className={styles.editorActions}><button type="button" onClick={()=>setEditor(null)}>Cancelar</button><button className={styles.primary} type="button" disabled={busy} onClick={()=>void saveEditor()}>{busy?"Salvando...":"Salvar alterações"}</button></div>
    </div>
  </section>;

  if (selected) return <section className={styles.workspace}>
    <button className={styles.back} type="button" onClick={()=>setSelected(null)}>← Biblioteca</button>
    <header className={styles.detailHead}><div><span>MATERIAL</span><h2>{selected.title}</h2><p>{selected.summary || "Material reutilizável da sua Biblioteca."}</p><small>Revisão {selected.revision} · atualizado em {new Date(selected.updatedAt).toLocaleDateString("pt-BR")}</small></div>
      <div className={styles.actions}>{!archived && <><button type="button" onClick={()=>{setEditorMode("edit");setEditor({id:selected.id,title:selected.title,summary:selected.summary??"",body:selected.body??""});}}>Editar</button><button className={styles.primary} type="button" onClick={()=>void openReuse()}>Adicionar a uma Jornada</button><button type="button" onClick={()=>void archive(selected)}>Arquivar</button></>}{archived && <button className={styles.primary} type="button" onClick={()=>void restore(selected)}>Restaurar</button>}</div>
    </header>
    <article className={styles.reader}>
      {selected.body
        ? selected.format === "PLAIN_TEXT"
          ? <div className={styles.plainText}>{selected.body}</div>
          : <div className={styles.markdown}><ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.body}</ReactMarkdown></div>
        : <p>Este material ainda não possui conteúdo.</p>}
    </article>
    {reuseOpen && <div className={styles.modalBackdrop} role="presentation"><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="reuse-title"><div><span>REUTILIZAR MATERIAL</span><h3 id="reuse-title">Adicionar a uma Jornada</h3><p>Somente Jornadas em rascunho podem receber novos conteúdos.</p></div>
      <label><span>Jornada</span><select value={targetJourneyId} onChange={(e)=>{setTargetJourneyId(e.target.value);setTargetModule("");}}><option value="">Selecionar Jornada...</option>{classrooms.map((classroom)=><optgroup key={classroom.id} label={classroom.name}>{journeys.filter((j)=>j.classroomId===classroom.id).map((j)=><option key={j.id} value={j.id}>{j.title}</option>)}</optgroup>)}</select></label>
      {targetJourney && <label><span>Módulo</span><select value={targetModule} onChange={(e)=>setTargetModule(e.target.value)}><option value="">Adicionar ao módulo final</option>{modules.map((module)=><option key={module} value={module}>{module}</option>)}</select></label>}
      <div className={styles.editorActions}><button type="button" onClick={()=>setReuseOpen(false)}>Cancelar</button><button className={styles.primary} type="button" disabled={!targetJourneyId||busy} onClick={()=>void addToJourney()}>Adicionar snapshot</button></div>
    </section></div>}
  </section>;

  return <section className={styles.workspace}>
    <header className={styles.heading}><div><span>BIBLIOTECA</span><h2>Seus materiais</h2><p>Crie, encontre e reutilize materiais em diferentes Jornadas.</p></div><button className={styles.primary} type="button" onClick={()=>{setEditorMode("edit");setEditor(EMPTY);}}>+ Novo material</button></header>
    <div className={styles.toolbar}><label className={styles.search}><span className="sr-only">Buscar materiais</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar materiais..."/></label><div className={styles.tabs}><button className={!archived?styles.activeTab:""} type="button" onClick={()=>setArchived(false)}>Ativos</button><button className={archived?styles.activeTab:""} type="button" onClick={()=>setArchived(true)}>Arquivados</button></div></div>
    {loading ? <div className={styles.empty}>Carregando Biblioteca...</div> : resources.length === 0 ? <div className={styles.empty}><strong>{query?"Nenhum material encontrado.":archived?"Nenhum material arquivado.":"Sua Biblioteca ainda está vazia"}</strong><p>{query?"Tente outro termo de busca.":archived?"Os materiais arquivados aparecerão aqui.":"Crie materiais reutilizáveis para utilizar em diferentes Jornadas."}</p>{!query&&!archived&&<button className={styles.primary} type="button" onClick={()=>{setEditorMode("edit");setEditor(EMPTY);}}>Criar primeiro material</button>}</div> :
    <div className={styles.list}>{resources.map((resource)=><button className={styles.row} type="button" key={resource.id} onClick={()=>setSelected(resource)}><span className={styles.rowMain}><strong>{resource.title}</strong><small>{resource.summary || "Sem descrição."}</small></span><span className={styles.meta}>Revisão {resource.revision}<small>{new Date(resource.updatedAt).toLocaleDateString("pt-BR")}</small></span><span aria-hidden="true">→</span></button>)}</div>}
  </section>;
}
