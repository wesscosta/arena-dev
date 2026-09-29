"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentDraft, ContentDraftItem, ContentDraftSection } from "@/lib/content-ingestion-api";
import styles from "./DraftReviewWorkspace.module.css";

type Props = { draft: ContentDraft; busy: boolean; onChange: (draft: ContentDraft) => void; onBack: () => void; onUse: () => void };
type Selection = { type: "module"; section: number } | { type: "content"; section: number; item: number };
type Issue = { severity: "ERROR" | "WARNING"; code: string; message: string; section?: number; item?: number };

export function validateContentDraft(draft: ContentDraft): Issue[] {
  const issues: Issue[] = [];
  if (!draft.title.trim()) issues.push({ severity: "ERROR", code: "EMPTY_JOURNEY_TITLE", message: "A jornada precisa de um título." });
  if (!draft.sections.length) issues.push({ severity: "ERROR", code: "NO_MODULES", message: "A jornada precisa de pelo menos um módulo." });
  draft.sections.forEach((section, sectionIndex) => {
    if (!section.title.trim()) issues.push({ severity: "ERROR", code: "EMPTY_MODULE_TITLE", message: "Módulo sem título.", section: sectionIndex });
    if (!section.items.length) issues.push({ severity: "WARNING", code: "EMPTY_MODULE", message: "Módulo sem conteúdos.", section: sectionIndex });
    const titles = new Map<string, number>();
    section.items.forEach((item, itemIndex) => {
      const title = item.title.trim();
      if (!title) issues.push({ severity: "ERROR", code: "EMPTY_CONTENT_TITLE", message: "Conteúdo sem título.", section: sectionIndex, item: itemIndex });
      if (!item.body?.trim() && !item.sourceUrl?.trim()) issues.push({ severity: "WARNING", code: "EMPTY_CONTENT", message: "Conteúdo sem corpo ou origem externa.", section: sectionIndex, item: itemIndex });
      if ((item.body?.length ?? 0) > 12000) issues.push({ severity: "WARNING", code: "LONG_CONTENT", message: "Conteúdo extenso; confirme se a divisão está adequada.", section: sectionIndex, item: itemIndex });
      if (title) { const key = title.toLocaleLowerCase(); const count = titles.get(key) ?? 0; titles.set(key, count + 1); if (count === 1) issues.push({ severity: "WARNING", code: "DUPLICATE_TITLE", message: `Título repetido: ${title}.`, section: sectionIndex, item: itemIndex }); }
    });
    if (section.items.length > 20) issues.push({ severity: "WARNING", code: "LARGE_MODULE", message: "Módulo com mais de 20 conteúdos; revise a granularidade.", section: sectionIndex });
  });
  return issues;
}

export default function DraftReviewWorkspace({ draft, busy, onChange, onBack, onUse }: Props) {
  const [selection, setSelection] = useState<Selection>({ type: "module", section: 0 });
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [preview, setPreview] = useState(false);
  const [mobileOutline, setMobileOutline] = useState(false);
  const issues = useMemo(() => validateContentDraft(draft), [draft]);
  const errors = issues.filter((issue) => issue.severity === "ERROR");
  const warnings = issues.filter((issue) => issue.severity === "WARNING");
  const itemCount = draft.sections.reduce((sum, section) => sum + section.items.length, 0);
  const hasIssue = (section: number, item?: number) => issues.some((issue) => issue.section === section && (item === undefined || issue.item === item));
  const q = query.trim().toLocaleLowerCase();

  const patchDraft = (patch: Partial<ContentDraft>) => onChange({ ...draft, ...patch });
  const patchSection = (index: number, patch: Partial<ContentDraftSection>) => onChange({ ...draft, sections: draft.sections.map((section, i) => i === index ? { ...section, ...patch } : section) });
  const patchItem = (sectionIndex: number, itemIndex: number, patch: Partial<ContentDraftItem>) => {
    const section = draft.sections[sectionIndex]; if (!section) return;
    patchSection(sectionIndex, { items: section.items.map((item, i) => i === itemIndex ? { ...item, ...patch } : item) });
  };
  const moveSection = (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= draft.sections.length) return; const sections = [...draft.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]; onChange({ ...draft, sections }); setSelection({ type: "module", section: target }); };
  const moveItem = (sectionIndex: number, itemIndex: number, delta: number) => { const section = draft.sections[sectionIndex]; const target = itemIndex + delta; if (!section || target < 0 || target >= section.items.length) return; const items = [...section.items]; [items[itemIndex], items[target]] = [items[target], items[itemIndex]]; patchSection(sectionIndex, { items }); setSelection({ type: "content", section: sectionIndex, item: target }); };
  const removeSection = (index: number) => { if (!confirm(`Remover o módulo “${draft.sections[index]?.title || "Sem título"}” desta importação?`)) return; onChange({ ...draft, sections: draft.sections.filter((_, i) => i !== index) }); setSelection({ type: "module", section: Math.max(0, Math.min(index, draft.sections.length - 2)) }); };
  const removeItem = (sectionIndex: number, itemIndex: number) => { const section = draft.sections[sectionIndex]; if (!section || !confirm(`Remover “${section.items[itemIndex]?.title || "Sem título"}” desta importação?`)) return; patchSection(sectionIndex, { items: section.items.filter((_, i) => i !== itemIndex) }); setSelection({ type: "module", section: sectionIndex }); };
  const addSection = () => { const section: ContentDraftSection = { title: `Novo módulo ${draft.sections.length + 1}`, description: null, items: [] }; onChange({ ...draft, sections: [...draft.sections, section] }); setSelection({ type: "module", section: draft.sections.length }); };
  const addItem = (sectionIndex: number) => { const section = draft.sections[sectionIndex]; if (!section) return; const item: ContentDraftItem = { title: `Novo conteúdo ${section.items.length + 1}`, description: null, type: "CONTENT", body: null, sourceUrl: null }; patchSection(sectionIndex, { items: [...section.items, item] }); setSelection({ type: "content", section: sectionIndex, item: section.items.length }); };
  const select = (next: Selection) => { setSelection(next); setPreview(false); setMobileOutline(false); };
  const jumpToIssue = (issue: Issue) => { if (issue.section === undefined) return; select(issue.item === undefined ? { type: "module", section: issue.section } : { type: "content", section: issue.section, item: issue.item }); };

  const selectedSection = draft.sections[selection.section];
  const selectedItem = selection.type === "content" ? selectedSection?.items[selection.item] : null;

  return <div className={styles.workspace}>
    <div className={styles.summary}>
      <div className={styles.identity}><span>Jornada sugerida</span><input value={draft.title} onChange={(e) => patchDraft({ title: e.target.value })} aria-label="Título da jornada sugerida"/><textarea value={draft.description} onChange={(e) => patchDraft({ description: e.target.value })} aria-label="Descrição da jornada sugerida"/></div>
      <div className={styles.metrics}><b>{draft.sections.length}</b><span>módulos</span><b>{itemCount}</b><span>conteúdos</span>{warnings.length > 0 && <><b>{warnings.length}</b><span>avisos</span></>}</div>
    </div>
    <div className={styles.diagnostic}><span>{draft.structureAnalysis?.aiUsed ? `Assistência de IA · ${draft.structureAnalysis.message}` : draft.structureAnalysis?.message || (draft.source === "MARKDOWN" ? "Estrutura detectada · H1 → título · H2 → módulo · H3 → conteúdo" : `Fonte ${draft.source} · estrutura pronta para revisão`)}</span>{issues.length > 0 ? <button type="button" onClick={() => jumpToIssue(issues[0])}>{errors.length ? `${errors.length} erros` : ""}{errors.length && warnings.length ? " · " : ""}{warnings.length ? `${warnings.length} avisos` : ""}</button> : <strong>Sem pendências</strong>}</div>
    <button className={styles.mobileStructure} type="button" onClick={() => setMobileOutline(true)}>☰ Estrutura · {draft.sections.length} módulos</button>
    <div className={styles.layout}>
      <aside className={`${styles.outline} ${mobileOutline ? styles.outlineOpen : ""}`} aria-label="Estrutura do rascunho">
        <div className={styles.outlineHead}><strong>ESTRUTURA</strong><button type="button" onClick={() => setMobileOutline(false)} aria-label="Fechar estrutura">×</button></div>
        <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar módulo ou conteúdo" aria-label="Buscar módulo ou conteúdo"/>
        <div className={styles.filters}><button type="button" className={!attentionOnly ? styles.active : ""} onClick={() => setAttentionOnly(false)}>Todos</button><button type="button" className={attentionOnly ? styles.active : ""} onClick={() => setAttentionOnly(true)}>Com atenção</button></div>
        <nav className={styles.tree}>{draft.sections.map((section, sectionIndex) => {
          const sectionMatches = !q || section.title.toLocaleLowerCase().includes(q);
          const visibleItems = section.items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item, itemIndex }) => (!q || item.title.toLocaleLowerCase().includes(q)) && (!attentionOnly || hasIssue(sectionIndex, itemIndex)));
          if (!sectionMatches && visibleItems.length === 0) return null;
          if (attentionOnly && !hasIssue(sectionIndex) && visibleItems.length === 0) return null;
          const expanded = selection.section === sectionIndex || Boolean(q) || attentionOnly;
          return <div className={styles.treeModule} key={`${section.title}-${sectionIndex}`}>
            <button type="button" className={selection.type === "module" && selection.section === sectionIndex ? styles.selected : ""} onClick={() => select({ type: "module", section: sectionIndex })}><span>{String(sectionIndex + 1).padStart(2,"0")} {section.title || "Sem título"}</span><em>{section.items.length}{hasIssue(sectionIndex) ? " !" : ""}</em></button>
            {expanded && <div className={styles.treeItems}>{visibleItems.map(({ item, itemIndex }) => <button type="button" key={`${item.title}-${itemIndex}`} className={selection.type === "content" && selection.section === sectionIndex && selection.item === itemIndex ? styles.selected : ""} onClick={() => select({ type: "content", section: sectionIndex, item: itemIndex })}><span>{item.title || "Sem título"}</span>{hasIssue(sectionIndex,itemIndex) && <em>!</em>}</button>)}</div>}
          </div>;
        })}</nav>
        <button className={styles.addOutline} type="button" onClick={addSection}>+ Adicionar módulo</button>
      </aside>
      <main className={styles.editor}>
        {!selectedSection ? <div className={styles.empty}>Adicione um módulo para continuar.</div> : selection.type === "module" ? <>
          <div className={styles.editorHeader}><div><span>MÓDULO {String(selection.section + 1).padStart(2,"0")}</span><h4>{selectedSection.title || "Sem título"}</h4></div><div className={styles.actions}><button disabled={selection.section===0} onClick={()=>moveSection(selection.section,-1)}>↑</button><button disabled={selection.section===draft.sections.length-1} onClick={()=>moveSection(selection.section,1)}>↓</button><button className={styles.danger} onClick={()=>removeSection(selection.section)}>Excluir</button></div></div>
          <label><span>Título do módulo</span><input value={selectedSection.title} onChange={(e)=>patchSection(selection.section,{title:e.target.value})}/></label><label><span>Descrição opcional</span><textarea className={styles.short} value={selectedSection.description??""} onChange={(e)=>patchSection(selection.section,{description:e.target.value||null})}/></label>
          <div className={styles.contentList}><div className={styles.contentListHead}><strong>Conteúdos</strong><span>{selectedSection.items.length}</span></div>{selectedSection.items.map((item,itemIndex)=><button type="button" key={`${item.title}-${itemIndex}`} onClick={()=>select({type:"content",section:selection.section,item:itemIndex})}><span>{String(itemIndex+1).padStart(2,"0")}</span><strong>{item.title||"Sem título"}</strong>{hasIssue(selection.section,itemIndex)&&<em>Revisar</em>}<b>→</b></button>)}<button className={styles.addContent} type="button" onClick={()=>addItem(selection.section)}>+ Adicionar conteúdo</button></div>
        </> : selectedItem ? <>
          <div className={styles.editorHeader}><div><button className={styles.backModule} type="button" onClick={()=>select({type:"module",section:selection.section})}>← {selectedSection.title}</button><h4>{selectedItem.title || "Sem título"}</h4></div><div className={styles.actions}><button disabled={selection.item===0} onClick={()=>moveItem(selection.section,selection.item,-1)}>↑</button><button disabled={selection.item===selectedSection.items.length-1} onClick={()=>moveItem(selection.section,selection.item,1)}>↓</button><button className={styles.danger} onClick={()=>removeItem(selection.section,selection.item)}>Excluir</button></div></div>
          <label><span>Título do conteúdo</span><input value={selectedItem.title} onChange={(e)=>patchItem(selection.section,selection.item,{title:e.target.value})}/></label><label><span>Descrição opcional</span><input value={selectedItem.description??""} onChange={(e)=>patchItem(selection.section,selection.item,{description:e.target.value||null})}/></label>{selectedItem.sourceUrl && <label><span>URL do recurso</span><input type="url" value={selectedItem.sourceUrl} onChange={(e)=>patchItem(selection.section,selection.item,{sourceUrl:e.target.value||null})}/></label>}
          <div className={styles.bodyTabs}><button type="button" className={!preview?styles.active:""} onClick={()=>setPreview(false)}>Editar</button><button type="button" className={preview?styles.active:""} onClick={()=>setPreview(true)}>Visualizar</button></div>{preview?<div className={styles.markdownPreview}>{selectedItem.body?<ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedItem.body}</ReactMarkdown>:<p>Este conteúdo ainda não possui corpo.</p>}</div>:<textarea className={styles.bodyEditor} value={selectedItem.body??""} onChange={(e)=>patchItem(selection.section,selection.item,{body:e.target.value||null})} placeholder="Revise o Markdown deste conteúdo."/>}
          {issues.filter((issue)=>issue.section===selection.section&&issue.item===selection.item).map((issue)=><div key={issue.code+issue.message} className={issue.severity==="ERROR"?styles.error:styles.warning}>{issue.message}</div>)}
        </> : null}
      </main>
    </div>
    <div className={styles.reviewFooter}><div>{errors.length>0?<strong>{errors.length} {errors.length===1?"erro impede":"erros impedem"} a criação</strong>:warnings.length>0?<span>{warnings.length} avisos não impedem a criação</span>:<span>Estrutura pronta para materialização</span>}</div><div><button className={styles.secondary} onClick={onBack}>Refazer</button><button className={styles.primary} disabled={busy||errors.length>0||itemCount===0} onClick={onUse}>{busy?"Criando rascunho...":`Usar esta estrutura · ${itemCount} conteúdos`}</button></div></div>
  </div>;
}
