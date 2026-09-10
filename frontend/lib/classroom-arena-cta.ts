export type ClassroomArenaCta = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  disabled: boolean;
  live: boolean;
};

export function classroomArenaCtaState(
  classroomActive: boolean,
  sessionTitle?: string | null,
): ClassroomArenaCta {
  if (!classroomActive) {
    return {
      eyebrow: "ARENA INDISPONÍVEL",
      title: "Reative a turma para iniciar uma aula",
      description:
        "O histórico continua disponível, mas novas sessões ficam bloqueadas enquanto a turma estiver inativa.",
      buttonLabel: "Arena indisponível",
      disabled: true,
      live: false,
    };
  }

  if (sessionTitle) {
    return {
      eyebrow: "SESSÃO EM ANDAMENTO",
      title: sessionTitle,
      description:
        "Retome a condução da aula exatamente do ponto em que ela está.",
      buttonLabel: "Continuar Arena",
      disabled: false,
      live: true,
    };
  }

  return {
    eyebrow: "PRONTO PARA A AULA",
    title: "Iniciar uma nova Arena",
    description:
      "Abra a sessão ao vivo para usar sorteio, Timer, Nuvem de Palavras, Buzzer e demais dinâmicas.",
    buttonLabel: "Iniciar Arena",
    disabled: false,
    live: false,
  };
}
