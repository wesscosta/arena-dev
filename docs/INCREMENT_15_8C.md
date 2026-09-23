# Incremento 15.8C — Failure Drill-down & Operational Refresh

## Objetivo

Transformar a telemetria dos incrementos 15.8A/15.8B em informação operacional
útil para o professor.

## Entregas

- histórico das execuções recentes;
- status, direção e horário de cada execução;
- contadores de itens processados, concluídos, falhos e ignorados;
- expansão de execuções com `errorSummary`;
- detalhamento dos `SyncItem` que falharam;
- atualização manual da observabilidade;
- atualização automática após operações Microsoft instrumentadas;
- carregamento da observabilidade desacoplado do carregamento das turmas.

## Regra de UX

A visão principal continua resumida. O detalhe técnico só aparece quando o usuário
abre o histórico ou uma execução.

## Escopo

Nenhum endpoint novo foi necessário. O contrato do 15.8A já fornece `executions`
e `failures`.

## Próximo incremento

15.9 — Hardening, E2E e Release Gate da v0.7.
