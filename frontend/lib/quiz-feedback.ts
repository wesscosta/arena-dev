import { quizOptionMatchesAnswer, type QuizRound } from "./quiz-api";

export type QuizFeedbackDistractor = {
  optionId: string;
  label: string;
  answerCount: number;
  percentage: number;
};

export type QuizFeedback = {
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  distractors: QuizFeedbackDistractor[];
  topDistractor: QuizFeedbackDistractor | null;
};

export function deriveQuizFeedback(round: QuizRound | null): QuizFeedback | null {
  if (!round?.question || round.correctAnswer === null) return null;

  const rows = round.distribution.map((option) => ({
    optionId: option.optionId,
    label: option.label,
    answerCount: option.answerCount ?? 0,
    percentage: option.percentage ?? 0,
    correct: quizOptionMatchesAnswer(option.optionId, round.correctAnswer),
  }));

  const correctAnswers = rows
    .filter((row) => row.correct)
    .reduce((sum, row) => sum + row.answerCount, 0);

  const incorrectAnswers = Math.max(0, round.totalAnswers - correctAnswers);
  const accuracyPercentage = round.totalAnswers === 0
    ? 0
    : (correctAnswers * 100) / round.totalAnswers;

  const distractors = rows
    .filter((row) => !row.correct && row.answerCount > 0)
    .map(({ correct: _correct, ...row }) => row)
    .sort((a, b) =>
      b.answerCount - a.answerCount
      || b.percentage - a.percentage
      || a.label.localeCompare(b.label, "pt-BR")
    );

  return {
    totalAnswers: round.totalAnswers,
    correctAnswers,
    incorrectAnswers,
    accuracyPercentage,
    distractors,
    topDistractor: distractors[0] ?? null,
  };
}
