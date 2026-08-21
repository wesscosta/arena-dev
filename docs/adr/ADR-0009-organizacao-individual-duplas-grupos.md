# ADR-0009 — Individual, duplas, trios e grupos com histórico sem falsos pareamentos

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** dinâmica, UX, dados

## Contexto

A ferramenta de grupos precisa permitir tanto colaboração quanto retorno à atividade individual durante a mesma aula. Representar o modo individual como “grupo de uma pessoa” poluiria o histórico usado para reduzir repetições de pares.

## Decisão

A organização de participantes suporta:

- `INDIVIDUAL`;
- duplas;
- trios;
- grupos com tamanho configurável/presets.

Selecionar Individual significa **retornar à organização individual** e não criar um registro em `GroupHistory`.

Histórico de combinações só registra unidades com dois ou mais participantes.

A geração de grupos deve continuar usando histórico de combinações para reduzir pares repetidos quando possível, com ajuste manual permitido ao professor.

## Consequências

### Positivas

- troca de organização fica natural durante a aula;
- histórico mantém significado estatístico;
- preserva a lógica já existente de evitar repetição.

### Custos e riscos

- algoritmo de balanceamento precisa tratar tamanhos diferentes;
- grupos ímpares podem exigir distribuição não uniforme.

## Alternativas consideradas

### Gravar Individual em GroupHistory

Rejeitada porque não representa colaboração nem pareamento.

## Critérios de validação

- [ ] Individual → Duplas → Grupos → Individual funciona sem nova sessão;
- [ ] Individual não aumenta histórico de combinações;
- [ ] professor pode ajustar membros manualmente.

## Relações

- Relacionados: ADR-0004, ADR-0016
