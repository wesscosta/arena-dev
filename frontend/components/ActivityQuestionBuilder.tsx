"use client";

import { useMemo, useState } from "react";
import {
  buildQuestionPrompt,
  EMPTY_QUESTION_COUNTS,
  parseQuestionPackage,
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_LABEL,
  QUESTION_PRESETS,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  type QuestionCounts,
} from "@/lib/activity-questions";
import { uid } from "@/lib/store";
import type { ActivityQuestion, QuestionDifficulty, QuestionType } from "@/lib/types";

type Tab = "manual" | "import" | "ai";

export default function ActivityQuestionBuilder({
  questions,
  setQuestions,
  defaultTheme,
  notify,
}: {
  questions: ActivityQuestion[];
  setQuestions: (questions: ActivityQuestion[]) => void;
  defaultTheme: string;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("ai");
  const [manualType, setManualType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [manualDifficulty, setManualDifficulty] = useState<QuestionDifficulty>("INTERMEDIATE");
  const [manualStatement, setManualStatement] = useState("");
  const [manualPoints, setManualPoints] = useState(3);
  const [manualAnswer, setManualAnswer] = useState("");
  const [manualExplanation, setManualExplanation] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualLanguage, setManualLanguage] = useState("");
  const [manualCriteria, setManualCriteria] = useState("");
  const [manualOptions, setManualOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("A");

  const [jsonInput, setJsonInput] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [lastImportedCount, setLastImportedCount] = useState(0);

  const [theme, setTheme] = useState(defaultTheme);
  const [context, setContext] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("INTERMEDIATE");
  const [counts, setCounts] = useState<QuestionCounts>({ ...QUESTION_PRESETS.Revisão });
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const totalRequested = useMemo(
    () => QUESTION_TYPES.reduce((sum, item) => sum + counts[item.value], 0),
    [counts],
  );

  function resetManual() {
    setManualStatement("");
    setManualAnswer("");
    setManualExplanation("");
    setManualCode("");
    setManualLanguage("");
    setManualCriteria("");
    setManualOptions(["", "", "", ""]);
    setCorrectOption("A");
  }

  function addManualQuestion() {
    if (!manualStatement.trim()) {
      notify("Informe o enunciado da questão.");
      return;
    }

    let options: ActivityQuestion["options"];
    let answer: ActivityQuestion["answer"] = manualAnswer.trim() || undefined;
    if (manualType === "MULTIPLE_CHOICE") {
      if (manualOptions.some((option) => !option.trim())) {
        notify("Preencha as quatro alternativas.");
        return;
      }
      options = manualOptions.map((text, index) => ({ id: String.fromCharCode(65 + index), text: text.trim() }));
      answer = correctOption;
    }
    if (manualType === "TRUE_FALSE") answer = manualAnswer === "false" ? false : true;

    const criteria = manualCriteria.split("\n").map((item) => item.trim()).filter(Boolean);
    const question: ActivityQuestion = {
      id: uid("question"),
      type: manualType,
      difficulty: manualDifficulty,
      points: Math.max(0, manualPoints),
      statement: manualStatement.trim(),
      options,
      answer,
      expectedAnswer: ["OPEN", "ANALYSIS", "SCENARIO", "BUG_FIX"].includes(manualType) ? manualAnswer.trim() || undefined : undefined,
      explanation: manualExplanation.trim() || undefined,
      code: manualType === "BUG_FIX" ? manualCode : undefined,
      language: manualType === "BUG_FIX" ? manualLanguage.trim() || undefined : undefined,
      expectedOutcome: manualType === "PRACTICAL" ? manualAnswer.trim() || undefined : undefined,
      evaluationCriteria: criteria.length ? criteria : undefined,
    };
    setQuestions([...questions, question]);
    resetManual();
    notify("Questão adicionada à atividade.");
  }

  function importJson() {
    const result = parseQuestionPackage(jsonInput);
    setImportErrors(result.errors);
    if (!result.package) {
      setLastImportedCount(0);
      return;
    }
    const importedCount = result.package.questions.length;
    setQuestions([...questions, ...result.package.questions]);
    setJsonInput("");
    setImportErrors([]);
    setLastImportedCount(importedCount);
    notify(`${importedCount} questão(ões) adicionada(s) ao rascunho da atividade.`);
  }

  function readJsonFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJsonInput(String(reader.result ?? ""));
      setImportErrors([]);
    };
    reader.readAsText(file);
  }

  function applyPreset(name: keyof typeof QUESTION_PRESETS) {
    setCounts({ ...QUESTION_PRESETS[name] });
  }

  function generatePrompt() {
    const promptTheme = theme.trim() || defaultTheme.trim();
    if (!promptTheme) {
      notify("Informe o tema da atividade.");
      return;
    }
    if (!totalRequested) {
      notify("Solicite pelo menos uma questão.");
      return;
    }
    setGeneratedPrompt(buildQuestionPrompt({
      theme: promptTheme,
      context,
      difficulty,
      counts,
      additionalInstructions,
    }));
  }

  async function copyPrompt() {
    const prompt = generatedPrompt || buildQuestionPrompt({
      theme: theme.trim() || defaultTheme.trim(),
      context,
      difficulty,
      counts,
      additionalInstructions,
    });
    if (!(theme.trim() || defaultTheme.trim()) || !totalRequested) {
      notify("Informe tema e quantidade antes de copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      setGeneratedPrompt(prompt);
      notify("Prompt copiado. Cole na IA de sua preferência.");
    } catch {
      notify("Não foi possível copiar automaticamente. Selecione o prompt e copie manualmente.");
    }
  }

  return (
    <div className="question-builder">
      <div className="tool-tabs" role="tablist" aria-label="Formas de adicionar questões">
        <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>Gerar com IA</button>
        <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Importar JSON</button>
        <button className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Criar manualmente</button>
      </div>

      {tab === "ai" && (
        <div className="question-tool-body">
          <div className="prompt-presets">
            <span>Modelo rápido</span>
            {Object.keys(QUESTION_PRESETS).map((name) => (
              <button key={name} onClick={() => applyPreset(name as keyof typeof QUESTION_PRESETS)}>{name}</button>
            ))}
            <button onClick={() => setCounts({ ...EMPTY_QUESTION_COUNTS })}>Personalizado</button>
          </div>
          <div className="form-two">
            <label>Tema<input className="input" value={theme} onChange={(event) => setTheme(event.target.value)} placeholder={defaultTheme || "Ex.: DHCP, porcentagem, cultura organizacional..."} /></label>
            <label>Nível<select className="select full" value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}>{QUESTION_DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <label>Objetivo / contexto<input className="input" value={context} onChange={(event) => setContext(event.target.value)} placeholder="Ex.: revisão antes da prática; diagnóstico inicial; aplicação em situação real..." /></label>
          <div className="question-count-grid">
            {QUESTION_TYPES.map((item) => (
              <label key={item.value}>
                <span>{item.label}</span>
                <input className="input compact" type="number" min="0" max="20" value={counts[item.value]} onChange={(event) => setCounts((current) => ({ ...current, [item.value]: Math.max(0, Math.min(20, Number(event.target.value) || 0)) }))} />
              </label>
            ))}
          </div>
          <div className={totalRequested > 15 ? "prompt-total warning" : "prompt-total"}>
            <strong>Total: {totalRequested} questões</strong>
            <span>{totalRequested > 15 ? "Pacote extenso — considere dividir em duas atividades." : "Faixa recomendada para uma atividade rápida: 6–10 questões."}</span>
          </div>
          <label>Orientações adicionais<textarea className="input textarea" rows={3} value={additionalInstructions} onChange={(event) => setAdditionalInstructions(event.target.value)} placeholder="Opcional. Ex.: foque em for e while; não cobre subnetting ainda; use situações de atendimento ao cliente..." /></label>
          <div className="inline-actions solid-actions">
            <button className="button" onClick={generatePrompt}>Gerar prompt</button>
            <button className="button primary" onClick={copyPrompt}>Copiar prompt</button>
          </div>
          {generatedPrompt && <textarea className="input textarea prompt-output" rows={10} readOnly value={generatedPrompt} aria-label="Prompt gerado" />}
        </div>
      )}

      {tab === "import" && (
        <div className="question-tool-body">
          <p className="tool-note">Cole a resposta JSON da IA ou carregue um arquivo <b>.json</b>. O Arena Dev valida o pacote antes de adicionar as questões.</p>
          <textarea className="input textarea json-area" rows={12} value={jsonInput} onChange={(event) => { setJsonInput(event.target.value); setImportErrors([]); setLastImportedCount(0); }} placeholder={'{\n  "version": "1.0",\n  "questions": [...]\n}'} />
          {importErrors.length > 0 && <div className="validation-box"><strong>Revise antes de importar</strong>{importErrors.map((error) => <span key={error}>{error}</span>)}</div>}
          {lastImportedCount > 0 && (
            <div className="inline-note">
              <strong>{lastImportedCount} questão(ões) adicionada(s) ao rascunho.</strong>
              <span>Agora use <b>Salvar atividade</b> para persistir a atividade no PostgreSQL.</span>
            </div>
          )}
          <div className="inline-actions solid-actions">
            <label className="button file-button">Carregar .json<input type="file" accept="application/json,.json" onChange={(event) => readJsonFile(event.target.files?.[0])} /></label>
            <button className="button primary" onClick={importJson} disabled={!jsonInput.trim()}>Validar e importar</button>
          </div>
        </div>
      )}

      {tab === "manual" && (
        <div className="question-tool-body">
          <div className="form-two">
            <label>Tipo<select className="select full" value={manualType} onChange={(event) => setManualType(event.target.value as QuestionType)}>{QUESTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Dificuldade<select className="select full" value={manualDifficulty} onChange={(event) => setManualDifficulty(event.target.value as QuestionDifficulty)}>{QUESTION_DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <label>Enunciado<textarea className="input textarea" rows={3} value={manualStatement} onChange={(event) => setManualStatement(event.target.value)} /></label>
          <label>XP sugerido<input className="input compact" type="number" min="0" value={manualPoints} onChange={(event) => setManualPoints(Math.max(0, Number(event.target.value) || 0))} /></label>

          {manualType === "MULTIPLE_CHOICE" && (
            <div className="manual-options">
              {manualOptions.map((option, index) => {
                const id = String.fromCharCode(65 + index);
                return <label key={id}><span>{id}</span><input className="input" value={option} onChange={(event) => setManualOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} /><input type="radio" name="correct-option" checked={correctOption === id} onChange={() => setCorrectOption(id)} title="Alternativa correta" /></label>;
              })}
            </div>
          )}

          {manualType === "TRUE_FALSE" && <label>Resposta<select className="select full" value={manualAnswer || "true"} onChange={(event) => setManualAnswer(event.target.value)}><option value="true">Verdadeiro</option><option value="false">Falso</option></select></label>}

          {["OPEN", "ANALYSIS", "SCENARIO", "BUG_FIX", "PRACTICAL"].includes(manualType) && (
            <label>{manualType === "PRACTICAL" ? "Resultado esperado" : "Resposta esperada"}<textarea className="input textarea" rows={3} value={manualAnswer} onChange={(event) => setManualAnswer(event.target.value)} /></label>
          )}

          {manualType === "BUG_FIX" && <div className="form-two"><label>Linguagem<input className="input" value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)} placeholder="java, python, javascript..." /></label><label>Código<textarea className="input textarea code-area" rows={5} value={manualCode} onChange={(event) => setManualCode(event.target.value)} /></label></div>}

          {["OPEN", "ANALYSIS", "SCENARIO", "PRACTICAL"].includes(manualType) && <label>Critérios de avaliação <small>um por linha</small><textarea className="input textarea" rows={3} value={manualCriteria} onChange={(event) => setManualCriteria(event.target.value)} /></label>}
          <label>Explicação / apoio ao professor<textarea className="input textarea" rows={2} value={manualExplanation} onChange={(event) => setManualExplanation(event.target.value)} /></label>
          <button className="button primary" onClick={addManualQuestion}>Adicionar questão</button>
        </div>
      )}

      <div className="questions-preview">
        <div className="attendance-head"><strong>Questões da atividade</strong><span>{questions.length} questão(ões)</span></div>
        {questions.map((question, index) => (
          <div className="question-preview-card" key={question.id}>
            <div className="question-order">{String(index + 1).padStart(2, "0")}</div>
            <div className="grow">
              <div className="question-meta"><span>{QUESTION_TYPE_LABEL[question.type]}</span><span>{QUESTION_DIFFICULTY_LABEL[question.difficulty]}</span><span>{question.points} XP</span></div>
              <strong>{question.statement}</strong>
              {question.code && <pre>{question.code}</pre>}
            </div>
            <button className="icon-button danger" title="Remover questão" onClick={() => setQuestions(questions.filter((item) => item.id !== question.id))}>×</button>
          </div>
        ))}
        {!questions.length && <div className="mini-empty">Adicione manualmente, importe JSON ou gere um prompt para sua IA preferida.</div>}
      </div>
    </div>
  );
}
