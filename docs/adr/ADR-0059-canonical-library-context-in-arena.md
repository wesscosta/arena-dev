# ADR-0059 — Biblioteca canônica como material contextual da Arena

**Data:** 08/10/2026 · **Situação:** implementada na branch da v0.10, não publicada · **Fatia:** P1-C.

## Decisão e preservação de fronteiras

A Biblioteca é o acervo canônico de materiais e metadados. A Jornada já referencia o mesmo `LearningResource` nos seus estágios. A Arena não deve criar nem copiar outro documento, assumir publicação automática no projetor ou estudante, inferir aprendizagem a partir de um clique, nem alterar o roteiro da aula ao consultar material.

A migração **Flyway V54** cria `arena_session_resource_placements(session_id PK, resource_id FK, updated_at)`, uma referência leve por sessão. A linha pode ser substituída ou removida; nenhum corpo de material é copiado. A API docente é:

- `GET /api/sessions/{sessionId}/contextual-material` — referência ou `null`, título/revisão canônica, `available` quando o material permanece publicado.
- `PUT /api/sessions/{sessionId}/contextual-material` com `{"resourceId":"..."}` — sessão ativa, recurso da Biblioteca **global publicado**, não arquivado nem pertencente a outra turma; atualização idempotente por sessão.
- `DELETE /api/sessions/{sessionId}/contextual-material` — remove apenas o vínculo; conteúdo e eventuais usos na Jornada permanecem.

Os contratos herdam autenticação docente e CSRF. A consulta preserva o vínculo histórico quando um recurso é arquivado, mas retorna `available=false` e a interface não expõe seu corpo. Materiais exclusivos de turmas privadas não são promovidos acidentalmente à Biblioteca. Nenhuma rota pública de estudante/projetor foi adicionada nesta fatia.

## Interface e acessibilidade

Um comando compacto no cabeçalho do cockpit oferece **Selecionar material / Abrir material**, sem mudar a dinâmica, pontuação ou `LiveStage`. O diálogo permite localizar materiais por título/assunto/tag e mostra o conteúdo canônico, com renderização Markdown existente ou link externo **HTTPS** (nova aba, `noopener noreferrer`), sem iframe ou HTML/JS arbitrário. Escape, ciclo de Tab, foco devolvido ao disparador, rótulos e bloqueio da rolagem atrás do diálogo permitem retorno à aula. O reuso no JourneyManager continua pela referência já existente ao mesmo recurso.

## Evidências e limites

- IT PostgreSQL 17 `ArenaResourcePlacementIT`: duas sessões compartilham recurso canônico sem cópia, idempotência de associação, troca de recurso, remoção sem exclusão do acervo, arquivamento preservando histórico mas desabilitando leitura, GET anônimo 401, PUT sem CSRF 403, PUT docente autenticado 200. `SecurityAndMigrationIT` exige V54.
- Playwright `arena-shell.spec.ts`: selecionar, visualizar, Escape e retorno de foco, continuidade do Grid, F5/reabrir Arena, mesmo material canônico e remoção; axe-core com regras WCAG 2 A/AA/2.1/2.2 no diálogo contextual (light/dark). O primeiro ensaio revelou invasão da altura útil da Arena em cinco breakpoints: o atalho foi movido do conteúdo principal ao cabeçalho e os testes repetidos sem remover asserts, inclusive com 22 participantes.
- A auditoria automatizada não equivale à conformidade **WCAG AAA**. Permanecem testes manuais com NVDA/VoiceOver, alto zoom, navegação só por teclado em todas as telas, light/dark, performance de listas extensas e validação docente em aula real. O modal lista o acervo já recuperado; paginação e virtualização de milhares de materiais são etapas futuras.
- Não foi implementado compartilhamento do material com aluno/projetor nem vínculo explícito ao `LearningTarget`/step. Isso exige design de autorização e palco; não inferir resultado de aprendizagem.
- A v0.10 continua em PR draft; sem merge/tag até gates P0 e homologação manual.
