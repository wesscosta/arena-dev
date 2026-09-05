export type WordCloudParticipationMetrics = {
  presentCount: number;
  answeredCount: number;
  pendingCount: number;
  submissionCount: number;
};

export function wordCloudParticipationMetrics(
  presentCount: number,
  answeredCount: number,
  submissionCount: number,
): WordCloudParticipationMetrics {
  const present = Math.max(0, Math.trunc(presentCount));
  const answered = Math.max(0, Math.trunc(answeredCount));
  const submissions = Math.max(0, Math.trunc(submissionCount));

  return {
    presentCount: present,
    answeredCount: answered,
    pendingCount: Math.max(0, present - answered),
    submissionCount: submissions,
  };
}
