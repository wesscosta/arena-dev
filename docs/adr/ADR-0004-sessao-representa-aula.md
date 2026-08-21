# ADR-0004 — Sessão representa a aula e contém múltiplas dinâmicas

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** domínio, produto

## Contexto

Uma aula real pode alternar entre sorteio, Arena, grupos, Buzzer, Boss Battle e outras dinâmicas. Obrigar o professor a escolher um único “modo de jogo” para todo o encontro não representa o uso real.

## Decisão

`ClassSession` representa uma aula/encontro real.

Uma mesma `ClassSession` pode conter zero, uma ou várias `SessionDynamic`, iniciadas e encerradas em momentos diferentes.

Fluxo conceitual:

```text
Classroom
  └── ClassSession
        ├── presença/participantes
        ├── Arena
        ├── Sorteio
        ├── Grupos
        ├── Buzzer
        ├── Boss Battle
        └── eventos/pontuação
```

Encerrar uma dinâmica retorna o professor ao contexto da mesma aula; não cria uma nova sessão.

## Consequências

### Positivas

- modela a aula real;
- facilita histórico cronológico;
- permite combinar mecânicas sem fragmentar dados.

### Custos e riscos

- estados de dinâmica precisam ser independentes e controlados;
- UI deve diferenciar sessão ativa de dinâmica ativa.

## Alternativas consideradas

### Uma sessão por jogo/dinâmica

Rejeitada por fragmentar uma única aula em vários registros artificiais.

## Critérios de validação

- [ ] duas ou mais dinâmicas podem ser usadas na mesma sessão;
- [ ] presença e ranking da sessão permanecem consistentes ao trocar de dinâmica;
- [ ] histórico registra início/fim de cada dinâmica.

## Relações

- Relacionados: ADR-0003, ADR-0006, ADR-0016
