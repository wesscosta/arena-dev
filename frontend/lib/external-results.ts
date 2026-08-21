export type ExternalResultPlatform = "AUTO" | "WAYGROUND" | "MICROSOFT_FORMS" | "GOOGLE_FORMS" | "KAHOOT" | "GENERIC_CSV";

export type ParsedExternalResultRow = {
  rowIndex: number;
  participantName?: string;
  participantRegistration?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  raw: Record<string, string>;
};

export type ParsedExternalReport = {
  delimiter: string;
  headers: string[];
  rows: ParsedExternalResultRow[];
  detectedPlatform: ExternalResultPlatform;
  hasPercentage: boolean;
  detectedMaxScore?: number;
};

const NAME_ALIASES = [
  "nome", "nome completo", "aluno", "participante", "respondente", "student", "student name",
  "participant", "participant name", "respondent", "respondent name", "nickname", "player", "player name", "name",
];
const REGISTRATION_ALIASES = ["matricula", "matrícula", "registro", "registration", "ra", "email", "e-mail", "email address"];
const SCORE_ALIASES = [
  "pontos", "pontuacao", "pontuação", "nota", "resultado", "score", "points", "total points", "grade", "correct answers",
];
const MAX_ALIASES = ["pontuacao maxima", "pontuação máxima", "maximo", "máximo", "max score", "maximum score", "possible points", "points possible"];
const PERCENT_ALIASES = ["percentual", "porcentagem", "percentagem", "%", "percentage", "percent", "score percentage"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value.trim());
  return cells;
}

function detectDelimiter(firstLine: string) {
  const options = [",", ";", "\t"];
  return options
    .map((delimiter) => ({ delimiter, count: splitDelimitedLine(firstLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalize);
  return headers.find((header) => normalizedAliases.includes(normalize(header)))
    ?? headers.find((header) => normalizedAliases.some((alias) => normalize(header).includes(alias) || alias.includes(normalize(header))));
}

function parseNumber(value?: string) {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/\s/g, "").replace(/%$/, "");
  if (!cleaned) return undefined;
  const normalized = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function parseScorePair(value?: string) {
  if (!value) return undefined;
  const match = value.trim().match(/^\s*(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (!match) return undefined;
  return { score: parseNumber(match[1]), maxScore: parseNumber(match[2]) };
}

function detectPlatform(headers: string[]): ExternalResultPlatform {
  const signature = headers.map(normalize).join(" | ");
  if (signature.includes("quizizz") || signature.includes("wayground")) return "WAYGROUND";
  if (signature.includes("respondent") && (signature.includes("points") || signature.includes("total points"))) return "MICROSOFT_FORMS";
  if (signature.includes("timestamp") && (signature.includes("score") || signature.includes("pontos"))) return "GOOGLE_FORMS";
  if (signature.includes("kahoot") || (signature.includes("nickname") && signature.includes("correct answers"))) return "KAHOOT";
  return "GENERIC_CSV";
}

export function parseExternalResultFile(text: string): ParsedExternalReport {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("O arquivo precisa conter cabeçalho e ao menos uma linha de resultado.");
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map((header, index) => header || `Coluna ${index + 1}`);
  const nameHeader = findHeader(headers, NAME_ALIASES);
  const registrationHeader = findHeader(headers, REGISTRATION_ALIASES);
  const scoreHeader = findHeader(headers, SCORE_ALIASES);
  const maxHeader = findHeader(headers, MAX_ALIASES);
  const percentHeader = findHeader(headers, PERCENT_ALIASES);

  if (!nameHeader && !registrationHeader) throw new Error("Não encontrei uma coluna de aluno/nome/matrícula no relatório.");
  if (!scoreHeader && !percentHeader) throw new Error("Não encontrei uma coluna de pontuação ou percentual no relatório.");

  let detectedMaxScore: number | undefined;
  const rows = lines.slice(1).map((line, index) => {
    const values = splitDelimitedLine(line, delimiter);
    const raw = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const pair = scoreHeader ? parseScorePair(raw[scoreHeader]) : undefined;
    const score = pair?.score ?? parseNumber(scoreHeader ? raw[scoreHeader] : undefined);
    const maxScore = pair?.maxScore ?? parseNumber(maxHeader ? raw[maxHeader] : undefined);
    const percentage = parseNumber(percentHeader ? raw[percentHeader] : undefined);
    if (maxScore && (!detectedMaxScore || maxScore > detectedMaxScore)) detectedMaxScore = maxScore;
    return {
      rowIndex: index + 1,
      participantName: nameHeader ? raw[nameHeader]?.trim() || undefined : undefined,
      participantRegistration: registrationHeader ? raw[registrationHeader]?.trim() || undefined : undefined,
      score,
      maxScore,
      percentage,
      raw,
    } satisfies ParsedExternalResultRow;
  }).filter((row) => row.participantName || row.participantRegistration);

  if (!rows.length) throw new Error("Nenhuma linha válida de aluno foi encontrada no relatório.");
  return {
    delimiter,
    headers,
    rows,
    detectedPlatform: detectPlatform(headers),
    hasPercentage: rows.some((row) => row.percentage !== undefined),
    detectedMaxScore,
  };
}

export const EXTERNAL_PLATFORM_LABEL: Record<ExternalResultPlatform, string> = {
  AUTO: "Detectar automaticamente",
  WAYGROUND: "Wayground / Quizizz",
  MICROSOFT_FORMS: "Microsoft Forms",
  GOOGLE_FORMS: "Google Forms",
  KAHOOT: "Kahoot!",
  GENERIC_CSV: "CSV genérico",
};
