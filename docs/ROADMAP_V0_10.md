# Arena Dev v0.10 — Learning Loop

**Baseline imutável:** v0.9.0 (Flyway V48). **Linha de trabalho:** `feat/v0.10-learning-loop`.
**North Star:** sessão → diagnóstico → intervenção docente → nova verificação → leitura da evolução.

## Guardrails

- Arena é o runtime da aula; Jornada é estudo sequencial; Atividades são entregas; Biblioteca é material reutilizável.
- Não reabrir a v0.9, não introduzir IA obrigatória, nem apagar as ferramentas legadas antes do cutover operacional.
- Resultados, respostas, avaliações e evidências são observações. Nenhum deles representa automaticamente mastery.
- O campo `learning_evidence.confidence` mede confiança da interpretação da evidência; autopercepção do estudante requer estrutura própria (`LearnerConfidence`).
- Diagnóstico e verificação posterior são `InteractionRun`s diferentes, nunca revisões da mesma `InteractionResponse`.
- Alterações em funcionalidades ao vivo exigem teacher/student/projector, acessibilidade, reconexão, concorrência e idempotência testadas.

## Sequência de entregas / critérios de aceite

| Etapa | Entrega | Critério de aceite |
| --- | --- | --- |
| 10.0 | Baseline e documentação | Plano, ADRs, release gates, shadow/cutover preservados |
| 10.1 | `LearningCycle` | Vínculo persistente baseline → intervenção → followup; mesma sessão/alvo/definição, transições válidas, testes de domínio e integração |
| 10.2 | Confiança do estudante | `LearnerConfidence` separado de `EvidenceConfidence`, autoria/tempo e opção de não responder; acessibilidade |
| 10.3 | Before & After | Comando simples na Arena, reapresentação após intervenção, comparação de resultados com denominadores claros e participação parcial |
| 10.4 | Peer Instruction | Primeira votação individual → discussão em pares → segunda execução, sem expor identidades ao grupo |
| 10.5 | Result Actions / Group by Response | Ações contextuais de resultado reutilizando serviços de grupos existentes, sem duplicação de modelo |
| 10.6 | Error Clinic | Distratores e distribuições verificáveis; síntese orientada pelo docente, sem diagnóstico de concepções automatizado sem lastro |
| 10.7 | Collective Target | Meta contextual à aprendizagem, não pontos/XP intercambiáveis |
| 10.8 | Recovery | Nova intervenção e verificação com vínculo explícito de ciclo, sem inferir mastery |
| 10.9 | Painel de evolução | Before/after, amostras, ausências, evolução por objetivo, com dados observados e explicação metodológica |
| 10.10 | Mastery readiness | Agregados descritivos; formalizar dependências para Knowledge Taxonomy, banco de questões, assessment blueprint e política de retenção |

## Primeira fatia em implementação: 10.1

- V49 `learning_intervention_cycles`: sessão, objetivo, execução diagnóstica, nota de intervenção, execução posterior e estado.
- API inicial para diagnóstico, intervenção e verificação.
- Requisitos pendentes antes de declarar a etapa concluída: autorização docente verificada end-to-end; integração real Flyway/Postgres; proteção transacional de concorrência; integração com o fluxo professor/aluno/projetor; métricas e UX.

## Riscos e dependências

1. **Cutover v0.9:** continuar avaliando `/api/learning-core/gate/cutover`; não antecipar migração de Quiz/Poll/Word Cloud sem amostra operacional.
2. **Identidade longitudinal:** evidências vinculadas a `session_participants` podem desaparecer por cascata. Projetar retenção e persistência por estudante antes de MasteryProjection.
3. **Taxonomia:** `LearningTarget` básico existe, mas não substitui o desenho de Knowledge Taxonomy 17.1.
4. **Questões e blueprint:** v0.11+ até amadurecer 17.3–17.4; não atribuir domínio global a uma resposta correta isolada.
5. **Frontend:** `ArenaApp.tsx` é hotspot; extrair componentes/serviços por fatia, sem big bang.
6. **Operação:** autorizações, proteção contra IDOR, monitoramento, p95 de ações ao vivo, migrações aditivas, rollback e testes E2E devem anteceder o release.

## Definition of Done da v0.10

Fluxo real professor → interação inicial → interpretação → intervenção → segunda interação → resultado comparável funciona em desktop/mobile, modo claro/escuro, com reconexão, acessibilidade revisada, testes CI/integração/E2E verdes, documentação atualizada, migrações auditadas, segurança de papéis e release gate registrado. Sem essas evidências, não publicar nem congelar v0.10.
