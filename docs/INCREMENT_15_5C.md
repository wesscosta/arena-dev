# Incremento 15.5C — Publish Grade & Feedback to Microsoft Teams

## Objetivo

Enviar uma avaliação local já concluída no Arena para a submissão vinculada no
Microsoft Teams, mantendo **escrita** e **liberação ao aluno** como comandos
distintos.

## Permissão

O fluxo exige:

```text
Delegated: EduAssignments.ReadWrite
Application: EduAssignments.ReadWrite.All
```

O OAuth delegado do Arena passa a solicitar `EduAssignments.ReadWrite`.

## PUSH_ASSESSMENT

Pré-condições:

- conexão Microsoft ACTIVE;
- `ExternalSubmissionLink` válido;
- entrega Arena em `GRADED` ou `RETURNED`;
- `SubmissionAssessment` existente;
- todos os critérios com pontuação.

A nota enviada é a soma de `AssessmentCriterion.awardedPoints`.

Para feedback, o Arena usa:

1. `publishedFeedback`;
2. fallback para `feedbackDraft`.

O serviço atualiza:

```text
educationPointsOutcome.points
educationFeedbackOutcome.feedback
```

Ele **não** escreve diretamente em:

```text
publishedPoints
publishedFeedback
```

Essas propriedades pertencem ao fluxo interno de publicação do Graph.

## RETURN_TO_STUDENT

Esta ação é separada de `PUSH_ASSESSMENT`.

Ela executa:

```text
POST /education/classes/{classId}
     /assignments/{assignmentId}
     /submissions/{submissionId}
     /return
```

Somente esse comando torna nota/feedback associados à submissão disponíveis ao
aluno no fluxo do Teams.

## Segurança pedagógica

Nenhuma correção é enviada automaticamente.

O professor precisa acionar explicitamente:

```text
[ Enviar avaliação ao Teams ]
```

e, depois:

```text
[ Devolver ao aluno no Teams ]
```

Assim, corrigir no Arena, sincronizar com o Teams e liberar ao aluno continuam
sendo decisões independentes.

## Próximo passo

Após o 15.5C, o bloco Microsoft de nota/feedback está funcionalmente completo.
O roadmap pode avançar para 15.6 — Google Classroom Adapter, mantendo a
pendência operacional de validar o OAuth Microsoft em um tenant real.
