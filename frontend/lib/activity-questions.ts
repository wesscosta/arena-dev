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

export function validateQuestionPackage(input: unknown): { package?: QuestionPackage; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { errors: ["O conteúdo precisa ser um objeto JSON."] };
  }

  const root = input as Record<string, unknown>;
  if (root.version !== "1.0") errors.push('O campo "version" deve ser "1.0".');
  if (!Array.isArray(root.questions)) {
    errors.push('O campo "questions" deve ser uma lista.');
    return { errors };
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
    const code = isString(row.code) ? row.code : undefined;

    if (["OPEN", "ANALYSIS", "SCENARIO"].includes(type) && !expectedAnswer && !criteria?.length) {
      errors.push(`Questão ${position}: informe expectedAnswer ou evaluationCriteria para orientar a correção.`);
    }
    if (type === "BUG_FIX" && (!code?.trim() || !expectedAnswer)) {
      errors.push(`Questão ${position}: BUG_FIX deve incluir code e expectedAnswer.`);
    }
    if (type === "PRACTICAL" && (!expectedOutcome || !criteria?.length)) {
      errors.push(`Questão ${position}: PRACTICAL deve incluir expectedOutcome e evaluationCriteria.`);
    }

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
      language: isString(row.language) ? row.language.trim() : undefined,
      expectedOutcome,
      evaluationCriteria: criteria,
    });
  });

  if (errors.length) return { errors };

  const activity = root.activity && typeof root.activity === "object"
    ? root.activity as QuestionPackage["activity"]
    : undefined;

  return {
    errors,
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
    return { errors: ["JSON inválido. Verifique vírgulas, aspas e chaves antes de importar."] };
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
- TRUE_FALSE deve usar answer com valor booleano true ou false.
- OPEN e ANALYSIS devem incluir expectedAnswer e, quando útil, evaluationCriteria.
- BUG_FIX deve incluir code, language, expectedAnswer e explanation. Só use BUG_FIX quando o tema permitir esse tipo de problema.
- PRACTICAL deve incluir expectedOutcome e evaluationCriteria objetivos.
- SCENARIO deve apresentar uma situação-problema realista e critérios claros para uma boa resposta.
- Use points coerentes com a dificuldade e o esforço exigido.
- Não escreva introdução, conclusão, comentários ou Markdown fora do JSON.
- Retorne somente JSON válido em UTF-8. Não envolva a resposta em bloco \`\`\`json.
- Use exatamente os nomes de tipos: MULTIPLE_CHOICE, OPEN, TRUE_FALSE, BUG_FIX, ANALYSIS, PRACTICAL, SCENARIO.
- Use exatamente as dificuldades: EASY, INTERMEDIATE, HARD.

Formato obrigatório de saída (exemplo estrutural; adapte os campos ao tipo de cada questão):
${JSON.stringify(schemaExample, null, 2)}

Campos opcionais por tipo: expectedAnswer, explanation, code, language, expectedOutcome, evaluationCriteria.
Retorne exclusivamente o objeto JSON final.`;
}
