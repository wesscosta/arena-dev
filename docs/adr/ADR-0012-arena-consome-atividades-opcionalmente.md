# ADR-0012 — Arena pode consumir questões de atividades sem depender delas

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, integração de domínio

## Contexto

Atividades passam a conter questões estruturadas. Se a Arena mantiver uma fonte de perguntas completamente independente, o sistema volta a parecer fragmentado. Porém o professor também precisa fazer perguntas orais e improvisadas sem cadastrar conteúdo antes.

## Decisão

A Arena deve aceitar três fontes de desafio:

1. **Modo livre** — professor pergunta oralmente/fora do sistema;
2. **Atividade existente** — utiliza questões de uma `Activity` da turma;
3. **Seleção de questões** — usa subconjunto escolhido de uma atividade/conjunto disponível.

A Arena **não depende obrigatoriamente** de Activity ou ActivityQuestion para funcionar.

Quando uma questão estruturada é usada, eventos e score podem registrar referência à atividade/questão para histórico e filtros.

## Consequências

### Positivas

- conecta Atividades e Arena;
- preserva improvisação em sala;
- permite rastrear desempenho por conteúdo quando houver questão estruturada.

### Custos e riscos

- UI de início da Arena precisa ser simples apesar das opções;
- questões práticas/abertas podem exigir avaliação manual.

## Alternativas consideradas

### Arena usar somente questões cadastradas

Rejeitada por aumentar fricção e limitar perguntas orais.

### Arena manter banco de perguntas isolado

Rejeitada por duplicação de conteúdo e sensação de módulos desconectados.

## Critérios de validação

- [ ] Arena inicia sem atividade;
- [ ] Arena pode carregar atividade da turma atual;
- [ ] score registra origem quando houver questão estruturada.

## Relações

- Relacionados: ADR-0007, ADR-0010, ADR-0011
