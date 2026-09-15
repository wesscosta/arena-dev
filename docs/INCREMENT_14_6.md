# Incremento 14.6 — AI-assisted grading

## Objetivo

Adicionar correção assistida por IA sem transferir a autoridade de avaliação para o modelo.

## Princípio

```text
entrega + rubrica
      ↓
IA sugere
      ↓
rascunho separado
      ↓
professor revisa / edita / aplica
      ↓
avaliação estruturada
```

A IA nunca:

- conclui a correção automaticamente;
- publica feedback ao aluno;
- cria XP;
- altera `ScoreEvent`;
- decide autoria, plágio ou uso de IA.

## Persistência

`V22__ai_assessment_suggestions.sql` cria:

- `ai_assessment_suggestions`;
- `ai_assessment_criterion_suggestions`;
- vínculo opcional `assessment_criteria.applied_ai_suggestion_id` para provenance.

Cada nova análise é preservada; reanalisar cria uma nova sugestão, sem apagar as anteriores.

## Provider

O domínio depende de `AssessmentAiProvider`. O primeiro adapter é `OpenAiAssessmentProvider`, configurado por ambiente:

```env
ARENA_AI_API_KEY=
ARENA_AI_MODEL=gpt-5.6-luna
ARENA_AI_BASE_URL=https://api.openai.com/v1
```

Sem `ARENA_AI_API_KEY`, a correção manual continua funcionando e somente o comando de IA responde como indisponível.

## Privacidade do prompt

O prompt operacional não inclui nome, matrícula ou nome público do aluno. Ele envia:

- título da atividade;
- itens entregues;
- contexto/resultado esperado das questões quando aplicável;
- snapshot da rubrica.

## Supervisão

A interface diferencia explicitamente `RASCUNHO DA IA`.

O professor pode:

- gerar sugestão;
- reanalisar;
- examinar pontuação, justificativa, evidência e confiança por critério;
- aplicar a sugestão ao rascunho da rubrica;
- editar livremente depois da aplicação;
- concluir a correção apenas pelo fluxo normal do 14.5.

Aplicar uma sugestão mantém a entrega em `UNDER_REVIEW`.

## Endpoints

```http
POST /api/activities/{activityId}/submissions/{submissionId}/assessment/ai-suggestions
GET  /api/activities/{activityId}/submissions/{submissionId}/assessment/ai-suggestions/latest
POST /api/activities/{activityId}/submissions/{submissionId}/assessment/ai-suggestions/{suggestionId}/apply
```

## Fora deste incremento

- publicação do feedback ao aluno (14.7);
- correção em lote (14.8);
- detecção de IA/plágio;
- Teams/Classroom sync.
