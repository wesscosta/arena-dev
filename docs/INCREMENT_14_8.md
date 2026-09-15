# Incremento 14.8 — Correção em lote e triagem

## Objetivo
Reduzir o custo operacional do professor ao trabalhar com muitas entregas sem retirar a supervisão humana.

## Entregas
- fila priorizada: `SUBMITTED` antes de `UNDER_REVIEW`;
- ação `Corrigir próxima`;
- seleção de até 20 entregas;
- preparação em lote de sugestões da IA;
- falha isolada por submissão sem abortar todo o lote.

## Segurança pedagógica
A ação em lote **não aplica pontuação**, **não conclui correção**, **não publica feedback** e **não gera XP**. Ela apenas prepara `AiAssessmentSuggestion` para revisão do professor.

## API
- `GET /api/activities/{activityId}/assessment/batch/queue`
- `POST /api/activities/{activityId}/assessment/batch/ai-suggestions`

## Persistência
Sem V24: a fila é derivada das fontes de verdade já existentes.

## Próximo
14.9 — Evidências de processo e integridade.
