# ADR-0029 — Orquestrar Live Flow e Live Stage sem duplicar runtime

**Status:** Aceito  
**Data:** 08/09/2026

## Contexto

`ActivityStep` já define a sequência autorada da aula e `LiveStageState` já define o palco atual. Word Cloud e Poll, por sua vez, possuem runtimes próprios e persistentes.

Criar um segundo runtime dentro do Live Flow para reproduzir essas mecânicas geraria duas fontes de verdade para votos, respostas e estados de rodada.

## Decisão

O Live Flow será somente orquestrador.

- `SLIDE` e `QUESTION` projetam conteúdo derivado do `ActivityStep` no Live Stage;
- `WORD_CLOUD` e `POLL` acionam os runtimes existentes;
- `SessionDynamic.ARENA` guarda apenas o vínculo `stepId → runtimeId` necessário para reativar a mesma rodada;
- o Live Stage continua sendo a única seleção do conteúdo primário em exibição;
- Timer permanece overlay transversal;
- eventos de dinâmica nunca avançam automaticamente o roteiro.

## Consequências

### Positivas

- uma fonte de verdade por mecânica;
- retorno a um step não cria outra votação/nuvem por acidente;
- Projector e `/join` continuam derivados do mesmo palco;
- nenhum schema novo é necessário para a orquestração.

### Restrições

- uma rodada já encerrada pode ser reexibida, mas não é reaberta implicitamente;
- duas Nuvens ou dois Polls simultaneamente abertos continuam proibidos pelos próprios runtimes;
- mudanças posteriores no template não reescrevem retroativamente uma rodada já criada.

## Alternativas rejeitadas

### Runtime paralelo dentro do ActivityStep

Rejeitado por duplicar Poll/Word Cloud e misturar template com estado de sessão.

### Criar nova tabela de binding neste momento

Rejeitado por excesso de persistência para um vínculo pequeno e estritamente relacionado ao runtime `ARENA` já existente.

### Avanço automático após reveal/close

Rejeitado. A condução da aula permanece explicitamente sob controle do professor.
