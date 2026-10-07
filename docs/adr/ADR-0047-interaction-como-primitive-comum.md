# ADR-0047 — Interaction como primitive comum e migração progressiva

- **Status:** Aceito
- **Data:** 2026-10-07
- **Decisores:** equipe Arena Dev
- **Escopo:** arquitetura | dados

## Contexto

Quiz, Poll e Word Cloud possuem runtimes próprios. O Quiz atual referencia `ActivityQuestion`, o Poll possui opções/votos próprios e a Nuvem possui seu próprio round/respostas. Reescrever tudo de uma vez aumentaria regressão e faria o novo domínio depender de detalhes do legado.

## Decisão

Criar `InteractionDefinition`, `InteractionRun`, `Response`, `Evaluation` e Result Engine como primitives comuns.

Os response kinds iniciais são apenas:

- `CHOICE`;
- `TEXT`.

Variações como single choice, true/false, Poll e Word Cloud são configurações, não novos aggregate roots.

O Quiz legado será o primeiro consumidor através de adapter. O novo `InteractionDefinition` **não terá dependência obrigatória de `ActivityQuestion`**.

A migração seguirá:

```text
legacy
→ adapter
→ new core
→ shadow validation
→ feature flag
→ legacy removal
```

## Consequências

### Positivas

- reduz serviços paralelos;
- evita acoplamento do novo core ao domínio Atividade;
- permite rollback e comparação entre implementações.

### Custos e riscos

- coexistência temporária aumenta código durante a migração;
- adapter precisa preservar contratos de realtime, projector e scoring.

## Alternativas consideradas

### Transformar ActivityQuestion em Interaction

Rejeitada porque ActivityQuestion pertence ao domínio Atividade e possui responsabilidades de avaliação/submissão assíncrona.

### Reescrever Quiz/Poll/Word Cloud simultaneamente

Rejeitada pelo risco de regressão e ausência de prova incremental.

## Critérios de validação

- [ ] Quiz funciona sobre o novo core sem regressão visível;
- [ ] Poll funciona com `evaluationMode = NONE`;
- [ ] Word Cloud usa resposta TEXT com apresentação WORD_CLOUD;
- [ ] resultados novo/legado podem ser comparados antes do cutover.

## Relações

- ADRs relacionados: ADR-0012, ADR-0033, ADR-0034, ADR-0035, ADR-0036, ADR-0037, ADR-0046
- Substitui parcialmente: ADR-0033 apenas quanto ao acoplamento de longo prazo do Quiz a ActivityQuestion; compatibilidade permanece durante migração
- Substituído por: nenhum
