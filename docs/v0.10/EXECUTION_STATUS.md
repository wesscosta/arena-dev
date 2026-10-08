# v0.10 — Registro de execução incremental

**Data:** 08/10/2026 · **branch:** `feat/v0.10-learning-loop` · **v0.9.0 permanece congelada.**

## Incrementos efetivamente codificados

| Fase | Implementação verificada | Estado / gate pendente |
|---|---|---|
| P0-A — LearningCycle | V49 + API existente; validação de respostas/evidências, lock de sessão, followup com definição/sequência correta, GET comparison de observações pareadas, `LearningCycleIT` em PG17 | **Parcial**: somente conta docente global; falta ownership por professor, teste HTTP completo, auditoria do tipo/autor/intervenção e compatibilidade temporal |
| P0-B — Sorteio backend | V50 aditiva, `DrawAttempt` pendente/confirmado/passado/anulado, `DrawPolicy` sem reposição/balanceado, única pendência por sessão, rodada explícita, lock transacional, vínculo ScoreEvent único, idempotência de resolução, REST `draw-attempts`, HTTP 409 conflito | **Parcial**: completar testes de CSRF/permissões HTTP, compatibilidade de clientes v0.9/PWA com endpoints legados, eventos de sessão e auditoria de alteração de presença |
| P0-C — Grid e Roleta | `useDrawSession`, 4 desfechos comuns e policy drawer, cobertura da rodada, distinção de XP e participação, suporte de GET após F5 | **Parcial**: ainda precisa de Playwright 3-clientes, rede lenta, telas reais mobile/projetor, revisão visual e de foco, regressão da experiência de roleta |
| P0-D — Continuidade | `ArenaNextActions` sugere próxima interação, grupos e retorno ao roteiro sem avançar `ActivityStep` automaticamente | **Parcial**: validar em aula real e conectar ao estado efetivo de resultados; ainda não há read-model de contexto da sessão |
| P0-E — Before & After | `LearningCyclePanel` no `LearningCheckPanel`: iniciar diagnóstico, registrar intervenção, repetir run, vincular followup, exibir comparação de pares | **Parcial**: E2E professor/aluno/projetor e casos PARTIAL/sem comparáveis ainda precisam cobertura; estado da sessão depende do LearningCheck atual |
| P1 — Peer Instruction, Clínica do Erro, confiança, recuperação, material contextual | Não implementados nesta execução | **Pendente** |
| P2 — Canva/HTML embed, Meta Coletiva | Não implementados; exigem piloto de valor | **Fora do gate P0** |

## Observações arquiteturais e débitos que bloqueiam declarar release concluída

- O backend mantém `InMemoryUserDetailsManager` com **um único usuário de ROLE_TEACHER**. Não há ainda associação professor↔turma. Verificações por `sessionId` impedem associação errada de objetos, **não** isolamento entre vários professores autenticados. Não afirmar multi-tenant seguro nem habilitar contas paralelas sem implementar ownership real.
- `MechanicsService.draw` legado continua operando e persistindo `drawCounts` automaticamente; o frontend v0.10 usa novos endpoints. Antes do rollout público, implementar gate para impedir mescla do caminho antigo com `DrawAttempt` numa mesma sessão (inclusive clientes PWA antigos), preservar dados e explicar migração.
- Projeção pública usa `LiveStageService.showDraw`, mas a extensão do protocolo de outcome para aluno/projetor e a experiência de roda após refresh devem passar por E2E.
- `ScoreEventService` publica ranking com método after-commit existente; revisão de event ledger com contexto `drawAttempt` e reversões precisa concluir antes do gate.
- O novo fluxo de sorteio registra desfechos autoritativos, mas ainda não emite um `SessionEvent` especializado para confirmação/passador/anulação. Auditoria futura precisa evitar vazamento de identidade em palco público.
- No Before & After, apenas `CORRECT` e `INCORRECT` contam como pares comparáveis. `PARTIAL`/`NOT_EVALUATED` ficam fora da comparação binária sem serem confundidos com erro.
- A resposta do aprendizado é um **resultado imediato neste instrumento**, não Mastery longitudinal.
- Links Canva/HTML já se encontram representáveis como `LINK`; não foi implementado iframe. O piloto deve comparar com link simples, e não é bloqueador desta versão.

## Gates executados

**Resultados obtidos no ambiente autorizado durante esta execução:**

- `mvn -q -f backend/pom.xml test` → **exit 0, 172 testes unitários, 0 falhas e 0 erros** (`/tmp/v010-full-backend.log`).
- `mvn -q -f backend/pom.xml -Dtest=DrawServiceIT,DrawSelectionTest,LearningCycleIT,LearningCycleTest,ParticipantSelectionServiceTest test` → **exit 0**; testes de integração reais com PostgreSQL 17/Testcontainers incluindo Flyway V50, concorrência de sorteio e ciclo diagnóstico/intervenção/verificação (`/tmp/v010-core-tests.log`).
- `frontend/npm run typecheck` → **exit 0**; `frontend/npm test` → **300/300**; `frontend/npm run build` → **exit 0** (`/tmp/v010-final-types.log`, `/tmp/v010-final-unit.log`, `/tmp/v010-final-build.log`).
- Lint apresentou avisos preexistentes, sem erros (81 avisos na execução específica).
- **Não executado ainda:** Playwright E2E multicliente com backend atualizado em ambiente isolado, auditoria WCAG manual, teste de upgrade PWA/rotas legadas, teste de recuperação após queda e implantação de produção. **Não** interpretar compilação, testes unitários ou Testcontainers como certificação E2E da aplicação completa.

## Próximo PR / próxima ação

1. Completar autorização/ownership e testes HTTP na camada P0-A/P0-B.
2. Verificar visualmente e por Playwright o ciclo de sorteio/score e Before & After.
3. Implementar política segura de transição e bloqueio dos clientes legados/PWA.
4. Encaminhar a P1 somente após os riscos P0 estarem controlados.
5. Atualizar testes, Notion, docs e release gate a cada fatia. Não criar tag nem promover a `main` antes do go/no-go.
