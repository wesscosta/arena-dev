const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * One line of the teacher's roster paste: a name, an e-mail, or
 * "name, e-mail". The backend validates the e-mail again.
 */
export function parseStudentImportLine(line: string): { name: string; email: string } {
  const value = line.trim();
  if (EMAIL_SHAPE.test(value)) return { name: "", email: value };
  const comma = value.lastIndexOf(",");
  if (comma > 0) {
    const email = value.slice(comma + 1).trim();
    if (EMAIL_SHAPE.test(email)) return { name: value.slice(0, comma).trim(), email };
  }
  return { name: value, email: "" };
}

export type StudentImportStatus = "new" | "link" | "enrolled" | "duplicate" | "invalid-email";

export type StudentImportRow = {
  line: string;
  name: string;
  email: string;
  status: StudentImportStatus;
  /** The registered student this row links to or already is. */
  studentId?: string;
};

type KnownStudent = { id: string; name: string; email?: string };

const HEADER_WORDS = /^(nome|aluno|aluna|nome completo|e-?mail)$/i;

/**
 * One line pasted from a spreadsheet keeps its columns apart with tabs. Any
 * cell with an "@" is the e-mail; the first other cell is the name.
 */
function parseSpreadsheetLine(line: string): { name: string; email: string } {
  const cells = line.split("\t").map((cell) => cell.trim()).filter(Boolean);
  const email = cells.find((cell) => cell.includes("@")) ?? "";
  const name = cells.find((cell) => cell !== email) ?? "";
  return { name, email };
}

function looseKey(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

/**
 * Turns the teacher's paste into one row per student and says what the import
 * will do with each: create, link a student already registered in another
 * classroom (same e-mail), or skip it.
 */
export function planStudentImport(
  text: string,
  students: KnownStudent[],
  enrolledStudentIds: Set<string>,
): StudentImportRow[] {
  const byEmail = new Map(students.filter((student) => student.email).map((student) => [student.email!.toLowerCase(), student]));
  const enrolledByName = new Map(
    students.filter((student) => enrolledStudentIds.has(student.id)).map((student) => [looseKey(student.name), student]),
  );
  const seen = new Set<string>();
  const rows: StudentImportRow[] = [];
  for (const raw of text.split(/\r?\n|;/)) {
    const line = raw.trim();
    if (!line) continue;
    const parsed = line.includes("\t") ? parseSpreadsheetLine(line) : parseStudentImportLine(line);
    if (!parsed.email && line.includes("@") && !line.includes("\t")) {
      // "Nome, nome@escola" with a broken address: keep the name, flag the e-mail.
      const comma = line.lastIndexOf(",");
      parsed.name = comma > 0 ? line.slice(0, comma).trim() : "";
      parsed.email = comma > 0 ? line.slice(comma + 1).trim() : line;
    }
    const cells = line.split(/\t|,/).map((cell) => cell.trim());
    if (!rows.length && !EMAIL_SHAPE.test(parsed.email) && cells.every((cell) => !cell || HEADER_WORDS.test(cell))) continue;
    const email = parsed.email.toLowerCase();
    const name = parsed.name;
    let status: StudentImportStatus = "new";
    let studentId: string | undefined;
    const key = email || `name:${looseKey(name)}`;
    if (email && !EMAIL_SHAPE.test(email)) status = "invalid-email";
    else if (seen.has(key)) status = "duplicate";
    else if (email && byEmail.has(email)) {
      studentId = byEmail.get(email)!.id;
      status = enrolledStudentIds.has(studentId) ? "enrolled" : "link";
    } else if (!email && enrolledByName.has(looseKey(name))) {
      studentId = enrolledByName.get(looseKey(name))!.id;
      status = "enrolled";
    }
    seen.add(key);
    rows.push({ line, name, email, status, studentId });
  }
  return rows;
}
