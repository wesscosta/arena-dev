# ADR-0044 — SubmissionItem representa entregas polimórficas

**Status:** Aceito

**Data:** 14/09/2026

## Contexto

O `ActivitySubmission` criado no incremento 14.1 representa corretamente o envelope de uma entrega, mas uma atividade do Arena Dev não é necessariamente um Quiz nem um conjunto de respostas estruturadas.

Uma atividade pode solicitar, por exemplo:

- pesquisa;
- texto;
- mapa mental;
- programa;
- código-fonte;
- link;
- arquivo;
- artefato produzido em ferramenta externa;
- uma ou mais respostas de questão.

Modelar a camada seguinte apenas como `SubmissionAnswer` criaria acoplamento indevido ao modelo de questões.

## Decisão

A unidade de conteúdo da entrega será denominada `SubmissionItem`.

Contrato conceitual:

```text
ActivitySubmission
  └── SubmissionItem
       ├── QUESTION_RESPONSE
       ├── TEXT
       ├── LINK
       ├── CODE
       └── FILE / ARTIFACT
```

`QUESTION_RESPONSE` pode referenciar uma `ActivityQuestion`.

Os demais tipos não dependem de `ActivityQuestion`.

Uma mesma entrega poderá conter múltiplos itens de tipos diferentes quando a atividade exigir composição.

## Consequências

- `ActivitySubmission` permanece válido e não exige mudança na V18;
- o 14.2 passa a implementar conteúdo de entrega genérico;
- Quiz Runtime continua separado em `ParticipantAnswer`;
- anexos/arquivos exigirão política de armazenamento própria;
- avaliação e IA deverão avaliar o conjunto de itens da entrega, não apenas respostas de questões.

## Fora desta decisão

- storage definitivo de arquivos;
- limites de upload;
- antivírus;
- preview;
- versionamento de artefatos;
- execução de código;
- integração Teams/Classroom.

Esses pontos serão fechados incrementalmente.
