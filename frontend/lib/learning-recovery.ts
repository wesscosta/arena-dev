import type { LearningCycleComparison } from "./learning-cycle-api";

export type RecoveryGuidance = {
  kind: "NO_PAIR" | "RETEACH" | "INVESTIGATE" | "PROGRESS" | "MAINTAIN";
  title: string;
  explanation: string;
  nextStep: string;
};

/** Deterministic, teacher-readable interpretation of observed paired responses only. */
export function recoveryGuidance(value: LearningCycleComparison): RecoveryGuidance {
  const t = value.transitions;
  if (!value.paired) return {
    kind: "NO_PAIR", title: "Sem participantes comparáveis",
    explanation: "Não há as mesmas pessoas com duas evidências avaliadas; não é possível comparar progresso.",
    nextStep: "Reaplique uma verificação equivalente após revisar a participação.",
  };
  if (t.incorrectToIncorrect > 0) return {
    kind: "RETEACH", title: "Retomar dificuldades persistentes",
    explanation: `${t.incorrectToIncorrect} participante(s) permanecem com resposta incorreta nas duas observações comparáveis.`,
    nextStep: "Escolha um material pertinente, conduza nova explicação e registre outra verificação.",
  };
  if (t.correctToIncorrect > 0) return {
    kind: "INVESTIGATE", title: "Investigar oscilações de resposta",
    explanation: `${t.correctToIncorrect} participante(s) passaram de acerto para erro na segunda observação.`,
    nextStep: "Retome o conceito e obtenha novas evidências antes de concluir aprendizagem.",
  };
  if (t.incorrectToCorrect > 0) return {
    kind: "PROGRESS", title: "Melhora observada nesta verificação",
    explanation: `${t.incorrectToCorrect} participante(s) passaram de erro a acerto neste instrumento.`,
    nextStep: "Confirme a transferência em outra situação, sem atribuir domínio consolidado automaticamente.",
  };
  return {
    kind: "MAINTAIN", title: "Resultados estáveis neste instrumento",
    explanation: "Não houve transições de erro para acerto nem de acerto para erro entre as respostas comparáveis.",
    nextStep: "Considere uma questão de aplicação distinta para confirmar o entendimento.",
  };
}
