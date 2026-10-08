# ADR-0053 — Limite de segurança da conta docente única na v0.10

**Estado:** aprovado como restrição de rollout em 08/10/2026. **Natureza:** limitação operacional explícita; não equivale a autorização multi-tenant implementada.

## Contexto

O Spring Security usa `InMemoryUserDetailsManager` com uma conta `ROLE_TEACHER` configurada por ambiente. A associação persistida professor↔turma **não existe** nesta linha de arquitetura. O acesso do estudante é distinto, feito por código/token de sessão. O serviço de sorteio e o LearningCycle já validam vínculo de IDs à sessão, mas isso não prova propriedade de recurso entre professores quando houver várias identidades.

## Decisão

1. Operar a v0.10 exclusivamente no modo **um operador docente autenticado por implantação**, até a introdução de identidade de professor/turma com autorização de recurso. Não comunicar isolamento entre docentes como funcionalidade entregue.
2. Preservar `ROLE_TEACHER` e CSRF em toda API administrativa, com testes HTTP de anonimato, ausência de CSRF, sessão inválida e comandos concorrentes. Projeções de aluno/projetor só via endpoints públicos com audiência restrita.
3. Bloquear implantação com múltiplos professores independentes, compartilhamento de credenciais entre turmas organizacionais ou anúncio de SaaS multi-tenant antes de uma migração apropriada de `teacher_accounts`, `classroom_memberships`, owner/audit e aplicação de policy central a **todos** os domínios, não só ao Sorteio.
4. Registrar essa restrição no gate de release e avaliar mudança de escopo antes de produção aberta. As chaves de configuração continuam fora do Git; rotas administrativas continuam privadas.

## Consequências

A migração de identidade institucional é trabalho transversal e não deve ser improvisada como correção local dentro de uma release de dinâmicas. O QA da v0.10 pode certificar **segurança no modelo de um operador**, com a ressalva explícita de que não valida múltiplos docentes isolados. Desbloquear uso institucional em produção exige ADR, migração, testes cross-tenant e revisão de acesso para Biblioteca, Jornada, Atividades e Arena.
