# v0.10 — Registro de execução incremental

**Data:** 08/10/2026 · **branch:** `feat/v0.10-learning-loop` · **v0.9.0 permanece congelada.**

## Incrementos efetivamente codificados

| Fase | Implementação verificada | Estado / gate pendente |
|---|---|---|
| P0-A — LearningCycle | V49 + API existente; validação de respostas/evidências, lock de sessão, followup com definição/sequência correta, GET comparison de observações pareadas, `LearningCycleIT` em PG17 | **Parcial**: somente conta docente global; falta ownership por professor, teste HTTP completo, auditoria do tipo/autor/intervenção e compatibilidade temporal |
| P0-B — Sorteio backend | V50 aditiva, `DrawAttempt` pendente/confirmado/passado/anulado, `DrawPolicy` sem reposição/balanceado, única pendência por sessão, rodada explícita, lock transacional, vínculo ScoreEvent único, idempotência de resolução, REST `draw-attempts`, HTTP 409 conflito | **Em homologação**: CSRF/HTTP, auditoria de eventos de seleção/desfecho e proteção bidirecional legado/v0.10 testados em PG17. Persistem teste de upgrade PWA/browser cache, eventos de presença e validação manual de fluxo |
| P0-C — Grid e Roleta | `useDrawSession`, 4 desfechos comuns e policy drawer, cobertura da rodada, distinção de XP e participação, suporte de GET após F5 | **Em homologação**: Playwright Chromium 15 cenários da Arena/fluxos críticos aprovados após corrigir overflow e colisão de botão contextual. Persistem inspeção manual de WCAG/zoom/mobile e teste de upgrade PWA |
| P0-D — Continuidade | `ArenaNextActions` sugere próxima interação, grupos e retorno ao roteiro sem avançar `ActivityStep` automaticamente | **Em validação**: ações foram movidas ao cabeçalho sem adicionar rolagem e não avançam o roteiro; faltam piloto docente e projeção contextual orientada por dados do resultado |
| P0-E — Before & After | `LearningCyclePanel` no `LearningCheckPanel`: iniciar diagnóstico, registrar intervenção, repetir run, vincular followup, exibir comparação de pares | **Em homologação**: Before & After passou E2E de diagnóstico/intervenção/nova resposta e comparação; faltam casos PARTIAL/sem pares, auditoria autor/tipo e validação de experiência por docente |
| P1 — Peer Instruction, Clínica do Erro, confiança, recuperação, material contextual | Não implementados nesta execução | **Pendente** |
| P2 — Canva/HTML embed, Meta Coletiva | Não implementados; exigem piloto de valor | **Fora do gate P0** |

## Observações arquiteturais e débitos que bloqueiam declarar release concluída

- **Fronteira formal (ADR-0053):** o backend mantém `InMemoryUserDetailsManager` com **uma conta `ROLE_TEACHER` por implantação**. Não existe associação professor↔turma. Testes HTTP confirmam role/CSRF em um único operador; não autorizam alegar multi-tenant. Não publicar SaaS com várias contas docentes independentes antes do domínio de identidade/ownership transversal.
- `DrawProtocolGuard` **impede mistura dos dois protocolos na mesma sessão** usando bloqueio transacional por sessão e responde HTTP 409. O GET moderno de sessão legada também falha de maneira explícita e o frontend orienta o docente. Ainda é necessário ensaio real de atualização de PWA/cache e documentação da transição.
- Projeção pública usa `LiveStageService.showDraw`, mas a extensão do protocolo de outcome para aluno/projetor e a experiência de roda após refresh devem passar por E2E.
- `ScoreEventService` publica ranking com método after-commit existente; revisão de event ledger com contexto `drawAttempt` e reversões precisa concluir antes do gate.
- `SessionEvent` agora registra `DRAW_SELECTED`, `DRAW_RESOLVED`, `DRAW_POLICY_CHANGED` e `DRAW_ROUND_STARTED`, sem nome em summary/payload. Revisar a exclusividade da audiência em versões futuras e garantir retenção adequada.
- No Before & After, apenas `CORRECT` e `INCORRECT` contam como pares comparáveis. `PARTIAL`/`NOT_EVALUATED` ficam fora da comparação binária sem serem confundidos com erro.
- A resposta do aprendizado é um **resultado imediato neste instrumento**, não Mastery longitudinal.
- Links Canva/HTML já se encontram representáveis como `LINK`; não foi implementado iframe. O piloto deve comparar com link simples, e não é bloqueador desta versão.

## Gates executados

**Resultados obtidos no ambiente autorizado durante esta execução:**

- `mvn -q -f backend/pom.xml test` → **exit 0, 172 testes unitários, 0 falhas e 0 erros** (`/tmp/v010-full-backend.log`).
- `mvn -q -f backend/pom.xml -Dtest=DrawServiceIT,DrawSelectionTest,LearningCycleIT,LearningCycleTest,ParticipantSelectionServiceTest test` → **exit 0**; testes de integração reais com PostgreSQL 17/Testcontainers incluindo Flyway V50, concorrência de sorteio e ciclo diagnóstico/intervenção/verificação (`/tmp/v010-core-tests.log`).
- `frontend/npm run typecheck` → **exit 0**; `frontend/npm test` → **300/300**; `frontend/npm run build` → **exit 0** (`/tmp/v010-final-types.log`, `/tmp/v010-final-unit.log`, `/tmp/v010-final-build.log`).
- Lint apresentou avisos preexistentes, sem erros (81 avisos na execução específica).
- **Testes HTTP adicionais**: `DrawHttpSecurityIT`, `DrawServiceIT`, `SecurityAndMigrationIT` e `LearningCycleIT` com PostgreSQL 17 — **11 testes aprovados**, migrações Flyway V1–V50, CSRF, autenticação e bloqueio legado/novo.
- **Playwright Chromium completo**: `npx playwright test` — **24/24 aprovados**, abrangendo ranking, cockpit em 1366–1920px, turmas com 1 e 22 estudantes, Grid/Roleta, resolução de sorteio, roteiro, Nuvem, Quiz, Votação, Buzzer, Boss, reconexão, Before & After e Biblioteca em mobile/ultrawide (`/tmp/v010-full-e2e.log`). Corrigido o painel de ações para não alterar altura do cockpit nem bloquear CTAs; recomendações acessíveis no cabeçalho.
- **Ainda não executado/validado:** auditoria manual WCAG 2.2/zoom/foco com tecnologias assistivas, troca de versão por PWA/cache, teste de interrupção de rede real sob carga e homologação pedagógica presencial. Os testes Playwright geram dados sintéticos no ambiente local de desenvolvimento: **não** executá-los em produção nem confundir turmas de fixture com dados reais. Não tratar testes automáticos como certificação de acessibilidade, aprendizado ou rollout de produção.

## Próximo PR / próxima ação

1. Manter rollout restrito ao **operador docente único** (ADR-0053); antes de múltiplos professores, implementar owner/membership e autorização transversal a todos os domínios.
2. Validar manualmente keyboard/foco/zoom/contraste/mobile e ensaiar atualização de PWA/cliente legado; aplicar regressões completas com ambiente atualizado.
3. Fechar auditoria/reversão de XP, presença/rodadas e política de palco após anulação; ensaiar rollback lógico de flags.
4. Executar piloto real com professor para contextual actions; depois iniciar P1 (Peer Instruction, Clínica do Erro, links Biblioteca/Jornada e Confidence).
5. Não publicar tag, não forçar o cutover v0.9 nem promover `main` antes do gate final.
