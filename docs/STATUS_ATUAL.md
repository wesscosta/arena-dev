# Estado atual — Arena Dev

**Última auditoria documental:** 5 de setembro de 2026

**Repositório canônico:** <https://github.com/wesscosta/arena-dev>

**Baseline de release:** candidata `0.3.0`. A baseline `958128db3ad2cee75e4fcebfd6bb0e828e968596` teve CI remoto verde na execução `33407968814` e backup/restore real validado. Um patch final de segurança atualiza o frontend de Next.js `16.3.0` para `16.3.3`; por alterar o SHA, a publicação exige nova CI verde no commit final da `main`, rollback ensaiado e gate final aprovado.

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
| Frontend | Next.js 16.3.3, React 19.2 e TypeScript 5.9 |
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
- o overlay de produção exige proxy TLS, DNS, secrets e operação externa ao repositório.

## Qualidade e validação

| Item | Classificação |
| --- | --- |
| Build de produção do frontend | Validado novamente em 05/09/2026 após o patch para Next.js `16.3.3` |
| TypeScript | Validado novamente em 05/09/2026; sem erros |
| Auditoria npm de produção | Validada após o patch: `npm audit --omit=dev` reportou zero vulnerabilidades |
| Backend e migrations | Validados na fatia 11.3A: compilação Java 21, empacotamento, Flyway `V1`–`V6`, validação JPA e PostgreSQL 17.11 |
| Incremento 10 | Implementado; validação manual Docker/LAN registrada no handoff |
| Incrementos 11.1 e 11.2 | Implementados e cobertos pelas suítes de segurança, regras transacionais e concorrência |
| Testes backend | Validado nas fatias 11.3A–11.3C: um teste unitário e treze de integração; a suíte realtime também passou cinco vezes consecutivas |
| Testes frontend | Validado no 11.3D: doze testes de contrato e estado, TypeScript e build de produção |
| Testcontainers/PostgreSQL | Validado na fatia 11.3A com Testcontainers 2.0.5 e PostgreSQL 17.11 |
| Concorrência do Buzzer | Validada em cinco cenários, repetidos cinco vezes consecutivas em Java 21/Docker |
| Playwright | Validado localmente em Chromium com backend e PostgreSQL reais |
| CI | Implementado; a baseline `958128db...` foi aprovada na execução `33407968814`. O patch Next.js `16.3.3` exige nova execução verde no SHA final da `main` antes da tag |
| Hardening 11.4C | Validado localmente: Compose de produção, imagens, healthchecks, runtime não-root, CSRF e auditoria npm |
| Release readiness 11.4D | Implementado: versões `0.3.0`, gate, checklist, backup/restore e rollback. Backup real, checksum e restauração isolada em PostgreSQL 17 já foram validados; faltam nova CI do SHA pós-patch, ensaio de rollback e gate final |

## Fronteira de produto e licenciamento

- **Arena Dev Community:** este repositório público, self-hosted e licenciado sob MIT. A licença vale para o histórico público já distribuído e deve acompanhar qualquer cópia ou derivação desse código.
- **Produto comercial Verit:** produto SaaS futuro, planejado para um repositório privado separado. Ainda não está implementado neste repositório.
- **Separação técnica:** Estudos/Concursos mantém domínio, backend e banco próprios. Integrações futuras usam APIs ou contratos versionados; banco compartilhado e consultas cruzadas ficam rejeitados.
- **Fronteira comercial planejada:** contas persistentes e papéis avançados, organizações, multi-tenancy, planos/billing, workspace de estudos, revisão adaptativa, analytics avançado, conteúdo premium, IA e operação SaaS.
- **Governança pendente:** a titularidade do código proprietário futuro e a política para contribuições externas devem ser formalizadas por instrumento escrito antes da abertura do repositório comercial ou da aceitação ampla de contribuições.

A decisão completa está em [`adr/ADR-0026-community-mit-e-produto-comercial-verit.md`](adr/ADR-0026-community-mit-e-produto-comercial-verit.md).

## Documentado, mas ainda não implementado

- `SessionEvent` para auditoria cronológica completa da aula;
- visão dedicada de projetor/tela pública;
- controle para mostrar ou ocultar ranking na visão pública;
- timer sincronizado;
- respostas A/B/C/D pelo celular;
- restauração server-side do snapshot de backup;
- autenticação institucional e contas persistentes de professor/aluno.

## Classificação de continuidade

| Classificação | Estado em 31/08/2026 |
| --- | --- |
| **Validado** | Gate local 11.4D, backend, frontend, E2E, containers e licença MIT presente |
| **Implementado** | Incrementos 1–11.4D e baseline operacional de release `0.3.0` |
| **Parcial** | Publicação `v0.3.0`: patch Next.js `16.3.3` validado localmente; faltam commit/CI do novo SHA final, rollback e gate final |
| **Documentado** | Divisão Arena Dev Community × produto comercial Verit e sequência de separação dos repositórios |
| **Planejado** | Produto comercial privado, Estudos/Concursos e módulos SaaS diferenciados |
| **Hipótese** | Estudos como principal oferta B2C e Arena Community como aquisição/validação; depende de piloto e sinal econômico |
| **Rejeitado/adiado** | Mesmo backend ou banco para Arena e Estudos, retirada retroativa da licença MIT, `v1.0.0`, microserviços e IA antes do MVP |
| **Desconhecido** | SHA final pós-patch e CI correspondente, evidências do ambiente-alvo, nome comercial, limites Free/Pro e instrumento de titularidade do código proprietário |

## Próximo gate

O **11.4D — Release Readiness** permanece como gate corrente. O backup/restore real já foi validado e o patch Next.js `16.3.3` passou pelos gates frontend locais. A release ainda depende da consolidação final:

1. publicar o patch de segurança e a documentação corrigida em `main`;
2. registrar o novo SHA final e confirmar GitHub Actions verde exatamente nesse commit;
3. simular o rollback de aplicação preservando o PostgreSQL;
4. executar `release-gate.sh final` com a nova execução de CI e o backup validado;
5. somente então criar a tag anotada `v0.3.0` e a GitHub Release.

TLS, proxy reverso, DNS, secrets de produção, retenção externa de backups, observabilidade e digests de imagens permanecem responsabilidades do ambiente de implantação e devem ser validados antes da exposição pública, mas não bloqueiam a tag do código Community.

Consulte [`INCREMENT_11_4.md`](INCREMENT_11_4.md) para o histórico do incremento e [`RELEASE_0_3_0.md`](RELEASE_0_3_0.md) para o procedimento completo. Nenhuma tag foi criada por esta implementação.
