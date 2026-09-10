export function sessionJoinUrl(baseUrl: string, code: string) {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedBase || !normalizedCode) return "";

  return `${normalizedBase}/join?code=${encodeURIComponent(normalizedCode)}`;
}

export function isLoopbackBaseUrl(baseUrl: string) {
  if (!baseUrl.trim()) return false;

  try {
    const url = new URL(baseUrl);
    const host = url.hostname
      .toLowerCase()
      .replace(/^\[(.*)\]$/, "$1");
    return host === "localhost"
      || host === "127.0.0.1"
      || host === "::1"
      || host === "0.0.0.0";
  } catch {
    return false;
  }
}
