/** Textos da ordem individual das alternativas, usados no formulário, na lista e na revisão. */
export const INDIVIDUAL_ORDER_SECTION = "Ordem individual das alternativas";
export const INDIVIDUAL_OPTION_ORDER_LABEL = "Embaralhar alternativas para cada aluno";
export const INDIVIDUAL_QUESTION_ORDER_LABEL = "Embaralhar também a ordem das questões";
export const INDIVIDUAL_ORDER_HELP =
  "Cada aluno vê as alternativas em ordem diferente, fixa durante a tentativa. A correção não muda. Isso dificulta a cola por letra, mas não impede que um aluno leia a alternativa para outro.";
export const INDIVIDUAL_ORDER_LOCKED = "Bloqueado: um aluno já iniciou esta atividade.";

export function individualOrderLabel(withQuestions?: boolean): string {
  return withQuestions ? "Ordem individual + questões" : "Ordem individual";
}
