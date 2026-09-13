# Incremento 13.5 — Feedback pedagógico

**Data:** 11/09/2026  
**Linha:** `v0.5.0 — Live Quiz & Structured Responses`  
**Estado:** concluído localmente; `npm test` 107/107, `typecheck`, `build` e `mvn verify` verdes.

## Objetivo

Transformar o resultado agregado do Quiz em apoio de decisão para o professor, sem criar nova fonte de verdade, sem analytics persistente e sem avançar a aula automaticamente.

## Read model derivado

O feedback é calculado no frontend a partir da projeção privada já entregue ao professor:

```text
QuizState do professor
        ↓
distribution + correctAnswer
        ↓
deriveQuizFeedback()
        ↓
acertos / erros / taxa de acerto / distratores
```

Nenhum novo dado de domínio é persistido. O schema permanece em **Flyway V16**.

## Decisões explícitas

O painel oferece `Continuar`, `Reexplicar`, `Refazer questão` e `Abrir discussão`.

- `Continuar`: encerra a rodada, se necessário, e só avança Live Flow por clique explícito.
- `Reexplicar`: reutiliza `ActivityQuestion.explanation` quando houver.
- `Refazer questão`: cria nova `QuizRound` da mesma questão em `READY`; não abre respostas automaticamente.
- `Abrir discussão`: exibe orientação local baseada no distrator mais frequente.

## Invariantes

`QuizFeedback` é apenas read model derivado. Não existe nova entidade, migration, `QuizAnalytics` ou fonte paralela.

`/join` e Projetor permanecem com as mesmas projeções públicas.

## Testes

`quiz-feedback.test.ts` cobre múltipla escolha, verdadeiro/falso, acertos/erros/taxa e maior distrator.

`quiz-panel.test.ts` garante as quatro decisões, retry sem abertura automática e avanço do Live Flow somente por callback explícito.

## Próximo incremento

**13.6 — Mobile/PWA**.
