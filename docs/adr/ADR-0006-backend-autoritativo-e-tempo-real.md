# ADR-0006 — Backend autoritativo; WebSocket apenas onde tempo real agrega valor

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** arquitetura, segurança, tempo real

## Contexto

Algumas ações não podem confiar no navegador: ordem do Buzzer, concessão de XP, resultado oficial do sorteio e estado da sessão. Ao mesmo tempo, usar WebSocket para CRUD e consultas comuns adicionaria complexidade desnecessária.

## Decisão

O backend é a autoridade para regras competitivas e persistentes.

Usar **REST** para:

- turmas/alunos/matrículas;
- atividades e questões;
- sessões duráveis;
- histórico e ranking;
- configurações e exportações.

Usar **WebSocket** para:

- participante conectado/desconectado;
- abertura/fechamento de Buzzer;
- recebimento/ordenação de cliques;
- mudança de estado de dinâmica quando sincronização imediata for necessária;
- placar/tela pública quando necessário.

No Buzzer, o servidor determina a ordem pela recepção/serialização no backend. Timestamp do cliente não é autoridade.

No MVP de instância única, não exigir Redis. Coordenação distribuída só será adicionada se houver escala horizontal real.

## Consequências

### Positivas

- reduz fraude e inconsistência;
- mantém CRUD simples;
- oferece tempo real apenas onde traz benefício perceptível.

### Custos e riscos

- reconexão precisa ser tratada;
- Buzzer em múltiplas instâncias exigirá coordenação futura.

## Alternativas consideradas

### Cliente decidir vencedor do Buzzer

Rejeitada por latência, relógios diferentes e possibilidade de manipulação.

### WebSocket para toda a aplicação

Rejeitada por complexidade sem benefício.

## Critérios de validação

- [ ] cliente não consegue conceder XP sem validação do backend;
- [ ] dois cliques de Buzzer recebem ordenação oficial no servidor;
- [ ] CRUD funciona por REST.

## Relações

- Relacionados: ADR-0002, ADR-0004, ADR-0007
