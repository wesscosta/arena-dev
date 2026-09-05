export function wordCloudFontSize(
  count: number,
  maxCount: number,
  minSize = 34,
  maxSize = 112,
) {
  const safeCount = Math.max(1, Math.trunc(count));
  const safeMax = Math.max(1, Math.trunc(maxCount));

  if (safeMax <= 1) {
    return Math.round(minSize + (maxSize - minSize) * 0.22);
  }

  const ratio = Math.min(
    1,
    Math.max(0, (safeCount - 1) / (safeMax - 1)),
  );
  const weighted = Math.sqrt(ratio);

  return Math.round(minSize + (maxSize - minSize) * weighted);
}

export function wordCloudStatusLabel(status: string) {
  if (status === "COLLECTING") return "Coletando";
  if (status === "REVEALED") return "Revelada";
  if (status === "CLOSED") return "Encerrada";
  return status;
}
