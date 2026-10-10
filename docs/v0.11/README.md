# Arena Dev v0.11 — execução e evidências

**Base de trabalho:** `v0.10.0` publicada; branch `feat/v0.11-audit-contract-freeze`. **Estado:** etapa **11.0 em auditoria/contratos**. Nenhuma funcionalidade de apresentação de material da v0.11 foi implementada nesta etapa.

## 11.0 — itens entregues para revisão

- [Auditoria por persona e tela](11.0_AUDITORIA_PERSONAS_TELAS.md): rotas, tarefas, estados e cobertura versus lacunas de homologação.
- [Matriz de autorização e ameaças](11.0_PERMISSOES_AMENACAS.md): risco de exposição por código, revogação, CAS, segurança e testes negativos.
- [Contrato proposto do projetor v1](11.0_CONTRATOS_PROJECAO.md): snapshot imutável, palco único, eventos versionados, HTTP, WebSocket, sincronização e retorno seguro.
- [Plano de execução e gates](11.0_PLANO_GATES.md): sequência 11.1–11.6, condições de aceite e riscos residuais.
- [Evidências verificadas da etapa](11.0_EVIDENCIAS.md): comandos e resultados, limites do teste e pendências.
- [ADR-0067](../adr/ADR-0067-material-presentation-v011.md): contrato arquitetural aceito para o backend 11.1; decisões de sincronização futura ainda sujeitas à 11.3.

## 11.1 — backend de publicação segura

- [Execução 11.1](11.1_EXECUTION_STATUS.md): Flyway V57, snapshot por publicação, endpoints docentes/publicação projetor, LiveStage versionado, revogação e testes de segurança/concorrência.
- **Status:** PR #39 integrado à `main` após três jobs de CI aprovados. O snapshot e a revogação são baseline para 11.2.

## 11.2 — leitura pública segura e controles de apresentação

- [Execução 11.2](11.2_EXECUTION_STATUS.md): comando explícito no modal docente, renderização segura de Markdown/Notion no projetor, leitura por código de sessão e rolagem responsiva.
- **Status:** [PR #40](https://github.com/wesscosta/arena-dev/pull/40) integrado à main, com três jobs de CI aprovados no SHA ceb60cd. [Validação e limites](11.2_VALIDATION_CLOSURE_2026-10-10.md). A navegação sincronizada por anchorId pertence à 11.3.

## 11.3 — navegação sincronizada e recuperação de estado

- [Execução 11.3](11.3_EXECUTION_STATUS.md): V58 para idempotência, âncora validada contra snapshot, comando docente CAS, estágio versionado e reconciliação de eventos/reload.
- **Estado:** implementação na branch `feat/v0.11-material-section-sync`; integração condicionada ao CI backend, frontend e Playwright completo. A release v0.11 ainda não está homologada.

## Disciplina de status

**Decisão de produto/contrato ≠ API funcionando.** A arquitetura e o escopo de 11.0 são uma especificação verificável do que implementar em 11.1, não uma prova de que endpoints de publicação, persistência ou projetor já existam. Inspeção de código não equivale a teste manual de UI/UX, WCAG ou iOS. A release v0.10 publicada não deve ser reaberta para inserir recursos v0.11.

## Gates subsequentes

11.1 publicação/autorização/versionamento; 11.2 renderização docente/projetor; 11.3 sincronização/reconexão; 11.4 auditoria/ajustes UX; 11.5 descoberta editorial; 11.6 homologação. Cada fatia deve registrar SHA, testes e bloqueadores antes da próxima.
