# Auditoria de consolidação — ArenaDev v0.10

**Data:** 09/10/2026
**Escopo:** documentação operacional e de release; UX das dinâmicas, Sorteio e pontuação; CSS legado; testes; limites da arquitetura, segurança e homologação.
**Estado do produto:** candidata `0.10.0-rc.1`, branch `feat/v0.10-learning-loop`; **NO-GO para release estável**. Este relatório não equivale a aprovação de produção.

## 1. Diagnóstico e decisões

A v0.10 reúne avanços legítimos, mas o crescimento do produto gerou **três problemas independentes**: (a) documentação histórica apresentada como estado atual, (b) superfícies duplicadas para a mesma tarefa e (c) regressões potenciais causadas por CSS/testes presos a layouts antigos. A solução correta é eliminar duplicações identificáveis, não reescrever o domínio nem aplicar um único layout a mecânicas pedagógicas diferentes.

| Prioridade | Evidência verificável | Diagnóstico | Decisão e limite |
| --- | --- | --- | --- |
| P0 — documentação | README abre com muitos checkpoints 10.9–10.13; `STATUS_ATUAL.md` registrava implantação parcial e contagens de teste históricas; `DOCUMENTATION_INDEX.md` promovia incrementos 16.x a fontes correntes | Contradição temporal e alto custo para encontrar estado/release | **Corrigido:** README passa a ser porta de entrada curta; estado operacional e índice organizados; registros de incrementos continuam consultáveis, sem reescrever ADR histórico |
| P1 — XP avulso | `ArenaApp.tsx`: dock permanente `Pontuação avulsa` no Sorteio e ferramenta `Pontuação rápida` com presets e customização | Redundância funcional, densidade visual e risco de confundir pontuar seleção com ajuste manual | **Removido apenas o dock**; função manual mantida em Ferramentas → Pontuação rápida, separada do desfecho do sorteio. Backend/ledger/XP não modificados |
| P1 — CSS e testes mortos | Regras `.quick-score-*` em `arena-polish.css` e `mobile-reflow.css`, fixture e asserts estáticos exigiam o dock | CSS residual e testes garantindo UI obsoleta | **Corrigido:** removidas regras exclusivas, fixtures e expectativas substituídas pela verificação da ferramenta canônica |
| P1 — semântica de XP | Roleta mostrava `+{selectedXp} XP` derivado do XP **acumulado do aluno**, sugerindo prêmio do sorteio | Métrica potencialmente enganosa | **Corrigido:** rótulo de XP acumulado na turma, sem alegação de ganho na seleção |
| P1 — formulário manual | Campo numérico podia enviar valor `NaN`, decimal ou zero; `Aluno`, quantidade e motivo com associações incompletas | Acessibilidade e rejeições evitáveis na API | **Corrigido na interface:** rótulos acessíveis e desabilitação para XP inválido, preservando ajustes negativos quando suportados pelo backend |
| P1 — XP manual em rede incerta | O endpoint não tinha chave de idempotência e poderia duplicar XP em POST repetido | A garantia exigia persistência e serialização no backend, não apenas desabilitar botão | **Corrigido incrementalmente na candidata V56**, após o diagnóstico: requestId único, reenvio seguro, 409 divergente e quatro testes PostgreSQL 17 aprovados. Persistem F5/reconciliação pelo histórico e validação física; [ADR-0066](../adr/ADR-0066-manual-score-creation-idempotency.md) |
| P1 — status de release | CI verde `cce0758` é de commit anterior; branch possui diff local; PR #35 está em rascunho | Falta prova de CI no mesmo SHA da candidata revisada | **Bloqueio mantido**; não efetuar merge, tag, release ou mudar versão estável sem novo gate |
| P1 — acessibilidade e PWA | Testes Chromium e capturas não certificam VoiceOver/NVDA, zoom alto ou upgrade de PWA já instalada | Confiança excessiva em teste automatizado | **Bloqueio mantido**, conforme checklist e aceite operacional |
| P2 — mantenibilidade | `ArenaApp.tsx`, CSS `arena-polish.css` e E2E `arena-shell.spec.ts` concentram responsabilidades numerosas | Dificuldade de evolução e tendência a overrides sucessivos | **Plano de extração incremental**, sem reescrita ou remoção em release candidate |

## 2. Decisão produto: o que manter, retirar ou adiar

### Retirar agora (baixo risco, executado)

- Dock duplicado de XP sob o Sorteio, mantendo a ferramenta de pontuação no menu. A remoção é da **superfície**, não da capacidade nem dos eventos armazenados.
- Configuração/estado `customScoreOpen` exclusivos desse dock e respectivos testes e seletores CSS; não recriar abstrações para manter código morto.
- Resumos históricos no topo do README e apêndices antigos v0.8 após a seção de licença; detalhes permanecem em documentos de incrementos existentes e no histórico Git.
- Afirmações de release baseadas em SHA anterior sem ressalva temporal; registrar explicitamente limites das evidências.

### Manter (capacidade com finalidade distinta)

- **Sorteio:** `CONFIRMED` com XP opcional, `PASSED`, `VOIDED`, idempotência e reconciliação. Anular não é passar a vez. Nenhum XP automático pela seleção.
- **Grid e Roleta:** duas representações de seleção. A Roleta pode ser opcional pelo professor; não deve ganhar semântica de apostas nem outro motor de justiça.
- **Quiz e Verificar aprendizagem:** Quiz operacional de rodada e checagem vinculada a objetivo não são substitutos; resultados e evidência pedagógica devem permanecer separados de XP.
- **Nuvem, Votação, Buzzer e Boss Battle:** manter como ferramentas com usos distintos; não apresentá-las como prova de aprendizagem ou obrigá-las a uma estrutura de formulário idêntica.
- **Painel pedagógico e Biblioteca contextual:** usam fontes canônicas e registros de sessão, sem duplicar conteúdo nem gerar mastery.
- **Pontuação rápida:** necessária para eventos fora do sorteio; agora fica em Ferramentas, não permanentemente no palco.

### Sinalizar para uma próxima decisão (não remover sem prova)

| Item | Razão para reavaliar | Critério antes de remover ou investir |
| --- | --- | --- |
| Buzzer e Boss Battle | Podem introduzir competição/ruído sem melhorar aprendizagem | Piloto com objetivo observável, engajamento + evidência; medir custo docente e equidade |
| Roleta opcional | Animação pode consumir tempo e sugerir gamificação inadequada | Uso real comparado ao Grid, preferência docente, acessibilidade/reduced motion |
| Quick XP manual por presets | Baixa fricção, porém risco de distribuição arbitrária | Critérios pedagógicos explícitos e análise de eventos; não vincular a mastery |
| Extensões RAG/IA, embed Canva | Ainda sem ganho demonstrado sobre conteúdo canônico e links HTTPS | Piloto com métricas e avaliação de segurança/proveniência antes da arquitetura |
| `ArenaApp.tsx` e CSS globais | Grandes e fortemente acoplados | Extrair por domínio em PRs pequenos com testes, **após** release; evitar rewrite dentro do RC |
| Diários longos de v0.10 | Necessários para auditoria, mas não são documentação de uso diário | Manter append-only datado e indexado; resumos curtos nas fontes operacionais |

## 3. Plano de manutenção após a candidata

1. Migrar `arena-shell.spec.ts` de verificações textuais de CSS para contratos funcionais acessíveis e screenshots de regressão, sem apagar cobertura de rede e XP.
2. Extrair os fluxos de Roleta, Score e gestão da sessão de `ArenaApp.tsx` por função e propriedade de estado, sem separar artificialmente apenas para reduzir linhas.
3. Consolidar CSS de cada dinâmica no seu Module, evitando `!important`, regras duplicadas e dependência de ordem de importação.
4. Separar os documentos por finalidade: **README = apresentação**, `STATUS_ATUAL = estado`, `RELEASE_CANDIDATE_CHECKLIST/OPERATIONAL_ACCEPTANCE = gates`, `EXECUTION_STATUS = diário`, ADR = decisão, `INCREMENT_* = histórico`.
5. Reavaliar as funcionalidades opcionais pelo piloto e telemetria autorizada, nunca apenas por preferência visual ou benchmarking de concorrentes.

## 4. Evidências e critérios que não podem ser inferidos

- No início desta auditoria: 216 documentos em `docs/`; branch `feat/v0.10-learning-loop`, PR #35 draft; worktree com **44 arquivos modificados e 19 novos**; CI [#37935122578](https://github.com/wesscosta/arena-dev/actions/runs/37935122578) verde em `cce0758`, anterior ao diff local.
- Última regressão de browser registrada antes desta intervenção: **62/62 Chromium E2E**; não equivale a CI do código consolidado, nem a dispositivo iOS físico.
- Não há evidência registrada de aprovação em campo para PWA v0.9 instalada → v0.10 (iOS/Android), rede móvel/múltiplos dispositivos, leitura assistiva/zoom, piloto docente ou rollback operacional com RTO/RPO. **Todos continuam bloqueadores** do `GO`.
- Migrações históricas V49–V55 e dados persistidos não são objeto de limpeza documental/visual. A V56 é aditiva para resolver um risco operacional demonstrado. Não alterar nem reescrever histórico, pontuação, run IDs ou lógica de sessão por motivos cosméticos.
- Resultados novos dos testes deverão ser registrados com comando/ambiente e **SHA**; nenhuma aprovação pode ser retroativa a código ainda não versionado.

## 5. Resultado da intervenção

**Aplicações de baixo risco:** navegação documental consolidada, dock redundante removido, CSS/fixtures estáticos atualizados, XP acumulado identificado corretamente, entrada manual mais segura. Os testes precisam validar essa mesma árvore de trabalho antes de qualquer commit ou PR.

**Decisão de release inalterada:** candidata técnica; **NO-GO** para tag `v0.10.0` e publicação ampla. Prosseguir somente com evidência de homologação e CI no SHA definitivo.

## 6. Resultado verificável da consolidação local (09/10)

- `frontend/npm test`: **313/313 aprovados**, incluindo revisão de 10 asserções estáticas que exigiam uma interface já substituída pelos componentes de v0.10.
- `npx tsc --noEmit`: **exit 0**.
- `npm run lint`: **exit 0, 0 erros, 94 avisos** (sem alegar que todos sejam preexistentes).
- `npx playwright test --project=chromium`: **62/62 E2E aprovados**, stack Docker isolada com PostgreSQL próprio, duração aproximada de 1,5 min.
- CSS: removidas 77 regras e quatro seletores exclusivamente do dock em `arena-polish.css`, nove regras em `mobile-reflow.css`; o componente da ferramenta manual e suas APIs foram mantidos.
- Documentação: README de 393 para 301 linhas, `STATUS_ATUAL.md` de 296 para 48 e índice de 126 para 39; 17 documentos de referência auditados sem links locais quebrados. **Redução não equivale a eliminar requisitos**: históricos permanecem em incrementos/ADRs existentes e Git.
- Observação: esses resultados provam o estado da **árvore local de trabalho**, não CI no SHA definitivo, VoiceOver/Safari reais, rede física ou aprovação de release.

## 7. Adendo de segurança operacional — V56

Após a auditoria visual, foi implementada uma correção de domínio **específica**: idempotência de `POST /api/score-events` para comandos com `requestId`, preservando clientes históricos sem a chave. O teste PostgreSQL 17 em `ManualScoreIdempotencyIT` passou em 4/4 casos. Veja [ADR-0066](../adr/ADR-0066-manual-score-creation-idempotency.md). Este adendo não substitui o gate CI no SHA final e não transforma os ensaios de rede simulada em homologação real.

## 8. Confirmação local V56 após recuperação do ambiente

- Backend PostgreSQL/Testcontainers: `SecurityAndMigrationIT` e `ManualScoreIdempotencyIT` **10/10 aprovados**; a execução integral anterior registrou 125/126 testes, com única falha de expectativa estática de V55 corrigida e retestada. CI do SHA final ainda necessário.
- Frontend: testes unitários **313/313**, typecheck, lint com zero erros (94 avisos), build e `npm audit --omit=dev` sem vulnerabilidades.
- Stack Docker isolada com migração Flyway V56: backend/frontend saudáveis e **63/63 E2E Chromium**, incluindo HTTP idempotente de XP. A primeira tentativa com `E2E_BROWSER_API_URL` omitida atingiu erroneamente a API local principal e gerou erros 401/429; a repetição com a URL correta passou integralmente.
- A base principal permaneceu na versão existente; migração V56 não foi aplicada ao PostgreSQL principal. Não inferir teste real de iOS/Android, teste físico de rede ou rollback operacional dessas evidências.
