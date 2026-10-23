import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildQuestionPrompt, questionWarnings, validateQuestionPackage } from "../lib/activity-questions";

const PYTHON = "def main():\n    app = QApplication(sys.argv)\n    return app.exec()";

function base(type: string, extra: Record<string, unknown> = {}) {
  return { type, statement: `Enunciado de ${type} em texto corrido.`, difficulty: "INTERMEDIATE", points: 2, ...extra };
}

const sevenTypes = [
  base("MULTIPLE_CHOICE", {
    options: ["A", "B", "C", "D"].map((id) => ({ id, text: `Alternativa ${id}` })),
    answer: "B",
    code: PYTHON,
    language: "python",
  }),
  base("OPEN", { expectedAnswer: "Resposta esperada" }),
  base("TRUE_FALSE", { answer: true, code: "SELECT 1;", language: "sql" }),
  base("BUG_FIX", { expectedAnswer: "Use total += valor." }),
  base("ANALYSIS", { expectedAnswer: "Análise", code: PYTHON, language: "python" }),
  base("PRACTICAL", { expectedOutcome: "Executa", evaluationCriteria: ["Filtra ativos"], code: "SELECT nome FROM alunos;", language: "sql" }),
  base("SCENARIO", { expectedAnswer: "Resposta do cenário" }),
];

test("importação aceita os sete tipos com e sem code e devolve code/language como vieram", () => {
  const result = validateQuestionPackage({ version: "1.0", questions: sevenTypes });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  const questions = result.package?.questions ?? [];
  assert.deepEqual(questions.map((question) => question.type), [
    "MULTIPLE_CHOICE", "OPEN", "TRUE_FALSE", "BUG_FIX", "ANALYSIS", "PRACTICAL", "SCENARIO",
  ]);
  assert.deepEqual(questions.map((question) => question.code ?? null), [
    PYTHON, null, "SELECT 1;", null, PYTHON, "SELECT nome FROM alunos;", null,
  ]);
  assert.deepEqual(questions.map((question) => question.language ?? null), [
    "python", null, "sql", null, "python", "sql", null,
  ]);
});

test("BUG_FIX sem code é aceita, mas sem expectedAnswer continua bloqueada", () => {
  assert.deepEqual(validateQuestionPackage({ version: "1.0", questions: [base("BUG_FIX", { expectedAnswer: "Corrigir" })] }).errors, []);

  const blocked = validateQuestionPackage({ version: "1.0", questions: [base("BUG_FIX", { code: PYTHON, language: "python" })] });
  assert.equal(blocked.package, undefined);
  assert.deepEqual(blocked.errors, ["Questão 1: BUG_FIX deve incluir expectedAnswer."]);
});

test("aviso: quebra de linha seguida de indentação no enunciado", () => {
  const warnings = questionWarnings({ statement: "Observe:\n    total = 0\nO que acontece?" }, 3);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Questão 3: o enunciado parece conter código/);
  assert.match(warnings[0], /quebra de linha seguida de indentação/);
});

test("aviso: def, class ou import no enunciado", () => {
  for (const statement of ["Analise def soma(a, b): return a + b.", "Uma class Pedido: pass tem qual efeito?", "Ao rodar import sys o que muda?"]) {
    const warnings = questionWarnings({ statement }, 1);
    assert.equal(warnings.length, 1, statement);
    assert.match(warnings[0], /palavra típica de código/);
  }
});

test("aviso: chaves e ponto e vírgula em sequência", () => {
  const warnings = questionWarnings({ statement: "O que imprime if (x) { a++; b--; } em Java?" }, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /chaves e ponto e vírgula/);
});

test("aviso: enunciado acima de 400 caracteres", () => {
  const warnings = questionWarnings({ statement: "a".repeat(401) }, 4);
  assert.deepEqual(warnings, ["Questão 4: o enunciado tem 401 caracteres, acima do recomendado (400)."]);
  assert.deepEqual(questionWarnings({ statement: "a".repeat(400) }, 4), []);
});

test("aviso: code sem language e language sem code", () => {
  assert.deepEqual(questionWarnings({ statement: "Veja o código abaixo.", code: PYTHON }, 5), ["Questão 5: code informado sem language."]);
  assert.deepEqual(questionWarnings({ statement: "Explique o conceito.", language: "python" }, 6), ["Questão 6: language informado sem code."]);
});

test("avisos não bloqueiam a importação e erros continuam bloqueando", () => {
  const withWarnings = validateQuestionPackage({
    version: "1.0",
    questions: [base("OPEN", { statement: "Uma aplicação tem:\n    import sys\nO que acontece?", expectedAnswer: "Nada", language: "python" })],
  });
  assert.deepEqual(withWarnings.errors, []);
  assert.equal(withWarnings.package?.questions.length, 1);
  assert.equal(withWarnings.warnings.length, 2);

  const withError = validateQuestionPackage({ version: "1.0", questions: [base("OPEN", { statement: "a".repeat(450) })] });
  assert.equal(withError.package, undefined);
  assert.equal(withError.errors.length, 1);
});

test("enunciado limpo, com identificador curto, não gera aviso", () => {
  assert.deepEqual(
    questionWarnings({ statement: "O desenvolvedor removeu a chamada app.exec() do código abaixo. Qual é o comportamento esperado?", code: PYTHON, language: "python" }, 1),
    [],
  );
});

test("prompt de geração traz as regras de statement e code e exemplo com e sem code", () => {
  const prompt = buildQuestionPrompt({
    theme: "PySide6",
    context: "",
    difficulty: "INTERMEDIATE",
    counts: { MULTIPLE_CHOICE: 2, OPEN: 0, TRUE_FALSE: 0, BUG_FIX: 1, ANALYSIS: 0, PRACTICAL: 0, SCENARIO: 0 },
    additionalInstructions: "",
  });
  assert.match(prompt, /O statement deve ser texto corrido, sem quebras de linha e sem código em várias linhas\. Identificadores curtos podem aparecer no texto, como app\.exec\(\)\./);
  assert.match(prompt, /Qualquer tipo de questão pode usar code quando a situação exigir um trecho de código; não use code quando a questão não precisar\. Quando usar, informe language e faça o statement se referir a "o código abaixo"\./);
  assert.match(prompt, /O statement deve ter até 350 caracteres e o code até 40 linhas, com trechos omitidos marcados como # \(\.\.\.\)\./);
  assert.match(prompt, /Antes de responder, confira se nenhum statement contém quebra de linha ou código\./);
  assert.doesNotMatch(prompt, /BUG_FIX deve incluir code/);

  const example = JSON.parse(prompt.slice(prompt.indexOf("{\n"), prompt.lastIndexOf("}") + 1));
  const [withoutCode, withCode] = example.questions;
  assert.equal(withoutCode.code, undefined);
  assert.equal(typeof withCode.code, "string");
  assert.equal(withCode.language, "python");
  assert.doesNotMatch(withCode.statement, /\n/);
  assert.deepEqual(questionWarnings(withCode, 2), []);
});

const panel = readFileSync(resolve(process.cwd(), "components/StudentActivitiesPanel.tsx"), "utf8");
const panelCss = readFileSync(resolve(process.cwd(), "components/StudentActivitiesPanel.module.css"), "utf8");

test("tela do aluno: enunciado é texto de leitura com pre-line, não título", () => {
  assert.match(panel, /<p className=\{styles\.runnerStatement\}>\{question\.statement\}<\/p>/);
  assert.doesNotMatch(panel, /<h2>\{question\.statement\}<\/h2>/);
  assert.match(panel, /QUESTÃO \{String\(questionIndex \+ 1\)\.padStart\(2, "0"\)\}/);
  assert.match(panelCss, /\.runnerStatement\{[^}]*white-space:pre-line/);
  assert.doesNotMatch(panelCss, /\.runnerQuestion h2/);
});

test("tela do aluno: bloco de código só existe quando a questão tem code, em qualquer tipo", () => {
  const codeBlock = panel.match(/\{question\.code && <figure[\s\S]*?<\/figure>\}/)?.[0];
  assert.ok(codeBlock, "bloco de código condicional a question.code");
  assert.doesNotMatch(codeBlock, /question\.type/);
  assert.match(codeBlock, /<pre className=\{styles\.runnerCode\}><code data-language=\{question\.language \|\| undefined\}>\{question\.code\}<\/code><\/pre>/);
  assert.match(codeBlock, /\{question\.language && <figcaption>\{question\.language\}<\/figcaption>\}/);

  const statementAt = panel.indexOf("styles.runnerStatement");
  const codeAt = panel.indexOf("{question.code && <figure");
  const optionsAt = panel.indexOf("{options.length ?", codeAt);
  assert.ok(statementAt < codeAt && codeAt < optionsAt, "código fica entre o enunciado e as alternativas ou o campo de resposta");

  assert.match(panelCss, /\.runnerCode\{[^}]*font-family:var\(--font-family-mono\)[^}]*white-space:pre[;}]/);
  assert.match(panelCss, /\.runnerCode\{[^}]*overflow:auto/);
});

test("tela do aluno: hover e alternativa selecionada partem da superfície do tema", () => {
  const rule = panelCss.match(/\.runnerOption:hover,\.selectedOption\{[^}]*\}/)?.[0] ?? "";
  assert.match(rule, /background:color-mix\(in srgb,var\(--accent\) 7%,var\(--ds-surface-subtle\)\)/);
  assert.doesNotMatch(rule, /#0b1512/);
  assert.match(panelCss, /\.runnerOption:hover,\.runnerOption:active\{[^}]*color:var\(--ds-text-primary\)\}/);
  assert.match(panelCss, /\.selectedOption b\{[^}]*background:var\(--ds-accent-text\);color:var\(--ds-accent-text-contrast\)\}/);
});

test("tela do aluno: topo do runner sem espaço sobrando no desktop", () => {
  assert.match(panelCss, /\.runnerMain\{align-content:start;padding-top:clamp\(24px,4vh,44px\)/);
  assert.doesNotMatch(panelCss, /padding-top:clamp\(70px,10vh,112px\)/);
});

const builder = readFileSync(resolve(process.cwd(), "components/ActivityQuestionBuilder.tsx"), "utf8");

test("construtor: avisos aparecem após importar e o formulário manual aceita código em qualquer tipo", () => {
  assert.match(builder, /setImportWarnings\(result\.warnings\)/);
  assert.match(builder, /Importado com avisos/);
  assert.match(builder, /code: manualCode\.trim\(\) \? manualCode : undefined/);
  assert.doesNotMatch(builder, /manualType === "BUG_FIX" && <div className="form-two">/);
});
