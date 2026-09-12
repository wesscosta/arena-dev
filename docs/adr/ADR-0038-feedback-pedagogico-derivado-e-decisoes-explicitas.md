# ADR-0038 — Feedback pedagógico derivado e decisões explícitas

**Status:** Aceito  
**Data:** 11/09/2026

## Contexto

Depois de `LOCKED`, o professor já possui distribuição agregada e resposta correta na projeção privada do Quiz. O sistema precisa apoiar decisão pedagógica sem criar nova verdade persistida e sem conduzir a aula sozinho.

## Decisão

O feedback será um read model derivado no frontend a partir de `QuizState` do professor: acertos, erros, taxa de acerto e distratores por incidência.

Nenhuma tabela, entidade JPA ou migration será criada.

As ações `Continuar`, `Reexplicar`, `Refazer questão` e `Abrir discussão` exigem ação explícita do professor.

`Continuar` pode chamar `nextLiveFlow`, mas somente por clique. `Refazer questão` prepara uma nova rodada em `READY`, sem abri-la. `Reexplicar` reutiliza explicação autorada. `Abrir discussão` é orientação local e não cria runtime.

## Privacidade e consequências

O cálculo usa apenas dados agregados da projeção privada do professor. Nenhuma identidade de aluno é necessária. `/join` e Projetor não recebem novos dados privados.

Flyway permanece em V16 e não existe `QuizAnalytics`.

Complementa ADR-0033, ADR-0036 e ADR-0037.
