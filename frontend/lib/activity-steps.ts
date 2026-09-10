import type {
  ActivityQuestion,
  ActivityStep,
  ActivityStepType,
  PollOption,
} from "./types";

export const ACTIVITY_STEP_LABEL: Record<ActivityStepType, string> = {
  SLIDE: "Slide",
  QUESTION: "Questão",
  WORD_CLOUD: "Nuvem de Palavras",
  POLL: "Votação",
};

export const ACTIVITY_STEP_DESCRIPTION: Record<ActivityStepType, string> = {
  SLIDE: "Conteúdo expositivo para o projetor.",
  QUESTION: "Questão avaliativa já cadastrada na atividade.",
  WORD_CLOUD: "Coleta aberta de palavras ou expressões da turma.",
  POLL: "Votação diagnóstica ou de opinião, sem XP.",
};

export function createActivityStep(
  type: ActivityStepType,
  questions: ActivityQuestion[] = [],
): ActivityStep {
  if (type === "SLIDE") {
    return { position: 0, type, title: "Novo slide", slideContent: "" };
  }

  if (type === "QUESTION") {
    return {
      position: 0,
      type,
      title: "Questão",
      questionId: questions[0]?.id,
    };
  }

  if (type === "WORD_CLOUD") {
    return {
      position: 0,
      type,
      title: "Nuvem de Palavras",
      wordCloud: {
        prompt: "",
        maxWordsPerParticipant: 1,
        liveReveal: false,
      },
    };
  }

  return {
    position: 0,
    type: "POLL",
    title: "Votação",
    poll: {
      prompt: "",
      liveResults: false,
      options: [
        { id: "A", text: "" },
        { id: "B", text: "" },
      ],
    },
  };
}

export function normalizeActivityStepPositions(steps: ActivityStep[]): ActivityStep[] {
  return steps.map((step, position) => ({ ...step, position }));
}

export function moveActivityStep(
  steps: ActivityStep[],
  index: number,
  direction: -1 | 1,
): ActivityStep[] {
  const target = index + direction;
  if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) {
    return normalizeActivityStepPositions(steps);
  }

  const next = [...steps];
  [next[index], next[target]] = [next[target], next[index]];
  return normalizeActivityStepPositions(next);
}

export function nextPollOptionId(options: PollOption[]): string {
  const used = new Set(options.map((option) => option.id));
  for (const candidate of "ABCDEFGH") {
    if (!used.has(candidate)) return candidate;
  }
  return `OPT-${options.length + 1}`;
}

export function validateActivitySteps(
  steps: ActivityStep[],
  questions: ActivityQuestion[],
): string[] {
  const errors: string[] = [];
  const questionIds = new Set(questions.map((question) => question.id));

  if (steps.length > 100) {
    errors.push("O roteiro pode possuir no máximo 100 blocos.");
  }

  steps.forEach((step, index) => {
    const label = `Bloco ${index + 1}`;

    if (step.title && step.title.trim().length > 180) {
      errors.push(`${label}: o título excede 180 caracteres.`);
    }

    if (step.instructions && step.instructions.trim().length > 2000) {
      errors.push(`${label}: as instruções excedem 2000 caracteres.`);
    }

    if (step.type === "SLIDE" && !step.slideContent?.trim()) {
      errors.push(`${label}: informe o conteúdo do slide.`);
    }

    if (step.type === "QUESTION") {
      if (!step.questionId) {
        errors.push(`${label}: selecione uma questão.`);
      } else if (!questionIds.has(step.questionId)) {
        errors.push(`${label}: a questão selecionada não pertence à atividade.`);
      }
    }

    if (step.type === "WORD_CLOUD") {
      const config = step.wordCloud;
      if (!config?.prompt.trim()) {
        errors.push(`${label}: informe a pergunta da Nuvem de Palavras.`);
      } else if (config.prompt.trim().length > 280) {
        errors.push(`${label}: a pergunta da Nuvem excede 280 caracteres.`);
      }

      if (
        !config
        || config.maxWordsPerParticipant < 1
        || config.maxWordsPerParticipant > 5
      ) {
        errors.push(`${label}: o máximo de palavras deve ficar entre 1 e 5.`);
      }
    }

    if (step.type === "POLL") {
      const config = step.poll;
      if (!config?.prompt.trim()) {
        errors.push(`${label}: informe a pergunta da votação.`);
      } else if (config.prompt.trim().length > 280) {
        errors.push(`${label}: a pergunta da votação excede 280 caracteres.`);
      }

      const options = config?.options ?? [];
      if (options.length < 2 || options.length > 6) {
        errors.push(`${label}: a votação precisa possuir entre 2 e 6 opções.`);
      }

      const ids = new Set<string>();
      options.forEach((option, optionIndex) => {
        if (!option.id.trim() || !option.text.trim()) {
          errors.push(`${label}: preencha a opção ${optionIndex + 1}.`);
          return;
        }
        if (option.text.trim().length > 160) {
          errors.push(`${label}: a opção ${optionIndex + 1} excede 160 caracteres.`);
        }
        if (ids.has(option.id.trim())) {
          errors.push(`${label}: os IDs das opções precisam ser únicos.`);
        }
        ids.add(option.id.trim());
      });
    }
  });

  return [...new Set(errors)];
}
