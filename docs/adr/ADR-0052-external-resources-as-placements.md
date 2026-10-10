# ADR-0052 — Material externo é recurso reutilizável, não novo motor pedagógico

**Estado:** Aceito para planejamento da v0.10 — 08/10/2026. **Experimento de incorporação:** condicionado a prova de valor.

## Problema

Biblioteca tem `LINK` e `sourceUrl`; Jornada já abre recursos externos. Adicionar Canva e HTML como renderizadores gera risco de inflar UI, ampliar superfície de ataque e sinalizar falsamente progresso/integração.

## Decisão

Manter `LearningResource` como fonte de verdade. No MVP, permitir **uso contextual do link** em roteiro/Arena/Jornada com retorno preservado e associação pedagógica opcional. Executar piloto de iframe somente para origem publicada/permitida, URL https, fallback explícito, CSP, sandbox, acessibilidade e ausência de acesso às credenciais internas; implantação por flag após ganho operacional demonstrado em casos de aula. Não aceitar HTML/JS arbitrário, blobs/arquivos executáveis, scripts embed completos copiados no app ou resultado de simulador como evidence sem contrato específico.

## Consequências

Nenhum enum/formato novo obrigatório para o MVP; metadados e placement podem evoluir aditivamente. Link externo continua funcionando caso iframe seja impossível por políticas do fornecedor. Preview incorporado não implica conclusão, avaliação ou atividade entregue. Protocolos de integração (ex.: LTI) e hospedagem isolada ficam para roadmaps posteriores.
