# Incremento 14.7 — Feedback individual

## Objetivo

Fechar o ciclo de devolutiva individual com separação explícita entre:

- anotação privada do professor;
- sugestão de IA;
- rascunho de feedback;
- feedback publicado ao aluno.

## Regras

1. `teacherNotes` continua privado.
2. Sugestão da IA nunca é publicada automaticamente.
3. O professor pode usar a sugestão mais recente da IA apenas como ponto de partida.
4. Publicação exige correção concluída (`GRADED` ou `RETURNED`).
5. O aluno recebe somente `publishedFeedback`.
6. O rascunho permanece invisível ao aluno.
7. Nota e XP continuam independentes.

## Persistência

A V23 adiciona em `submission_assessments`:

- `feedback_draft`
- `published_feedback`
- `feedback_published_at`

## Professor

Rotas:

- `GET /api/activities/{activityId}/submissions/{submissionId}/assessment/feedback`
- `PUT /api/activities/{activityId}/submissions/{submissionId}/assessment/feedback/draft`
- `POST /api/activities/{activityId}/submissions/{submissionId}/assessment/feedback/from-ai`
- `POST /api/activities/{activityId}/submissions/{submissionId}/assessment/feedback/publish`

## Aluno

`ParticipantSubmissionController` expõe somente o feedback já publicado e o horário de publicação no cartão da atividade.

## Próximo

14.8 — Correção em lote / triagem.
