# ADR-0061 — Painel pedagógico docente da sessão (10.9)

**Data:** 08/10/2026 · **Estado:** implementado na branch v0.10, sem publicação/merge.

## Decisão

O painel pedagógico da Arena é um **read model docente**, restrito à sessão ativa/histórica, e reutiliza `LearningCycleService.comparison` em vez de criar outros mecanismos de avaliação. Seu endpoint autenticado é **`GET /api/sessions/{sessionId}/learning-overview`**. Não cria tabela, migração, pontuação, conteúdo duplicado nem altera o palco do aluno/projetor.

Exibe quatro indicadores **operacionais explicitamente separados**: presentes marcados *agora*, ausentes marcados *agora*, ciclos documentados e ciclos com duas verificações encerradas. A base é a lista de `SessionParticipant` da sessão (não a contagem global de turmas; a presença muda durante a aula). Não calcula uma “taxa de aprendizagem” sobre esse denominador: o conjunto dos presentes pode diferir de quem respondeu.

Em cada ciclo, identifica objetivo por título, status `DIAGNOSED/INTERVENED/VERIFIED`, estratégia de intervenção e registro docente já existente. Para ciclos verificados, usa **apenas os pares CORRECT/INCORRECT** devolvidos pelo `LearningCycleService`, mostrando `baseline.responses`, `followup.responses`, `paired`, as **quatro transições** (acerto→acerto; acerto→erro; erro→acerto; erro→erro) e os participantes não pareados. Não mostra nomes/matrículas/IDs dos estudantes; `PARTIAL/NOT_EVALUATED` não é reclassificado como erro. Interpretar melhora imediata como `mastery` é expressamente proibido. O cartão de próxima ação usa a mesma função determinística da recuperação, deixando a decisão com o professor.

## UX, arquitetura e segurança

- Acesso compacto “Painel pedagógico” no **cabeçalho da Arena**. O diálogo aparece em **portal no `document.body`** para evitar regressão do modal Material cortado; não ocupa altura de palco/rail. Possui foco inicial, ciclo de Tab, Escape e foco restaurado, atualização explícita de dados e ação de abrir “Verificar aprendizagem”, sem avançar o roteiro.
- Dados buscados **apenas ao abrir/recarregar**, via endpoint agregado. O servidor resolve o título do objetivo e as comparações dentro de uma transação de leitura. Atualizações de aluno não causam consulta contínua nem registro duplicado; o professor pode clicar “Atualizar dados”.
- O contrato exige papel docente autenticado; não existe endpoint de join/aluno/projetor para as notas da intervenção. Reaproveita os mecanismos existentes de Spring Security e CSRF nas escritas. Testes verificam negação de GET anônimo e isolamento entre sessões.
- Contagem de ciclos e transições **não** soma estudantes únicos: a mesma pessoa pode aparecer em ciclos diferentes, portanto **não existe denominador de ganho longitudinal agregável** nesta versão.

## Gates executáveis e limites

- `LearningCycleIT` + PostgreSQL 17: sessão vazia, status intermediário, resultado depois de duas verificações, título do objetivo, texto da intervenção, contagem pareada correta, cross-session sem vazamento e nenhuma nova afirmação de domínio consolidado.
- `IntegrationPersistenceMigrationIT`: corrige a expectativa antiga que congelava a última migração em V48. A prova é migrar uma base real V25 até a versão instalada e verificar a aplicação da V26, todas as migrações resolvidas e integridade dos IDs/vínculos de Teams. A suíte CI usava `mvn verify` e falhava apenas por essa asserção desatualizada no HEAD anterior; não modificar migrations já aplicadas.
- Playwright: GET anônimo 401, painel sem ciclos, viewport 1792×854→320×320, visibilidade de CTA, Escape/foco, retorno ao palco, cenário completo Learning Check→Before & After com transições observadas e nota docente. Regressão Grid/Roleta/PWA/Quiz/Ranking deve permanecer verde.
- **Fora do gate automatizado:** auditoria manual WCAG AAA/leitor de tela, desempenho p95 de centenas de ciclos numa única sessão, comparação entre aulas/estudantes, métricas longitudinais, viés de ausência/participação, piloto pedagógico e autenticação multi-docente (ADR-0053). Não liberar a v0.10 só por este painel.

## Evidência da execução

A suíte **`mvn verify`** (a mesma ordem CI) passou com **195 testes Surefire + 122 Failsafe** e **0 falhas/erros**; a expectativa fixa V48 do teste de migração foi substituída por assertiva de V26 e resolução integral das migrations V25→V55, com verificações de integridade dos IDs Teams. Frontend format/lint (0 erros, 92 avisos preexistentes), TypeScript, **311 testes** e build aprovados. **35/35 Playwright Chromium** passaram no Docker atualizado, incluindo o painel sem dados, GET anônimo negado, modal sem corte de 1792×854 a 320×320, e o mesmo ciclo real de acerto→erro com texto da intervenção e orientação do professor. Este resultado é um gate **automatizado**, não um piloto nem auditoria de acessibilidade AAA.
