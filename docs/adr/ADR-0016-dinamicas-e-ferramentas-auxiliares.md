# ADR-0016 — Separar dinâmicas de aula de ferramentas auxiliares

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** produto, domínio, UX

## Contexto

Nem toda funcionalidade usada durante uma aula representa uma dinâmica com início/fim próprio. Misturar timer, presença e ranking com Arena/Buzzer/Boss dificulta o modelo mental e o histórico.

## Decisão

Tratar como **dinâmicas** os recursos que possuem ciclo de execução dentro da sessão, por exemplo:

- Sorteio/Arena;
- Grupos;
- Buzzer;
- Boss Battle;
- Quiz ao vivo quando implementado;
- Desafio quando possuir execução própria.

Tratar como **ferramentas auxiliares/transversais**:

- Timer;
- Pontuação manual;
- Presença;
- Ranking;
- Histórico.

Boss Battle e demais mecânicas existentes na V1 devem ser preservadas e migradas progressivamente, não removidas por não estarem no primeiro backend persistente.

## Consequências

### Positivas

- modelo mental mais claro;
- SessionDynamic representa apenas aquilo que precisa de lifecycle;
- ferramentas continuam disponíveis sem “iniciar um jogo”.

### Custos e riscos

- algumas funcionalidades podem mudar de categoria conforme amadurecem;
- UX precisa deixar a diferença perceptível sem criar menus complexos.

## Alternativas consideradas

### Tudo como SessionDynamic

Rejeitada porque presença/ranking/timer não precisam necessariamente de lifecycle próprio.

## Critérios de validação

- [ ] professor consegue usar Timer/Ranking sem iniciar outra dinâmica;
- [ ] dinâmica possui início/fim e pode gerar eventos próprios;
- [ ] Boss Battle permanece no roadmap de migração.

## Relações

- Relacionados: ADR-0004, ADR-0009
