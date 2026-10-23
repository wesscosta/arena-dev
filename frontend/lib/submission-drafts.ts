/** Persist changes sequentially. A failed write rejects and aborts the remaining writes/submit. */
export async function persistChangedQuestionDrafts<Q extends { id: string }>(
  questions: readonly Q[],
  drafts: Readonly<Record<string, string>>,
  savedValue: (id: string) => string,
  save: (question: Q, value: string) => Promise<void>,
): Promise<void> {
  for (const question of questions) {
    const value = drafts["q:" + question.id] ?? "";
    if (value !== savedValue(question.id)) {
      await save(question, value);
    }
  }
}
