import { uid } from "./store";
import type {
  ActivityQuestion,
  QuestionDifficulty,
  QuestionPackage,
  QuestionType,
} from "./types";

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Múltipla escolha" },
  { value: "OPEN", label: "Aberta" },
  { value: "TRUE_FALSE", label: "Verdadeiro/Falso" },
  { value: "BUG_FIX", label: "Correção de bug" },
  { value: "ANALYSIS", label: "Análise / interpretação" },
  { value: "PRACTICAL", label: "Prática" },
  { value: "SCENARIO", label: "Situação-problema" },
];

export const QUESTION_DIFFICULTIES: { value: QuestionDifficulty; label: string }[] = [
  { value: "EASY", label: "Fácil" },
  { value: "INTERMEDIATE", label: "Intermediária" },
  { value: "HARD", label: "Avançada" },
];

export const QUESTION_TYPE_LABEL = Object.fromEntries(
  QUESTION_TYPES.map((item) => [item.value, item.label]),
) as Record<QuestionType, string>;

export const QUESTION_DIFFICULTY_LABEL = Object.fromEntries(
  QUESTION_DIFFICULTIES.map((item) => [item.value, item.label]),
) as Record<QuestionDifficulty, string>;

const ALLOWED_TYPES = new Set(QUESTION_TYPES.map((item) => item.value));
const ALLOWED_DIFFICULTIES = new Set(QUESTION_DIFFICULTIES.map((item) => item.value));

export type QuestionCounts = Record<QuestionType, number>;

export const EMPTY_QUESTION_COUNTS: QuestionCounts = {
  MULTIPLE_CHOICE: 0,
  OPEN: 0,
  TRUE_FALSE: 0,
  BUG_FIX: 0,
  ANALYSIS: 0,
  PRACTICAL: 0,
  SCENARIO: 0,
};

export const QUESTION_PRESETS: Record<string, QuestionCounts> = {
  Revisão: {
    ...EMPTY_QUESTION_COUNTS,
    MULTIPLE_CHOICE: 3,
    OPEN: 2,
    ANALYSIS: 1,
  },
  Diagnóstico: {
    ...EMPTY_QUESTION_COUNTS,
    MULTIPLE_CHOICE: 3,
    OPEN: 2,
  },
  Prática: {
    ...EMPTY_QUESTION_COUNTS,
    OPEN: 1,
    ANALYSIS: 2,
    PRACTICAL: 2,
    SCENARIO: 1,
  },
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function asPositivePoints(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Limite do statement pedido no prompt, por tipo. */
export const STATEMENT_LIMIT: Record<QuestionType, number> = {
  MULTIPLE_CHOICE: 350,
  TRUE_FALSE: 350,
  BUG_FIX: 350,
  OPEN: 600,
  ANALYSIS: 600,
  PRACTICAL: 600,
  SCENARIO: 600,
};

/** Folga sobre o limite do prompt antes de avisar. */
export const STATEMENT_WARNING_MARGIN = 50;

export const CODE_LANGUAGES = ["python", "sql", "javascript", "typescript", "java", "bash", "html", "css", "json", "text"];

const STATEMENT_CODE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\n[ \t]+\S/, reason: "quebra de linha seguida de indentação" },
  { pattern: /(^|[\s:;(])(def|class|import)\s/, reason: "palavra típica de código (def, class ou import)" },
  { pattern: /\{[^{}]*;[^{}]*\}|;\s*[{}]/, reason: "chaves e ponto e vírgula em sequência" },
];

const CODE_BELOW_PATTERN = /c[oó]digo\s+(abaixo|acima)/i;
const PREVIOUS_OPTIONS_PATTERN = /\b(todas|nenhuma)\s+d?as\s+(alternativas\s+)?(anteriores|acima)/i;
// Letras só contam como referência nestes formatos, para não confundir com o artigo "A".
const OPTION_LETTER_PATTERNS = [
  /\b(?:[Aa]lternativas?|[Ll]etras?|[Oo]p[cç](?:ão|ões))\s+([A-D])\b/g,
  /\b([A-D])\s+(?:e|ou)\s+([A-D])\b/g,
  /\(([A-D])\)/g,
];

function codeReasons(text: string) {
  return STATEMENT_CODE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ reason }) => reason);
}

function referencedLetters(text: string) {
  const letters = new Set<string>();
  for (const pattern of OPTION_LETTER_PATTERNS) {
    for (const match of text.matchAll(pattern)) match.slice(1).forEach((letter) => letter && letters.add(letter));
  }
  return letters;
}

function optionWarnings(options: NonNullable<ActivityQuestion["options"]>, position: number): string[] {
  const warnings: string[] = [];
  if (options.map((option) => option.id).join(",") !== "A,B,C,D") {
    warnings.push(`Questão ${position}: os ids das alternativas devem ser A, B, C e D, nesta ordem.`);
  }
  for (const option of options) {
    const label = `Questão ${position}: a alternativa ${option.id}`;
    const reasons = codeReasons(option.text);
    if (/\n/.test(option.text) && !reasons.length) reasons.unshift("quebra de linha");
    if (reasons.length) warnings.push(`${label} parece conter código (${reasons.join("; ")}). Use uma linha e mova o trecho para o campo code.`);

    const previous = option.text.match(PREVIOUS_OPTIONS_PATTERN)?.[0];
    const others = [...referencedLetters(option.text)].filter((letter) => letter !== option.id);
    if (previous || others.length) {
      const reference = previous ? `'${previous}'` : `letra ${others.join(", ")}`;
      warnings.push(`${label} depende de outras alternativas (${reference}). As alternativas podem ser embaralhadas.`);
    }
  }
  return warnings;
}

/**
 * Avisos não bloqueiam a importação: apontam questões que a IA gerou fora do
 * padrão do prompt (código no enunciado ou nas alternativas, enunciado longo,
 * code e language desencontrados, alternativas que dependem da posição).
 */
export function questionWarnings(
  question: Pick<ActivityQuestion, "statement" | "code" | "language"> & Partial<Pick<ActivityQuestion, "type" | "options">>,
  position: number,
): string[] {
  const warnings: string[] = [];
  const reasons = codeReasons(question.statement);
  if (reasons.length) {
    warnings.push(`Questão ${position}: o enunciado parece conter código (${reasons.join("; ")}). Mova o trecho para o campo code.`);
  }
  const limit = (question.type ? STATEMENT_LIMIT[question.type] ?? 350 : 350) + STATEMENT_WARNING_MARGIN;
  if (question.statement.length > limit) {
    warnings.push(`Questão ${position}: o enunciado tem ${question.statement.length} caracteres, acima do recomendado (${limit}).`);
  }
  if (!question.code && CODE_BELOW_PATTERN.test(question.statement)) {
    warnings.push(`Questão ${position}: o enunciado cita código abaixo ou acima, mas a questão não tem code.`);
  }
  if (question.code && !question.language) warnings.push(`Questão ${position}: code informado sem language.`);
  if (question.language && !question.code) warnings.push(`Questão ${position}: language informado sem code.`);
  if (question.code && /\t/.test(question.code)) warnings.push(`Questão ${position}: o code usa tabulação. Use 4 espaços.`);
  if (question.language && !CODE_LANGUAGES.includes(question.language)) {
    warnings.push(`Questão ${position}: language '${question.language}' fora da lista (${CODE_LANGUAGES.join(", ")}).`);
  }
  if (question.type === "MULTIPLE_CHOICE" && question.options) warnings.push(...optionWarnings(question.options, position));
  return warnings;
}

export function validateQuestionPackage(input: unknown): { package?: QuestionPackage; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== "object") {
    return { errors: ["O conteúdo precisa ser um objeto JSON."], warnings: [] };
  }

  const root = input as Record<string, unknown>;
  if (root.version !== "1.0") errors.push('O campo "version" deve ser "1.0".');
  if (!Array.isArray(root.questions)) {
    errors.push('O campo "questions" deve ser uma lista.');
    return { errors, warnings };
  }

  const normalized: ActivityQuestion[] = [];

  root.questions.forEach((raw, index) => {
    const position = index + 1;
    if (!raw || typeof raw !== "object") {
      errors.push(`Questão ${position}: formato inválido.`);
      return;
    }
    const row = raw as Record<string, unknown>;
    const type = row.type as QuestionType;
    const difficulty = row.difficulty as QuestionDifficulty;
    const statement = isString(row.statement) ? row.statement.trim() : "";

    if (!ALLOWED_TYPES.has(type)) errors.push(`Questão ${position}: tipo inválido.`);
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) errors.push(`Questão ${position}: dificuldade inválida.`);
    if (!statement) errors.push(`Questão ${position}: enunciado obrigatório.`);
    if (!asPositivePoints(row.points)) errors.push(`Questão ${position}: points deve ser um número maior ou igual a zero.`);

    let options: ActivityQuestion["options"];
    let answer = row.answer as ActivityQuestion["answer"];

    if (type === "MULTIPLE_CHOICE") {
      if (!Array.isArray(row.options) || row.options.length !== 4) {
        errors.push(`Questão ${position}: múltipla escolha deve ter exatamente 4 alternativas.`);
      } else {
        options = row.options.map((option, optionIndex) => {
          const item = option as Record<string, unknown>;
          return {
            id: isString(item.id) && item.id.trim() ? item.id.trim() : String.fromCharCode(65 + optionIndex),
            text: isString(item.text) ? item.text.trim() : "",
          };
        });
        if (options.some((option) => !option.text)) errors.push(`Questão ${position}: todas as alternativas precisam ter texto.`);
        if (new Set(options.map((option) => option.id)).size !== 4) errors.push(`Questão ${position}: os ids das alternativas precisam ser únicos.`);
        if (!isString(answer) || !options.some((option) => option.id === answer)) {
          errors.push(`Questão ${position}: answer deve apontar para uma alternativa válida.`);
        }
      }
    }

    if (type === "TRUE_FALSE") {
      const valid = answer === true || answer === false || answer === "true" || answer === "false";
      if (!valid) errors.push(`Questão ${position}: verdadeiro/falso deve usar answer true ou false.`);
      answer = answer === true || answer === "true";
    }

    const criteria = Array.isArray(row.evaluationCriteria)
      ? row.evaluationCriteria.filter(isString).map((item) => item.trim()).filter(Boolean)
      : undefined;
    const expectedAnswer = isString(row.expectedAnswer) ? row.expectedAnswer.trim() : undefined;
    const expectedOutcome = isString(row.expectedOutcome) ? row.expectedOutcome.trim() : undefined;
    const code = isString(row.code) && row.code.trim() ? row.code : undefined;
    const language = isString(row.language) && row.language.trim() ? row.language.trim() : undefined;

    if (["OPEN", "ANALYSIS", "SCENARIO"].includes(type) && !expectedAnswer && !criteria?.length) {
      errors.push(`Questão ${position}: informe expectedAnswer ou evaluationCriteria para orientar a correção.`);
    }
    if (type === "BUG_FIX" && !expectedAnswer) {
      errors.push(`Questão ${position}: BUG_FIX deve incluir expectedAnswer.`);
    }
    if (type === "PRACTICAL" && (!expectedOutcome || !criteria?.length)) {
      errors.push(`Questão ${position}: PRACTICAL deve incluir expectedOutcome e evaluationCriteria.`);
    }

    if (statement) warnings.push(...questionWarnings({ type, statement, code, language, options }, position));

    normalized.push({
      id: uid("question"),
      type,
      statement,
      difficulty,
      points: asPositivePoints(row.points) ? row.points as number : 0,
      options,
      answer,
      expectedAnswer,
      explanation: isString(row.explanation) ? row.explanation.trim() : undefined,
      code,
      language,
      expectedOutcome,
      evaluationCriteria: criteria,
    });
  });

  if (errors.length) return { errors, warnings };

  const activity = root.activity && typeof root.activity === "object"
    ? root.activity as QuestionPackage["activity"]
    : undefined;

  return {
    errors,
    warnings,
    package: {
      version: "1.0",
      activity,
      questions: normalized,
    },
  };
}

export function parseQuestionPackage(raw: string) {
  try {
    return validateQuestionPackage(JSON.parse(raw));
  } catch {
    return { errors: ["JSON inválido. Verifique vírgulas, aspas e chaves antes de importar."], warnings: [] };
  }
}

export function buildQuestionPrompt({
  theme,
  context,
  difficulty,
  counts,
  additionalInstructions,
}: {
  theme: string;
  context: string;
  difficulty: QuestionDifficulty;
  counts: QuestionCounts;
  additionalInstructions: string;
}) {
  const requested = QUESTION_TYPES
    .filter((item) => counts[item.value] > 0)
    .map((item) => `- ${counts[item.value]} ${item.label}`)
    .join("\n");

  const schemaExample = {
    version: "1.0",
    activity: {
      title: theme,
      topic: theme,
      difficulty,
    },
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        statement: "Enunciado completo e independente",
        difficulty,
        points: 3,
        options: [
          { id: "A", text: "Alternativa A" },
          { id: "B", text: "Alternativa B" },
          { id: "C", text: "Alternativa C" },
          { id: "D", text: "Alternativa D" },
        ],
        answer: "A",
        explanation: "Explicação objetiva da resposta",
      },
      {
        type: "ANALYSIS",
        statement: "O código abaixo deveria somar apenas os valores positivos da lista. Explique por que o resultado sai errado.",
        difficulty,
        points: 4,
        code: "def soma_positivos(valores):\n    total = 0\n    for valor in valores:\n        if valor > 0:\n            total = valor\n    return total",
        language: "python",
        expectedAnswer: "A linha total = valor substitui o acumulado em vez de somar. O correto é total += valor.",
        evaluationCriteria: ["Identifica a linha errada", "Explica a diferença entre atribuir e acumular"],
      },
    ],
  };

  return `Crie um conjunto de questões para uma atividade educacional que será importada no Arena Dev.

Tema: ${theme.trim()}
Nível predominante: ${QUESTION_DIFFICULTY_LABEL[difficulty]}
${context.trim() ? `Contexto/objetivo: ${context.trim()}\n` : ""}
Quantidade por tipo:
${requested}
${additionalInstructions.trim() ? `\nOrientações adicionais:\n${additionalInstructions.trim()}\n` : ""}
Requisitos de qualidade:
- Respeite exatamente as quantidades solicitadas.
- Evite questões repetitivas, ambíguas, excessivamente óbvias ou meramente decorativas.
- Distribua os conceitos do tema entre as questões e use situações realistas quando fizer sentido.
- Cada questão deve ser completa e independente, sem depender de texto não fornecido.
- MULTIPLE_CHOICE deve possuir exatamente 4 alternativas, somente uma correta e answer deve conter o id da alternativa correta.
- Em MULTIPLE_CHOICE, use os ids A, B, C e D, nesta ordem.
- O texto de cada alternativa deve ser curto e em uma linha, sem código em várias linhas. Identificadores curtos são permitidos. Se as alternativas precisarem comparar trechos de código, coloque o código no campo code da questão e faça as alternativas se referirem a ele.
- As alternativas podem ser embaralhadas para cada aluno. Nenhuma alternativa pode depender de posição ou letra: não use 'todas as anteriores', 'nenhuma das anteriores', 'A e C estão corretas' nem referências a outras alternativas.
- TRUE_FALSE deve usar answer com valor booleano true ou false.
- OPEN e ANALYSIS devem incluir expectedAnswer e, quando útil, evaluationCriteria.
- BUG_FIX deve incluir expectedAnswer e explanation. Só use BUG_FIX quando o tema permitir esse tipo de problema.
- PRACTICAL deve incluir expectedOutcome e evaluationCriteria objetivos.
- SCENARIO deve apresentar uma situação-problema realista e critérios claros para uma boa resposta.
- O statement deve ser texto corrido, sem quebras de linha e sem código em várias linhas. Identificadores curtos podem aparecer no texto, como app.exec().
- Qualquer tipo de questão pode usar code quando a situação exigir um trecho de código; não use code quando a questão não precisar. Quando usar, informe language e faça o statement se referir a "o código abaixo".
- Só escreva 'o código abaixo' no statement quando a questão tiver code. Sem code, o statement não cita código abaixo nem acima.
- No campo code, use 4 espaços para indentar, nunca tabulação, e represente as quebras de linha como \\n dentro da string JSON.
- Use em language um destes valores, em minúsculas: ${CODE_LANGUAGES.join(", ")}.
- O statement deve ter até ${STATEMENT_LIMIT.MULTIPLE_CHOICE} caracteres em MULTIPLE_CHOICE, TRUE_FALSE e BUG_FIX, e até ${STATEMENT_LIMIT.OPEN} em OPEN, ANALYSIS, PRACTICAL e SCENARIO. O code deve ter até 40 linhas, com trechos omitidos marcados como # (...).
- Use points coerentes com a dificuldade e o esforço exigido.
- Não escreva introdução, conclusão, comentários ou Markdown fora do JSON.
- Retorne somente JSON válido em UTF-8. Não envolva a resposta em bloco \`\`\`json.
- Use exatamente os nomes de tipos: MULTIPLE_CHOICE, OPEN, TRUE_FALSE, BUG_FIX, ANALYSIS, PRACTICAL, SCENARIO.
- Use exatamente as dificuldades: EASY, INTERMEDIATE, HARD.
- Antes de responder, confira cada questão: o statement não tem quebra de linha nem código; respeita o limite do seu tipo; code e language aparecem juntos ou não aparecem; 'o código abaixo' só aparece quando há code; as alternativas estão em uma linha, sem código, sem referência a outras alternativas, com ids A, B, C e D nessa ordem; as quantidades por tipo estão exatas. Corrija o que não passar.

Formato obrigatório de saída (exemplo estrutural, com uma questão sem code e outra com code; adapte os campos ao tipo de cada questão):
${JSON.stringify(schemaExample, null, 2)}

Campos opcionais: expectedAnswer, explanation, expectedOutcome, evaluationCriteria. Os campos code e language são opcionais em qualquer tipo e andam juntos.
Retorne exclusivamente o objeto JSON final.`;
}
