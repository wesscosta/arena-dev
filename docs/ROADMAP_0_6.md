# Roadmap — Arena Dev v0.6.0

## Nome da linha

**v0.6.0 — Submissions, Assessment & Feedback**

## Problema que a versão resolve

O professor precisa acompanhar uma atividade sem controles paralelos:

- quem ainda não começou;
- quem está em andamento;
- quem entregou;
- quem aguarda correção;
- quem já foi corrigido;
- quem já recebeu devolutiva.

A Arena deve permitir correção individual e assistida por IA, mas o professor continua sendo a autoridade final de nota e feedback.

## Princípios

1. Arena Dev é a fonte de verdade de entrega e avaliação.
2. `ScoreEvent` continua sendo a fonte de verdade do XP.
3. IA gera sugestões; professor aprova/publica.
4. Rascunhos de IA nunca são expostos ao aluno.
5. Teams/Classroom entram futuramente como adapters.
6. Não transformar Arena em LMS.
7. Não reutilizar `ParticipantAnswer` do Quiz como entrega geral de atividade.

## Incrementos

### 14.0 — Bootstrap e arquitetura
- congelar `v0.5.0` como baseline;
- abrir `feat/v0.6-submissions-assessment`;
- alinhar metadata de desenvolvimento;
- criar roadmap, incremento e ADR;
- atualizar documentação corrente.

### 14.1 — ActivitySubmission
- modelar entrega vinculada a `Activity` e `Enrollment`;
- definir estados e invariantes;
- persistência PostgreSQL/Flyway;
- API do professor e aluno;
- origem inicial `ARENA`.

### 14.2 — Fluxo de entrega do aluno
- iniciar atividade;
- autosave;
- restaurar progresso;
- enviar;
- impedir mutações indevidas após submissão conforme política definida.

### 14.3 — Dashboard de entregas
- visão consolidada por atividade;
- status por aluno;
- filtros;
- contadores;
- acesso direto à correção.

### 14.4 — Correção individual
- enunciado + resposta + expected answer/rubrica;
- navegação anterior/próximo;
- salvar rascunho;
- salvar e revisar próxima.

### 14.5 — Rubricas e avaliação estruturada
- critérios explícitos;
- pontuação por critério;
- avaliação manual auditável;
- separar nota de XP.

### 14.6 — AI-assisted grading
- provider-agnostic;
- contexto mínimo necessário;
- nota/feedback sugeridos;
- confiança/sinais para revisão;
- nenhuma publicação automática.

### 14.7 — Feedback individual
- feedback por questão;
- feedback consolidado;
- estados de revisão/publicação;
- aluno vê somente conteúdo publicado.

### 14.8 — Correção em lote / triagem
- geração de sugestões para múltiplas entregas;
- fila priorizada;
- revisão humana obrigatória;
- publicação em lote apenas de itens explicitamente revisados/selecionados.

### 14.9 — Evidências de processo e integridade
- tempo;
- revisões;
- paste events;
- tentativas;
- evolução da resposta;
- similaridade;
- sinalização de revisão baixa/média/alta;
- nunca usar detector binário de IA como prova.

### 14.10 — Preparação para Teams/Classroom
- contrato `SubmissionSource`;
- fronteira de `ExternalIdentity`;
- ids externos sem contaminar domínio central;
- apenas `PUBLISHED` é elegível para sync externo.

### 14.11 — Hardening, E2E e release gate
- testes de integração;
- fluxo crítico E2E;
- metadata final 0.6.0;
- backup/restore;
- CI;
- release gate;
- tag/release.

## Critérios de sucesso

A v0.6.0 estará pronta quando:

1. o professor acompanhar uma atividade inteira sem planilha/controle paralelo;
2. a entrega individual tiver fonte de verdade persistente;
3. o professor corrigir rapidamente aluno por aluno;
4. a IA reduzir trabalho sem publicar decisões sozinha;
5. o aluno receber feedback individual supervisionado;
6. o domínio suportar integração futura com Teams/Classroom sem redesign;
7. XP continuar exclusivamente em `ScoreEvent`.
