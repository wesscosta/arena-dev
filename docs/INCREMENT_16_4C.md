# Incremento 16.4C — Journey Discovery & Redemption

**Status:** implementado tecnicamente em 28/09/2026; validação visual manual pendente.

## Objetivo

Permitir que um aluno com identidade leve já reconhecida no dispositivo adicione uma Jornada ao próprio espaço de estudo usando um código compartilhado pelo professor. O código estabelece o vínculo uma única vez; não autentica acessos futuros.

## Modelo

- `JourneyRedemptionCode`: código opcional, regenerável e desativável de uma Jornada publicada.
- `StudentJourneyAccess`: vínculo persistente `Student ↔ Journey` criado pelo resgate.
- `StudentJourneyStageProgress`: progresso do vínculo por código, separado de `Enrollment`.
- o caminho institucional `Enrollment → JourneyStageProgress` permanece intacto.
- quando ambos existem e a turma está liberada, o acesso institucional tem precedência para preservar o progresso existente.
- a listagem deduplica a mesma Jornada, evitando cards duplicados.

## Regras

O código só pode ser gerado para Jornada publicada. Nesta primeira versão, Jornadas cuja conclusão depende de `ActivitySubmission` não podem ser distribuídas por código, pois submissões continuam pertencendo à matrícula. Jornadas de conteúdo/progresso manual são compatíveis.

Regenerar ou desativar o código afeta apenas novos resgates. Acessos e progressos já adquiridos permanecem.

## UX

Professor: na Jornada publicada, bloco **Acesso por código** com gerar, regenerar, desativar e contagem de resgates.

Aluno: em **Jornadas**, ação **+ Adicionar com código**. Após resgatar, o material passa a aparecer no espaço de estudo sem exigir novamente o código.

## Limite atual de identidade

O resgate usa o `StudyPrincipal` derivado de um device claim já existente. Portanto, o aluno não precisa de conta tradicional, mas o dispositivo precisa ter sido reconhecido previamente pelo fluxo atual. Portabilidade/recuperação de perfil entre dispositivos não faz parte deste incremento.

## Fechamento do ciclo

Integrado ao checkpoint do Student Experience em 28/09/2026. Discovery/redemption não substitui matrícula, autorização nem o fluxo público `/join`. Ver [`CLOSURE_16_4_STUDENT_EXPERIENCE.md`](CLOSURE_16_4_STUDENT_EXPERIENCE.md).
