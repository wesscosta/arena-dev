# Arena Dev v0.11 — execução e evidências

**Base de trabalho:** `v0.10.0` publicada; branch `feat/v0.11-audit-contract-freeze`. **Estado:** etapa **11.0 em auditoria/contratos**. Nenhuma funcionalidade de apresentação de material da v0.11 foi implementada nesta etapa.

## 11.0 — itens entregues para revisão

- [Auditoria por persona e tela](11.0_AUDITORIA_PERSONAS_TELAS.md): rotas, tarefas, estados e cobertura versus lacunas de homologação.
- [Matriz de autorização e ameaças](11.0_PERMISSOES_AMENACAS.md): risco de exposição por código, revogação, CAS, segurança e testes negativos.
- [Contrato proposto do projetor v1](11.0_CONTRATOS_PROJECAO.md): snapshot imutável, palco único, eventos versionados, HTTP, WebSocket, sincronização e retorno seguro.
- [Plano de execução e gates](11.0_PLANO_GATES.md): sequência 11.1–11.6, condições de aceite e riscos residuais.
- [Evidências verificadas da etapa](11.0_EVIDENCIAS.md): comandos e resultados, limites do teste e pendências.
- [ADR-0067](../adr/ADR-0067-material-presentation-v011.md): escolha arquitetural proposta, ainda sujeita à revisão.

## 11.1 — backend de publicação segura

- [Execução 11.1](11.1_EXECUTION_STATUS.md): Flyway V57, snapshot por publicação, endpoints docentes/publicação projetor, LiveStage versionado, revogação e testes de segurança/concorrência.
- **Status:** código implementado em branch filha e aguardando CI/revisão; nenhuma interface nova de projetor foi entregue.

## Disciplina de status

**Decisão de produto/contrato ≠ API funcionando.** A arquitetura e o escopo de 11.0 são uma especificação verificável do que implementar em 11.1, não uma prova de que endpoints de publicação, persistência ou projetor já existam. Inspeção de código não equivale a teste manual de UI/UX, WCAG ou iOS. A release v0.10 publicada não deve ser reaberta para inserir recursos v0.11.

## Gates subsequentes

11.1 publicação/autorização/versionamento; 11.2 renderização docente/projetor; 11.3 sincronização/reconexão; 11.4 auditoria/ajustes UX; 11.5 descoberta editorial; 11.6 homologação. Cada fatia deve registrar SHA, testes e bloqueadores antes da próxima.
