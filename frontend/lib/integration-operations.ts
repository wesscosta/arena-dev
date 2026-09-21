export type IntegrationOperationInput = {
  connectionActive: boolean;
  linkedClassrooms: number;
  classroomInspected: boolean;
  pendingStudentMatches: number | null;
  unmappedActivities: number | null;
  deliveredSubmissions: number | null;
  importedSubmissions: number | null;
};

export type IntegrationOperationState = {
  stage: "CONNECTION" | "CLASSROOMS" | "STUDENTS" | "ACTIVITIES" | "SUBMISSIONS" | "HEALTHY";
  title: string;
  detail: string;
  targetId: string;
};

export function deriveIntegrationOperationState(input: IntegrationOperationInput): IntegrationOperationState {
  if (!input.connectionActive) return {
    stage: "CONNECTION",
    title: "Conecte sua conta Microsoft 365",
    detail: "A conexão precisa estar ativa antes de buscar turmas e alunos.",
    targetId: "integration-connection",
  };
  if (input.linkedClassrooms === 0) return {
    stage: "CLASSROOMS",
    title: "Vincule uma turma do Teams",
    detail: "Busque as turmas disponíveis e associe uma delas a uma turma existente do Arena.",
    targetId: "integration-classrooms",
  };
  if (!input.classroomInspected) return {
    stage: "CLASSROOMS",
    title: "Escolha uma turma vinculada",
    detail: "Abra uma turma para conferir alunos, atividades e entregas.",
    targetId: "integration-linked-classrooms",
  };
  if ((input.pendingStudentMatches ?? 0) > 0) return {
    stage: "STUDENTS",
    title: "Revise os vínculos de alunos",
    detail: `${input.pendingStudentMatches} aluno(s) ainda precisam de confirmação ou tratamento.`,
    targetId: "integration-students",
  };
  if ((input.unmappedActivities ?? 0) > 0) return {
    stage: "ACTIVITIES",
    title: "Mapeie as atividades pendentes",
    detail: `${input.unmappedActivities} tarefa(s) do Teams ainda não estão ligadas a atividades do Arena.`,
    targetId: "integration-activities",
  };
  if (input.deliveredSubmissions != null && input.importedSubmissions != null && input.deliveredSubmissions > input.importedSubmissions) return {
    stage: "SUBMISSIONS",
    title: "Importe as entregas disponíveis",
    detail: `${input.deliveredSubmissions - input.importedSubmissions} entrega(s) já chegaram no Teams e ainda não foram importadas.`,
    targetId: "integration-submissions",
  };
  return {
    stage: "HEALTHY",
    title: "Integração operacional",
    detail: "Não há pendências evidentes na turma selecionada.",
    targetId: "integration-linked-classrooms",
  };
}
