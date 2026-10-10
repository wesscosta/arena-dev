# ADR-0055 — Clínica do Erro baseada em distribuição real e interpretação docente

**Data:** 08/10/2026 · **Estado:** aceita para incremento P1-B na branch v0.10.

## Decisão pedagógica

A Clínica do Erro não é mais um modo de quiz nem um diagnóstico automático. A mesma `InteractionDefinition` e o `InteractionRun` nativos são a fonte de verdade. Após o encerramento e avaliação da verificação, o professor analisa **contagens reais por alternativa**, observa distratores efetivamente escolhidos e registra sua interpretação autoral em até 1200 caracteres. As respostas individuais e o gabarito não são enviados ao projetor pela Clínica. Sem nova pontuação, mastery ou avanço automático do roteiro.

Não inferir que a escolha de uma alternativa prova a causa do erro. As anotações são hipóteses/explicações de ensino, não rótulos atribuídos ao aluno, nem evidência clínica, nem competência validada.

## Implementação

- **V52 aditiva**: `learning_error_clinic_notes` com `session_id`, `run_id`, `option_key`, `command_id` (idempotência por run), `teacher_note`, timestamp, índices e constraints. Registros são **append-only**; novas orientações não apagam anteriores. Não duplicar o banco de questões, o motor de avaliação ou `LearningEvidence`.
- Endpoint de leitura exclusivo ao professor: `GET /api/sessions/{sessionId}/learning-checks/{runId}/error-clinic`, com `responseCount`, `options {key,label,count,incorrect}`, histórico e aviso interpretativo.
- Endpoint de escrita: `POST .../error-clinic/notes` com `{commandId,optionKey,note}`, lock da sessão, verificação de run da mesma sessão, run **CLOSED**, respostas e evidências avaliadas completas, alternativa existente **incorreta com contagem > 0**, limite e trim de texto. Retry idempotente retorna a mesma vista, enquanto reutilizar chave com conteúdo divergente é HTTP 409.
- `SessionEvent` do tipo `ERROR_CLINIC_NOTE_ADDED` registra somente `runId` e `optionKey`, sem texto da interpretação nem identidade do estudante. A nota fica no recurso docente protegido.
- UI como seção expansível na verificação encerrada: expõe apenas as alternativas de fato observadas, previne seleção da correta e mantém o fluxo da Arena/roteiro sob comando do professor.
- Reutilização pedagógica: após registrar a hipótese e discutir/revisar o conteúdo, o professor usa a função nativa **Perguntar novamente** e pode complementar o LearningCycle Antes/Depois. Nenhum script/IA de explicação é gerado automaticamente.

## Critérios, riscos e fronteiras

- Cobertura: JPA/Flyway PG17, erro em run aberto/vazio, alternativa correta ou sem respostas, sessão errada, duplicação e reuso de chave, auditoria, auth/CSRF HTTP, E2E docente/aluno preservando privacidade.
- Limitação de identidade multi-docente permanece a ADR-0053. O resultado não comprova causa de erro ou aprendizagem consolidada.
- [Issue #36](https://github.com/wesscosta/arena-dev/issues/36): o acúmulo de mais de 300 turmas/sessões no banco local de testes expôs **N+1 na hidratação do Dashboard**: clientes fazem um número de requisições proporcional a turmas/sessões, incluindo `/mechanics`, levando o Chromium a `ERR_INSUFFICIENT_RESOURCES`. Isso é bloqueio P0 de escala; **não limpar dados nem mascarar a falha como aceite**. Executar E2E em stack isolada e planejar read-model batch/paginação, hidratação de sessão por demanda e perf tests antes do go/no-go da v0.10.
