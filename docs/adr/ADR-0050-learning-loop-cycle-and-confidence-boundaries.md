# ADR-0050 — LearningCycle e fronteiras de confiança

**Estado:** Aceito para a fundação v0.10 (08/10/2026).

## Contexto

A v0.9 produz `LearningEvidence` por execução de interação, mas `repeat` não liga semanticamente uma tentativa anterior, a intervenção docente e a verificação posterior. `learning_evidence.confidence` já designa a confiança na interpretação da evidência, e não a percepção do aluno.

## Decisão

Adicionar `LearningCycle` como agregado próprio, com `LearningTarget`, `baselineRun`, intervenção contextual e `followupRun`; ciclo inicialmente `DIAGNOSED`, então `INTERVENED`, então `VERIFIED`. As execuções devem ser distintas, da mesma definição e sessão. A nota de intervenção é obrigatória antes da verificação. Manter evidence, evaluation e response intocados. Futuramente coletar `LearnerConfidence` como fato autodeclarado específico, nunca reaproveitar a coluna `learning_evidence.confidence`.

## Consequências

- V49 é aditiva; não depende do cutover da v0.9.
- API do ciclo e primeiros testes de domínio são apenas a infraestrutura; não indicam fluxo pedagógico E2E concluído.
- Testes de integração, isolamento multiusuário, reentrância, concorrência, segurança e evolução das interfaces precedem publicação.
- MasteryProjection requer outra ADR, política de evidência longitudinal, taxonomia e blueprint.
