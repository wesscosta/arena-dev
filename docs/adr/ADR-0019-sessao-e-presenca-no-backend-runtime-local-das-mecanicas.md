# ADR-0019 — Persistir sessão e presença no backend e separar o runtime local das mecânicas

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** sessão, presença, persistência, migração incremental

## Contexto

Após o Incremento 4, `Classroom`, `Student` e `Enrollment` já são persistidos no PostgreSQL, mas a sessão ativa ainda era criada no navegador. Isso fazia presença, início/fim da aula e identidade da sessão desaparecerem ou divergirem após reload.

Ao mesmo tempo, diversas mecânicas ainda não foram migradas: contagem de sorteios, último aluno sorteado, Boss Battle, atividade conectada à Arena e sequência local de questões. Migrar todas essas mecânicas junto com a sessão ampliaria excessivamente o escopo do incremento.

## Decisão

1. `ClassSession` e `SessionParticipant` passam a ter Spring Boot/PostgreSQL como única fonte de verdade;
2. presença inicial e alterações durante a sessão são persistidas imediatamente;
3. o frontend recupera sessões e participantes pela API no bootstrap e seleciona automaticamente a sessão ativa da turma atual;
4. uma turma pode possuir no máximo uma sessão `ACTIVE` por vez, reforçado por regra de serviço e índice único parcial no PostgreSQL;
5. mecânicas ainda não migradas são separadas em `SessionRuntimeState`, persistido temporariamente no navegador;
6. `SessionRuntimeState` sempre referencia o UUID de uma `ClassSession` real e não constitui uma segunda sessão;
7. backups locais não podem substituir sessões ou participantes vindos do backend.

## Consequências

### Positivas

- reload preserva a aula e a presença;
- elimina a segunda fonte autoritativa para `ClassSession`;
- permite migrar mecânicas posteriores de forma independente;
- ScoreEvents locais já passam a referenciar UUIDs duráveis de sessão;
- trocar de turma mantém o contexto de sessão correto.

### Custos e riscos

- durante a transição, uma sessão combina estado durável no backend e runtime temporário no navegador;
- Boss/sorteio/atividade conectada podem não sobreviver se o armazenamento local for apagado, até o Incremento 7;
- carregamento inicial consulta sessões e participantes adicionais.

## Alternativas consideradas

### Migrar todas as mecânicas junto com ClassSession

Rejeitada neste incremento porque elevaria o risco de regressão e contrariaria a migração domínio por domínio.

### Continuar salvando ClassSession também no localStorage

Rejeitada porque produziria duas fontes de verdade para presença, status e identidade da sessão.

### Não preservar runtime das mecânicas

Rejeitada porque causaria regressão funcional perceptível em Boss, sorteio e Activity → Arena enquanto esses módulos ainda não estão no backend.

## Critérios de validação

- [ ] sessão ativa reaparece após reload;
- [ ] presença reaparece após reload;
- [ ] alteração de presença é persistida imediatamente;
- [ ] encerramento é persistido;
- [ ] segunda sessão ativa na mesma turma é rejeitada;
- [ ] mecânicas locais continuam usando o UUID real da sessão;
- [ ] `sessions` e `sessionParticipants` não são persistidos como fonte autoritativa no navegador.

## Relações

- Complementa: ADR-0004, ADR-0005, ADR-0014, ADR-0018
- Relacionados: ADR-0006, ADR-0012
- Implementação: `docs/INCREMENT_5.md`
