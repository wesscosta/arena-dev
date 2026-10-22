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
