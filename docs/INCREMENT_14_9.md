# Incremento 14.9 — Evidências de processo e integridade

## Objetivo

Oferecer sinais objetivos para orientar a revisão do professor sem transformar o Arena Dev em detector de IA, plágio ou autoria.

## Evidências registradas

- salvamentos de itens no servidor;
- evento explícito de colagem, registrando apenas quantidade de caracteres;
- envio da atividade;
- tempo entre início e envio;
- tentativa da submissão;
- similaridade textual determinística entre entregas da mesma atividade.

## Privacidade por desenho

O sistema não registra teclas digitadas e não armazena o conteúdo da área de transferência como telemetria.

## Interpretação

O backend produz apenas recomendação de revisão:

- `LOW`
- `MEDIUM`
- `HIGH`

Isso não representa probabilidade de fraude. Similaridade também não equivale automaticamente a plágio.

## Persistência

V24 cria `submission_process_events`.

Tipos iniciais:

- `ITEM_SAVED`
- `PASTE`
- `SUBMITTED`

## Próximo

14.10 — Preparação para integração Teams.
