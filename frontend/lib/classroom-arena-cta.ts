export type ClassroomArenaCtaTone = "start" | "resume" | "disabled";

export type ClassroomArenaCta = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  supportingLabel: string;
  disabled: boolean;
  live: boolean;
  tone: ClassroomArenaCtaTone;
  icon: string;
};

export function classroomArenaCtaState(
  classroomActive: boolean,
  sessionTitle?: string | null,
): ClassroomArenaCta {
  if (!classroomActive) {
    return {
      eyebrow: "ARENA INDISPONÍVEL",
      title: "Reative a turma para iniciar uma sessão",
      description: "O histórico continua disponível, mas novas sessões ficam bloqueadas enquanto a turma estiver inativa.",
      buttonLabel: "Arena indisponível",
      supportingLabel: "Reative a turma para voltar a iniciar aulas.",
      disabled: true,
      live: false,
      tone: "disabled",
      icon: "•",
    };
  }

  if (sessionTitle) {
    return {
      eyebrow: "SESSÃO EM ANDAMENTO",
      title: sessionTitle,
      description: "Retome a condução da sessão exatamente do ponto em que ela está.",
      buttonLabel: "Continuar Arena",
      supportingLabel: "Retomar a sessão atual",
      disabled: false,
      live: true,
      tone: "resume",
      icon: "↗",
    };
  }

  return {
    eyebrow: "PRONTO PARA A AULA",
    title: "Iniciar uma nova Arena",
    description: "Abra a sessão ao vivo para usar sorteio, Timer, Nuvem de Palavras, Buzzer e demais dinâmicas.",
    buttonLabel: "Iniciar Arena",
    supportingLabel: "Criar uma nova sessão agora",
    disabled: false,
    live: false,
    tone: "start",
    icon: "▶",
  };
}
