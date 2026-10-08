# ADR-0060 — Autoconfiança opcional, separada da evidência, e recuperação determinística

**Data:** 08/10/2026 · **Situação:** implementada na branch da v0.10, ainda não publicada · **Escopo:** P1-D + Recuperação guiada.

## Decisão de domínio e privacidade

`learning_evidence.confidence` significa confiança **técnica** da interpretação/avaliação, jamais percepção do estudante. A nova tabela **V55** `learner_confidence(run_id, participant_id, level, timestamps)` guarda apenas autopercepção opcional `LOW`, `MEDIUM`, `HIGH` ou `SKIPPED` após a pessoa ter enviado sua própria resposta. A chave primária conjunta garante um registro por pessoa e execução; operações repetidas são idempotentes e alterações conscientes são permitidas enquanto a verificação recebe respostas e não revelou gabarito. Após lock/close, não aceita mais alterações, inclusive SKIPPED.

A API pública **não** aceita `studentId`/`participantId` vindo do cliente. Usa o contrato existente de código da sessão com token do participante:

- `POST /api/join/{code}/learning-check/{runId}/confidence` corpo `{ "token":"...", "level":"LOW|MEDIUM|HIGH|SKIPPED" }`; rejeita ausência de resposta, run de outra sessão, ausência de token, run já fechado/bloqueado e declaração após revelar resultado.
- `GET /api/join/{code}/learning-check/{runId}/confidence?token=...` retorna somente a declaração do próprio participante (ou null). Além disso, `LearningCheckParticipantState.selfConfidence` restaura exclusivamente sua percepção após refresh/reconnect.
- `GET /api/sessions/{sessionId}/learning-checks/{runId}/confidence-summary` é **somente docente com autenticação e CSRF aplicável**: retorna a distribuição agregada de LOW/MEDIUM/HIGH/SKIPPED **após bloqueio**, com mínimo de **3 declarações**. Antes disso informa indisponibilidade sem contagens de casos pequenos e sem identificadores pessoais.

Nunca altera `LearningEvidence`, avaliação correta/incorreta, ScoreEvent, pontuação, ranking, progressão nem atribui domínio consolidado. O SKIPPED evita obrigar a pessoa a participar. O backend é a fonte de verdade e serializa escrita com bloqueio transacional no `InteractionRun` para conciliar com encerramento e correção. A UI mostra botões de largura/área de toque adequadas e explica que não há pontos ou nota.

## Recuperação vinculada a evidências reais

Após o `LearningCycle.comparison` avaliado, um helper **determinístico e transparente** interpreta somente pares válidos (CORRECT/INCORRECT): sem pares → sem inferência; erro persistente → retomar exemplos e verificar novamente; acerto→erro → investigar oscilação; erro→acerto → melhora **neste instrumento**, sem mastery; estável → testar aplicação em outro contexto. Critérios e contagens são exibidos ao docente.

O painel consulta a **Biblioteca canônica** por título/assunto/tag do objetivo e oferece, a critério do professor, o comando "Vincular à Arena" via API V54. Nenhuma duplicação nem publicação automática para o aluno ou projetor. Não é IA nem recomendação psicométrica; abrir material não conclui recuperação e não emite `LearningEvidence`. Só um **novo `InteractionRun` avaliado** pode produzir evidência adicional. `LearningCyclePanel` continua expondo comparação antes/depois original sem alterar denominadores, XP ou sequência.

## Critérios de qualidade

- Testcontainers PostgreSQL 17: migrações V1–V55; token inválido e identidade não aceita, sem resposta bloqueado; repetição de comando, SKIPPED, refresh com a própria percepção, bloqueio após lock, nenhum ScoreEvent e agregado retido quando amostra menor que 3; amostra 3 libera apenas distribuição sem nomes/IDs.
- Frontend: testes unitários para os 5 cenários de recuperação e contrato de estado vazio; E2E Chromium aluno/Docente com percepção, reconnect, bloqueio, comparação real, escolha manual de material e ausência de XP. Gate executado: **194 testes Surefire PostgreSQL/Java sem erros, 311 testes de frontend, typecheck e build; 33/33 testes E2E Chromium**. Teste HTTP verifica respostas de token inválido (tratadas como requisição inválida), amostra privada e SKIPPED; não interpreta 400 como autenticação bem-sucedida.
- Privacidade e significado: distribuição de autopercepção **não** é desempenho real; evidência avaliada **não** é mastery; recomendação contextual **não** é recuperação concluída.

## Limitações e gates

- A distribuição é medida por participação voluntária e **não** deve comparar turmas com taxas de adesão distintas como se fosse teste padronizado.
- A sugestão de material usa metadados literais (título/assunto/tag) da Biblioteca, não correspondência semântica validada por docente. Não há cluster individual, diagnóstico clínico, personalização algorítmica ou IA. O docente decide o material, conduz a intervenção e registra uma nova verificação.
- Homologação real de acessibilidade/tecnologias assistivas, mobile/PWA v0.9 instalada, comportamento sob redes móveis e avaliação pedagógica com professores seguem em aberto. ADR-0053 de operador único impede alegar SaaS multi-docente.
- O PR continua draft, sem merge/tag nem declaração da v0.10 concluída.
