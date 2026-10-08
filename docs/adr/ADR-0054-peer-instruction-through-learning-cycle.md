# ADR-0054 — Peer Instruction como estratégia do LearningCycle

**Data:** 08/10/2026 · **Estado:** aceita para a branch de implementação v0.10 · **Escopo:** P1-A.

## Contexto

Arena Dev já possui `LearningCycle`, `InteractionDefinition`, `InteractionRun`, `LearningEvidence` e a ferramenta de grupos. Criar um motor próprio de Peer Instruction duplicaria avaliação, respostas, permissões e comparações, além de fragilizar o futuro reuso de objetivos na Jornada e em Concursos.

## Decisão

- **V51 aditiva** introduz `intervention_type` (`EXPLANATION` ou `PEER_DISCUSSION`) sobre o ciclo. Linhas anteriores `INTERVENED`/`VERIFIED` migram para `EXPLANATION`; `DIAGNOSED` mantém valor nulo até intervenção. Não há nova cópia de questões, respostas, provas ou resultados.
- `PEER_DISCUSSION` somente é válida quando a primeira verificação está **encerrada, avaliada, com pelo menos duas respostas individuais** e **sem correção revelada ao estudante**. A modalidade é uma escolha explícita do professor, nunca inferida por IA a partir de agrupamento ou clique.
- O professor conduz a discussão em pares (a ferramenta de grupos é opcional) e registra o que foi realizado. Uma nova aplicação da mesma `InteractionDefinition` gera novo `InteractionRun`. A comparação usa pares válidos de alunos e dados originais. O gabarito só pode ser revelado após o momento de discussão/rechecagem.
- A interface desabilita o modo quando os pré-requisitos conhecidos não são satisfeitos e apresenta instruções claras para responder → bloquear → **encerrar sem revelar** → discutir → reabrir → comparar.
- O baseline pode conter respostas incorretas: não existe punição, exposição nominal nem XP concedido automaticamente. O cálculo de variação imediata não comprova domínio longitudinal nem fornece aprovação em concurso.
- Uma aula de um aluno pode usar explicação/revisão, mas não deve ser classificada como discussão em pares. O segundo participante precisa ter enviado sua resposta à aplicação inicial.

## Contratos

`POST /api/sessions/{sessionId}/learning-cycles/{cycleId}/intervention` recebe `{ "note": "...", "type": "PEER_DISCUSSION" }`. Tipo omitido continua equivalente a `EXPLANATION` para compatibilidade. A projeção docente `CycleView` informa `interventionType`, `baselineResultsRevealed`, `baselineResponseCount`. Projeções públicas de aluno/projetor não expõem respostas individuais de colegas.

## Limites e riscos remanescentes

- Auditoria de autoria/revisão da intervenção, temporização de debate e validação de efetiva colaboração em sala ainda exigem pilotos docentes; não inferir que haver duas respostas garante discussão pedagógica de qualidade.
- Mesmo havendo dois respondentes, a plataforma não prova quem discutiu com quem: `Groups` é uma ferramenta docente reutilizável, não evidência automática de colaboração.
- Persistência de evidência continua vinculada ao contexto da sessão; não conceder mastery nem trazer rankings para esta prática.
- Mantida a fronteira de segurança de conta docente única por instalação definida em ADR-0053.
