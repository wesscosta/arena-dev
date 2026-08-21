# ADR-0020 — Tornar Atividades e mecânicas da sessão autoritativas no backend

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** atividades, questões, sorteio, grupos, Boss Battle, Arena, persistência

## Contexto

O ADR-0019 separou temporariamente `SessionRuntimeState` no navegador para permitir migrar sessão e presença sem ampliar excessivamente o Incremento 5. Após a persistência de `ScoreEvent`, esse runtime local passou a ser a última fonte relevante de estado operacional fora do backend.

Manter o navegador decidindo sorteios ou formando grupos também contrariaria o ADR-0006 e o ADR-0008, que definem o backend como autoridade das regras relevantes.

## Decisão

1. `Activity` e `ActivityQuestion` passam a usar Spring Boot/PostgreSQL como fonte de verdade;
2. o contrato JSON V1 e o Prompt Builder permanecem como formato de entrada, sem acoplamento a provedor de IA;
3. o estado corrente de `QUICK_DRAW`, `GROUPS`, `BOSS_BATTLE` e `ARENA` é persistido como `SessionDynamic` associado a uma `ClassSession`;
4. cada sessão mantém um estado corrente por tipo de dinâmica neste incremento; auditoria cronológica granular será responsabilidade futura de `SessionEvent`;
5. sorteio inteligente é calculado no backend; a roleta no frontend é somente apresentação;
6. formação de grupos é calculada no backend usando `group_history` persistido para reduzir repetições;
7. `Individual` não cria histórico de pareamento;
8. Boss Battle e sequência `Activity → Arena` sobrevivem a reload;
9. `localStorage` deixa de persistir domínio operacional e guarda somente preferência de contexto;
10. referências de novos ScoreEvents a atividade/questão são validadas pelo backend.

## Consequências

### Positivas

- não há mais duas fontes de verdade para mecânicas;
- sorteio e grupos obedecem à autoridade do servidor;
- atividade/questão pode ser referenciada de forma estável por UUID;
- reload não perde Boss, sorteio, grupos ou sequência de questões;
- abre caminho para join/QR/WebSocket sem precisar sincronizar estado local legado.

### Custos e riscos

- `SessionDynamic.state_json` é deliberadamente flexível e exige validação no serviço;
- `SessionEvent` ainda será necessário para auditoria cronológica completa das transições;
- dados locais experimentais anteriores não são migrados automaticamente;
- restauração de backup passa a exigir operação server-side própria.

## Alternativas consideradas

### Persistir apenas o JSON produzido pelo frontend

Rejeitada porque o navegador continuaria decidindo o resultado oficial de sorteios e grupos.

### Criar tabelas especializadas para cada mecânica imediatamente

Adiada. A abordagem aumentaria o schema e o custo de evolução antes de estabilizar todos os tipos de dinâmica. `SessionDynamic` mantém a fronteira de domínio e permite especialização posterior.

### Manter `SessionRuntimeState` local até o WebSocket

Rejeitada porque tempo real e persistência são preocupações diferentes; WebSocket não deve ser requisito para ter estado durável.

## Relações

- Implementa: ADR-0006, ADR-0008, ADR-0009, ADR-0010, ADR-0011 e ADR-0012
- Substitui a parte temporária de runtime local do ADR-0019
- Implementação: `docs/INCREMENT_7.md`
