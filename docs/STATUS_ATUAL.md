# Estado atual — Arena Dev

**Última auditoria documental:** 31 de agosto de 2026

**Repositório canônico:** <https://github.com/wesscosta/arena-dev>

**Baseline de release:** candidata `0.3.0`; o SHA final será registrado somente após `main` limpa/sincronizada e CI remoto verde no mesmo commit.

Este documento registra o estado atual demonstrado pelo repositório. Os documentos `INCREMENT_*.md` e os ADRs preservam o histórico de evolução e não devem ser interpretados isoladamente como descrição do runtime atual.

## Hierarquia de evidências

Em caso de divergência:

1. código, migrations e configuração versionada definem o que está implementado;
2. este documento resume o estado corrente;
3. ADRs aceitos definem decisões e restrições arquiteturais;
4. documentos de incremento registram o estágio histórico em que foram escritos;
5. roadmap e documentação narrativa não comprovam implementação ou validação.

## Stack confirmada

| Camada | Estado no repositório |
| --- | --- |
| Frontend | Next.js 16.3, React 19.2 e TypeScript 5.9 |
| Backend | Java 21 e Spring Boot 4.1 |
| Persistência | PostgreSQL 17, JPA/Hibernate e Flyway |
| Tempo real | Spring WebSocket |
| Infraestrutura local | Docker Compose |
| Arquitetura | Monólito modular, REST para estado durável e WebSocket para eventos ao vivo |

## Estado funcional demonstrado pelo código

### Implementado

- `Classroom`, `Student` e `Enrollment` no backend/PostgreSQL;
- `ClassSession`, `SessionParticipant`, presença e uma sessão ativa por turma;
- `ScoreEvent` como fonte de verdade do XP e reversões com `reversalOf`;
- ranking como projeção da soma dos eventos;
- `Activity`, `ActivityQuestion`, cópia entre turmas e Question Package JSON `1.0`;
- importação CSV/TSV de resultados externos com preview, fingerprint e auditoria;
- `SessionDynamic` para Sorteio, Grupos, Arena e Boss Battle;
- sorteio inteligente e grupos decididos pelo backend;
- código/QR de sessão, `/join`, token temporário com hash e Buzzer persistido;
- autenticação do professor por sessão HTTP e proteção das APIs administrativas com `ROLE_TEACHER`;
- token do participante autenticado no primeiro frame WebSocket;
- heartbeat `PING/PONG`, limite lógico por socket, múltiplas conexões e broadcast após commit;
- navegação `Visão geral → Turma → Arena` e workspace contextual da turma.

### Persistência local

O `localStorage` não é fonte de verdade do domínio operacional. Ele guarda:

- preferência da turma selecionada no painel do professor;
- acesso temporário do participante na rota `/join`, incluindo o token necessário à reconexão durante a sessão.

### Migrations

O repositório possui seis migrations:

```text
V1  fundação de turma e sessão
V2  uma sessão ativa por turma
V3  ScoreEvent
V4  atividades e mecânicas
V5  resultados externos
V6  join e Buzzer
```

Não existe migration `V7` na baseline auditada. O hardening dos Incrementos 11.1 e 11.2 foi implementado em código e reutiliza o schema existente, incluindo o índice parcial de uma rodada `OPEN` por sessão já presente na `V6`.

## Fronteira de segurança real

### Implementado

- login e logout explícitos do professor;
- token CSRF obtido em `/api/auth/csrf` e exigido no login e nas mutações administrativas;
- sessão HTTP enviada pelo frontend com `credentials: include`;
- `/api/**` administrativo exige `ROLE_TEACHER`;
- `/api/health`, `/api/auth/login`, `/api/join/**` e handshake `/ws/**` permanecem públicos;
- CORS aceita credenciais para os padrões configurados;
- token do aluno não trafega na URL do WebSocket;
- claim de dispositivo pode ser liberado pelo professor;
- limite de oito mensagens por segundo por socket.

### Limites atuais

- existem credenciais default apenas no perfil e Compose de desenvolvimento;
- o perfil `prod` exige banco, origem e credenciais explícitos e usa cookie `HttpOnly`, `Secure` e `SameSite=Strict`;
- não existe rate limit específico para tentativas de login;
- CSRF está ativo para login e mutações administrativas; rotas públicas com token próprio permanecem independentes da sessão do professor;
- o limite realtime é local à instância e não substitui proteção distribuída futura;
- o overlay de produção exige proxy TLS, DNS, secrets e operação externa ao repositório;
- a licença ainda não foi definida e bloqueia uma release pública estável.

## Qualidade e validação

| Item | Classificação |
| --- | --- |
| Build de produção do frontend | Validado na auditoria de 31/08/2026 |
| TypeScript | Validado na auditoria de 31/08/2026 |
| Auditoria npm de produção | Validada; zero vulnerabilidades conhecidas na execução |
| Backend e migrations | Validados na fatia 11.3A: compilação Java 21, empacotamento, Flyway `V1`–`V6`, validação JPA e PostgreSQL 17.11 |
| Incremento 10 | Implementado; validação manual Docker/LAN registrada no handoff |
| Incrementos 11.1 e 11.2 | Implementados e cobertos pelas suítes de segurança, regras transacionais e concorrência |
| Testes backend | Validado nas fatias 11.3A–11.3C: um teste unitário e treze de integração; a suíte realtime também passou cinco vezes consecutivas |
| Testes frontend | Validado no 11.3D: doze testes de contrato e estado, TypeScript e build de produção |
| Testcontainers/PostgreSQL | Validado na fatia 11.3A com Testcontainers 2.0.5 e PostgreSQL 17.11 |
| Concorrência do Buzzer | Validada em cinco cenários, repetidos cinco vezes consecutivas em Java 21/Docker |
| Playwright | Validado localmente em Chromium com backend e PostgreSQL reais |
| CI | Implementado; execução remota verde no commit final ainda sem evidência registrada |
| Hardening 11.4C | Validado localmente: Compose de produção, imagens, healthchecks, runtime não-root, CSRF e auditoria npm |
| Release readiness 11.4D | Implementado: versões `0.3.0`, gate, checklist, backup/restore e rollback; validação final pendente |

## Documentado, mas ainda não implementado

- `SessionEvent` para auditoria cronológica completa da aula;
- visão dedicada de projetor/tela pública;
- controle para mostrar ou ocultar ranking na visão pública;
- timer sincronizado;
- respostas A/B/C/D pelo celular;
- restauração server-side do snapshot de backup;
- autenticação institucional e contas persistentes de professor/aluno.

## Próximo gate

O **11.4D — Release Readiness** é o gate corrente. A implementação operacional está versionada, mas a release ainda depende de evidências externas e de uma decisão do proprietário:

1. escolher a licença e adicionar `LICENSE`;
2. aplicar o 11.4D na `main`, registrar o commit e publicar;
3. confirmar GitHub Actions verde no mesmo SHA;
4. criar um backup real e aprovar `verify-backup.sh`;
5. simular o rollback no ambiente-alvo;
6. executar `release-gate.sh final`;
7. somente então criar a tag anotada `v0.3.0` e a GitHub Release.

Consulte [`INCREMENT_11_4.md`](INCREMENT_11_4.md) para o histórico do incremento e [`RELEASE_0_3_0.md`](RELEASE_0_3_0.md) para o procedimento completo. Nenhuma tag foi criada por esta implementação.
