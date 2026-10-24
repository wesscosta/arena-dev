/** Client-side indicator; the backend alone decides when a submission expires. */
export function countdownSeconds(deadlineAt: string, serverNow: string, elapsedMs: number): number {
  const end = Date.parse(deadlineAt);
  const server = Date.parse(serverNow);
  if (!Number.isFinite(end) || !Number.isFinite(server)) return 0;
  return Math.max(0, Math.ceil((end - server - elapsedMs) / 1000));
}

export function formatRemaining(total: number): string {
  const seconds = Math.max(0, Math.floor(total));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? [hours, pad(minutes), pad(rest)].join(":") : [pad(minutes), pad(rest)].join(":");
}
