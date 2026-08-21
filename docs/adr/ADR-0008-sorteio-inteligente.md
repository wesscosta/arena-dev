# ADR-0008 — Preservar sorteio inteligente e migrar decisão para o backend

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** domínio, dinâmica

## Contexto

A V1 já possui sorteio ponderado que reduz repetição e favorece alunos menos chamados. Uma reescrita simplificada com `Math.random()` perderia uma mecânica pedagógica validada.

## Decisão

Preservar o comportamento de sorteio inteligente e suas informações históricas.

Estratégias mínimas:

- `RANDOM` — aleatório puro;
- `BALANCED` — favorece participantes elegíveis menos chamados/participantes, respeitando rodada e evitando repetição imediata quando possível.

A fórmula atual da V1, baseada aproximadamente em `1 / (count + 1)^1.35`, é uma baseline de comportamento, não um contrato matemático imutável.

Na migração, **o backend escolhe o participante**. O frontend apenas executa a animação/roleta até o resultado já definido pelo servidor.

## Consequências

### Positivas

- preserva equidade percebida;
- evita regressão pedagógica;
- permite testes determinísticos no backend.

### Custos e riscos

- algoritmo precisa considerar presença e elegibilidade;
- mudanças futuras de pesos devem ser testadas com dados simulados.

## Alternativas consideradas

### Aleatório puro como único modo

Rejeitada porque pode concentrar participações e perder a vantagem da V1.

## Critérios de validação

- [ ] aluno ausente não é elegível;
- [ ] modo balanceado reduz repetição em comparação ao aleatório puro;
- [ ] animação visual não altera o resultado oficial.

## Relações

- Relacionados: ADR-0001, ADR-0006
