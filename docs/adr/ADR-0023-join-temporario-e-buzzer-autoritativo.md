# ADR-0023 — Join temporário por sessão e Buzzer autoritativo

- **Status:** Aceito
- **Data:** 2026-08-21
- **Escopo:** identidade temporária, tempo real, segurança e concorrência

## Contexto

O Arena Dev precisa permitir participação por celular sem exigir cadastro de conta no MVP. Ao mesmo tempo, o Buzzer não pode confiar em `studentId`, timestamp ou ordem calculada pelo navegador, porque clientes possuem latências e relógios diferentes e podem enviar dados manipulados.

## Decisão

Cada sessão ativa recebe um **código curto e temporário**. O aluno resolve esse código e se identifica por matrícula ou correspondência exata de nome/apelido contra os `SessionParticipant` já existentes.

Após identificação, o backend entrega um **token opaco de alta entropia**. O token bruto fica somente no dispositivo; o PostgreSQL armazena seu hash SHA-256.

A conexão em tempo real usa WebSocket em:

```text
/ws/sessions/{sessionId}?token=...
```

O token é obrigatório para ações de participante. Conexões sem token podem acompanhar o canal da sessão no painel do professor, mas não podem enviar clique de Buzzer válido.

O Buzzer usa uma rodada persistente. Ao receber `BUZZER_PRESS`, o backend:

1. valida sessão ativa;
2. valida token e participante;
3. exige presença liberada;
4. obtém lock pessimista da rodada aberta;
5. impede segundo clique do mesmo participante;
6. calcula e persiste a posição oficial;
7. transmite o novo estado a todos os sockets da sessão.

O timestamp do cliente nunca decide a classificação.

## Consequências positivas

- não exige conta completa para experimentar o produto;
- não expõe a lista completa de alunos na rota pública;
- reduz possibilidade de falsificação direta de `studentId`;
- resultado do Buzzer é auditável no PostgreSQL;
- lock no banco mantém ordenação consistente mesmo sob cliques concorrentes;
- WebSocket continua restrito à sincronização imediata; CRUD permanece REST.

## Custos e riscos

- nome não é fator forte de autenticação; o join é identificação de sala, não identidade institucional;
- compartilhamento do código permite tentativa de identificação por terceiros;
- uma política de aprovação do professor pode ser adicionada posteriormente;
- os endpoints de controle do professor ainda herdam a ausência de autenticação completa do painel atual; autorização do professor é uma camada posterior e não deve ser confundida com a validação do participante;
- múltiplas abas usando o mesmo token não são um caso prioritário do MVP;
- escala horizontal futura exigirá estratégia de broadcast compartilhado, embora a ordenação persistente já esteja protegida no banco.

## Alternativas consideradas

### Conta obrigatória do aluno

Adiada. Aumentaria atrito antes de validar a dinâmica principal.

### Enviar `studentId` diretamente pelo cliente

Rejeitada. Permitiria personificação trivial e acoplaria identidade estável à interface pública.

### Timestamp do celular para decidir o vencedor

Rejeitada. Relógios não são comparáveis e são manipuláveis.

### REST polling para Buzzer

Rejeitada para o clique/estado ao vivo por latência e excesso de consultas.

## Relações

- Subordina-se ao ADR-0005 (identidade e participação).
- Implementa o ADR-0006 (backend autoritativo e tempo real).
- Mantém o ADR-0007 (`ScoreEvent`) ao registrar XP de Buzzer pela mesma fonte de verdade.
- Complementa o ADR-0017 (três experiências do mesmo sistema).
