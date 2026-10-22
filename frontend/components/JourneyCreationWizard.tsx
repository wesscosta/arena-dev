"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  fetchContentIngestionCapabilities,
  previewContentFile,
  previewContentIngestion,
  type ContentDraft,
  type ContentIngestionCapabilities,
  type ContentIngestionSource,
} from "@/lib/content-ingestion-api";
import { fetchIntegrationConnections, fetchNotionPages, startNotionOAuth, type NotionPageSummary } from "@/lib/microsoft-integration-api";
import styles from "./JourneyCreationWizard.module.css";
import DraftReviewWorkspace from "./DraftReviewWorkspace";
import type { Notify } from "@/components/ui";

type Props = {
  classroomId: string;
  classroomName: string;
  onClose: () => void;
  onBlank: () => void;
  onUseDraft: (draft: ContentDraft) => Promise<void> | void;
  notify: Notify;
};

type Mode = "choose" | "ai" | "template" | "import" | "preview";
type ImportMode = "file" | "markdown" | "text" | "notion" | "url";

const TEMPLATE_OPTIONS = [
  { key: "SEQUENCE", title: "Sequência de estudo", text: "Contexto, desenvolvimento e síntese." },
  { key: "PROJECT", title: "Estudo por projeto", text: "Contexto, construção e síntese do projeto." },
  { key: "EXAM_PREP", title: "Preparação para avaliação", text: "Conhecimentos prévios, revisão e síntese." },
  { key: "CHALLENGE", title: "Estudo por desafios", text: "Contexto, análise e estratégias de resolução." },
] as const;

// rc.8: creation is a screen of its own inside the Journeys tab, not a modal.
// It has a history entry, so the browser "back" returns to the Journey list,
// and Esc or a click outside can no longer discard what the teacher prepared.
export default function JourneyCreationWizard({
  classroomId,
  classroomName,
  onClose,
  onBlank,
  onUseDraft,
  notify,
}: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [importMode, setImportMode] = useState<ImportMode>("file");
  const [capabilities, setCapabilities] = useState<ContentIngestionCapabilities | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [textContent, setTextContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPageSummary[]>([]);
  const [notionQuery, setNotionQuery] = useState("");
  const [notionLoading, setNotionLoading] = useState(false);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const hasWork = Boolean(draft || title.trim() || brief.trim() || textContent.trim() || sourceUrl.trim());

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
    void fetchContentIngestionCapabilities().then(setCapabilities).catch(() => setCapabilities(null));
    void fetchIntegrationConnections().then((items) => {
      const connected = items.some((item) => item.provider === "NOTION" && item.status === "ACTIVE");
      setNotionConnected(connected);
      if (connected) { setNotionLoading(true); void fetchNotionPages().then(setNotionPages).catch(() => setNotionPages([])).finally(() => setNotionLoading(false)); }
    }).catch(() => setNotionConnected(false));
  }, []);

  // A reload or closed tab would lose the prepared material; the browser asks first.
  useEffect(() => {
    if (!hasWork) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasWork]);

  function leave() {
    if (hasWork && !window.confirm("Sair da criação? O que você preparou para esta jornada será descartado.")) return;
    onClose();
  }

  async function preview(input: {
    source: ContentIngestionSource;
    templateKey?: string;
    content?: string;
    sourceUrl?: string;
    sourceLabel?: string;
  }) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await previewContentIngestion({
        classroomId,
        source: input.source,
        title: title.trim() || undefined,
        templateKey: input.templateKey,
        content: input.content,
        sourceUrl: input.sourceUrl,
        sourceLabel: input.sourceLabel,
      });
      setDraft(result);
      setMode("preview");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível preparar a jornada.", "error");
    } finally {
      setBusy(false);
    }
  }
  async function analyzeFile(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await previewContentFile(classroomId, file, title);
      setSourceLabel(file.name);
      setDraft(result);
      setMode("preview");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível analisar o arquivo.", "error");
    } finally {
      setBusy(false);
      setDragOver(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await analyzeFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void analyzeFile(file);
  }

  function chooseBlank() {
    onBlank();
    onClose();
  }

  async function applyDraft() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await onUseDraft(draft);
      onClose();
    } catch {
      // The parent already surfaced the domain/API error.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.screen} aria-labelledby="journey-creation-title">
        <header className={styles.screenHeader}>
          <button type="button" className={styles.backLink} onClick={leave}>← Jornadas de {classroomName}</button>
          <span className={styles.eyebrow}>NOVA JORNADA</span>
          <h2 id="journey-creation-title" ref={headingRef} tabIndex={-1}>{mode === "choose" ? "Como você quer começar?" : mode === "preview" ? "Revise a estrutura sugerida" : "Prepare o ponto de partida"}</h2>
          <p>A Arena adapta o fluxo ao material que você já tem, inclusive nenhum.</p>
        </header>
        {mode === "choose" && (
          <div className={styles.choiceGrid}>
            <button type="button" className={styles.choice} onClick={() => setMode("ai")}>
              <span className={styles.choiceIcon}>✦</span>
              <strong>Criar com IA</strong>
              <small>Comece mesmo sem material pronto: descreva turma, objetivo e tempo. A Arena propõe um rascunho para revisão.</small>
              {!capabilities?.aiConfigured && <em>Requer configuração do provedor de IA</em>}
            </button>
            <button type="button" className={styles.choice} onClick={() => setMode("template")}>
              <span className={styles.choiceIcon}>◫</span>
              <strong>Usar um modelo</strong>
              <small>Escolha uma estrutura pedagógica pronta e adapte ao seu conteúdo e à sua turma.</small>
            </button>
            <button type="button" className={styles.choice} onClick={() => setMode("import")}>
              <span className={styles.choiceIcon}>↑</span>
              <strong>Importar material</strong>
              <small>Aproveite PDF, Word, PowerPoint, texto ou link. A Arena organiza o material para você revisar.</small>
            </button>
            <button type="button" className={styles.choice} onClick={chooseBlank}>
              <span className={styles.choiceIcon}>＋</span>
              <strong>Começar em branco</strong>
              <small>Monte a jornada manualmente, etapa por etapa.</small>
            </button>
          </div>
        )}

        {mode === "ai" && (
          <div className={styles.formPanel}>
            <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Introdução a Banco de Dados" /></label>
            <label><span>Descreva o que precisa ensinar</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Ex.: Turma iniciante, 20 horas, foco em modelagem e SQL, com prática a cada módulo e projeto final." /></label>
            {!capabilities?.aiConfigured && <div className={styles.notice}>A criação com IA está disponível no produto, mas este ambiente ainda não possui <code>ARENA_AI_API_KEY</code>.</div>}
            <div className={styles.footer}><button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button><button className={styles.primary} disabled={busy || !brief.trim() || !capabilities?.aiConfigured} onClick={() => void preview({ source: "AI", content: brief })}>{busy ? "Gerando..." : "Gerar rascunho"}</button></div>
          </div>
        )}
        {mode === "template" && (
          <div className={styles.formPanel}>
            <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A Arena pode sugerir um título inicial" /></label>
            <div className={styles.templateGrid}>
              {TEMPLATE_OPTIONS.map((template) => (
                <button key={template.key} className={styles.template} type="button" disabled={busy} onClick={() => void preview({ source: "TEMPLATE", templateKey: template.key })}>
                  <strong>{template.title}</strong>
                  <small>{template.text}</small>
                </button>
              ))}
            </div>
            <div className={styles.footer}><button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button></div>
          </div>
        )}

        {mode === "import" && (
          <div className={styles.formPanel}>
            <div className={styles.importTabs}>
              {([
                ["file", "Arquivo"],
                ["markdown", "Markdown"],
                ["text", "Colar texto"],
                ["notion", "Notion"],
                ["url", "Link"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" className={importMode === key ? styles.activeTab : ""} onClick={() => setImportMode(key)}>{label}</button>
              ))}
            </div>
            {importMode === "file" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Se vazio, a Arena usa o conteúdo do material" /></label>
                <div
                  className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
                  onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                  onDragLeave={(event) => { if (event.currentTarget === event.target) setDragOver(false); }}
                  onDrop={handleDrop}
                >
                  <strong>{busy ? "Analisando material..." : dragOver ? "Solte o arquivo aqui" : "Arraste um material ou escolha um arquivo"}</strong>
                  <p>PDF, Word e PowerPoint podem ser analisados. Arquivos Markdown preservam a hierarquia declarada sem depender de IA.</p>
                  <label className={styles.fileButton}>Escolher arquivo<input type="file" disabled={busy} accept=".pdf,.doc,.docx,.ppt,.pptx,.md,.markdown,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown" onChange={(event) => void handleFile(event)} /></label>
                  <small className={styles.supportedFiles}>Até 20 MB · {(capabilities?.supportedFileExtensions ?? ["PDF", "DOCX", "PPTX", "TXT", "MD"]).join(" · ")}</small>
                </div>
              </>
            )}
            {importMode === "markdown" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Se vazio, a Arena usa o H1" /></label>
                <div className={styles.structureHint}><strong>Importação estruturada</strong><span>H1 define o título · H2 vira módulo · H3 vira conteúdo · H4–H6 permanecem dentro do conteúdo.</span><small>A Arena preserva a estrutura explícita do Markdown. IA não é necessária para este fluxo.</small></div>
                <label><span>Cole o Markdown</span><textarea className={styles.largeText} value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder={"# Python\n\n## Fundamentos\n\n### Variáveis\nConteúdo..."} /></label>
              </>
            )}
            {importMode === "text" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label><span>Cole seu material</span><textarea className={styles.largeText} value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder="Cole roteiro de aula, apostila, plano, anotações ou qualquer texto." /></label>
              </>
            )}
            {importMode === "notion" && (
              <div className={styles.notionPanel}>
                {notionConnected ? <>
                  <div className={styles.structureHint}><strong>Workspace conectado</strong><span>Escolha uma página autorizada. A Arena importa um snapshot e preserva sua hierarquia para revisão.</span><small>Alterações posteriores no Notion não modificam a jornada automaticamente.</small></div>
                  <label><span>Buscar página</span><input value={notionQuery} onChange={(event)=>setNotionQuery(event.target.value)} placeholder="Python, Django, Banco de Dados..." /></label>
                  <button type="button" className={styles.secondary} disabled={notionLoading} onClick={()=>{setNotionLoading(true);void fetchNotionPages(notionQuery).then(setNotionPages).catch((e)=>notify(e instanceof Error?e.message:"Falha ao buscar páginas do Notion.", "error")).finally(()=>setNotionLoading(false));}}>{notionLoading?"Buscando...":"Buscar"}</button>
                  <div className={styles.notionPages}>{notionPages.map((page)=><button key={page.id} type="button" className={styles.notionPage} disabled={busy} onClick={()=>void preview({source:"NOTION",sourceUrl:page.url,sourceLabel:page.title})}><strong>{page.title}</strong><small>Importar página</small></button>)}{!notionLoading && notionPages.length===0 && <small className={styles.emptyPages}>Nenhuma página autorizada encontrada.</small>}</div>
                  <div className={styles.sourceHint}>Você também pode usar a aba Link para colar diretamente a URL de uma página já autorizada.</div>
                </> : <div className={styles.notionConnect}><strong>Conecte seu Notion para importar páginas</strong><p>Autorize o Arena Dev a acessar somente as páginas que você escolher. Nenhum token precisa ser copiado manualmente.</p><button type="button" className={styles.primary} onClick={()=>void startNotionOAuth().then(({authorizationUrl})=>window.location.assign(authorizationUrl)).catch((e)=>notify(e instanceof Error?e.message:"Falha ao iniciar conexão com Notion.", "error"))}>Conectar Notion</button></div>}
              </div>
            )}
            {importMode === "url" && (
              <>
                <label><span>Título opcional</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label><span>URL do material</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
                <label><span>Identificação opcional</span><input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="Ex.: Material de referência" /></label>
                {sourceUrl.toLowerCase().includes("notion") && <div className={styles.notice}>{notionConnected ? "Link do Notion reconhecido. A Arena importará um snapshot da página usando sua conexão autorizada." : "Link do Notion reconhecido, mas não há conexão autorizada. Use a aba Notion para conectar o workspace antes de importar o conteúdo."}</div>}
                <div className={styles.sourceHint}>Links comuns viram recursos externos. Links do Notion são reconhecidos automaticamente, sem exigir um fluxo separado.</div>
              </>
            )}
            <div className={styles.footer}>
              <button className={styles.secondary} onClick={() => setMode("choose")}>Voltar</button>
              {importMode === "markdown" && <button className={styles.primary} disabled={busy || !textContent.trim()} onClick={() => void preview({ source: "MARKDOWN", content: textContent, sourceLabel: "Markdown colado" })}>{busy ? "Estruturando..." : "Preservar estrutura"}</button>}
              {importMode === "text" && <button className={styles.primary} disabled={busy || !textContent.trim()} onClick={() => void preview({ source: "TEXT", content: textContent, sourceLabel: "Texto colado" })}>{busy ? "Analisando..." : "Analisar material"}</button>}
              {importMode === "url" && <button className={styles.primary} disabled={busy || !sourceUrl.trim() || (sourceUrl.toLowerCase().includes("notion") && !notionConnected)} onClick={() => void preview({ source: sourceUrl.toLowerCase().includes("notion") ? "NOTION" : "URL", sourceUrl, sourceLabel })}>{sourceUrl.toLowerCase().includes("notion") ? "Importar página" : "Usar link"}</button>}
            </div>
          </div>
        )}
        {mode === "preview" && draft && (
          <DraftReviewWorkspace
            draft={draft}
            busy={busy}
            onChange={setDraft}
            onBack={() => setMode("choose")}
            onUse={() => void applyDraft()}
          />
        )}
    </section>
  );
}
