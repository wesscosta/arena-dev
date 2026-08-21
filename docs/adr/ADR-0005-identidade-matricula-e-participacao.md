# ADR-0005 — UUID interno, matrícula de negócio e participação por sessão

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** dados, identidade

## Contexto

A matrícula é um identificador útil para o professor e para importações, mas pode mudar de formato, ser ausente em dados legados ou não ser apropriada como chave técnica. Além disso, presença e conexão são propriedades do aluno em uma aula específica, não do cadastro global do aluno.

## Decisão

- `Student.id` usa UUID como identidade interna;
- `registration`/matrícula é `String` e identificador de negócio, não PK;
- vínculo aluno–turma ocorre por `Enrollment`;
- presença e conexão em aula ocorrem por `SessionParticipant`;
- no MVP, o aluno pode entrar em uma sessão sem criar conta completa;
- código/QR pertence à sessão e expira ao encerrá-la.

Conexões WebSocket são transitórias e não devem ser persistidas como identidade estável do participante.

## Consequências

### Positivas

- evita acoplamento da identidade técnica à matrícula;
- aluno pode participar de várias turmas;
- presença fica historicamente correta por aula;
- reconexões não criam novas identidades de aluno.

### Custos e riscos

- requer resolução segura do participante ao entrar por código;
- autenticação institucional futura precisará ser associada ao mesmo `Student`.

## Alternativas consideradas

### Matrícula como chave primária

Rejeitada por fragilidade e baixa flexibilidade.

### Presença gravada no cadastro do aluno

Rejeitada porque presença é contextual à sessão.

## Critérios de validação

- [ ] um aluno pode estar em mais de uma turma;
- [ ] presença é independente entre sessões;
- [ ] código de acesso encerra junto com a sessão.

## Relações

- Relacionados: ADR-0004, ADR-0006
