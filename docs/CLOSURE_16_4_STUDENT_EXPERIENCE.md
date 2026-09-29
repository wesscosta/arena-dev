# Fechamento do ciclo 16.4 — Student Experience Shell

**Data:** 28/09/2026  
**Status:** 16.4A–16.4D tecnicamente concluídos; hardening de release permanece separado.

## Escopo encerrado

- **16.4A — Student Workspace Visibility:** liberação explícita da turma para estudo persistente, default OFF, política centralizada e suporte ao mesmo aluno em múltiplas turmas.
- **16.4B — Live dentro do Student Shell:** descoberta de sessões ativas das turmas do aluno sem misturar a regra de publicação de Journey; entrada continua reutilizando o runtime existente.
- **16.4C — Journey Discovery & Redemption:** código de acesso para descoberta/associação de Journey e persistência de acesso/progresso.
- **16.4D — Achievements Foundation:** marcos persistentes derivados do progresso real, globais ao Student, idempotentes e sem XP implícito.
- **Student Shell:** Home, Jornadas, Reader, Live e Conquistas compartilham navegação e linguagem visual.
- **Journey UX:** timeline progressiva, capítulos recolhíveis, recolher/expandir tudo, estados concluído/atual/pendente/bloqueado e retomada.
- **Reader:** medida editorial responsiva, navegação anterior/próximo e zoom global da área de estudos.
- **Acessibilidade visual:** iconografia SVG consistente, foco visível, targets ampliados e Style Guide próprio.
- **Conteúdo importado:** excerpts de Markdown sanitizados e metadados técnicos de ingestão não são expostos como descrição pedagógica ao aluno.
- **Home do aluno:** separação semântica entre sessão ao vivo e Journey persistente; cards seguem o mesmo eixo e ocupam a largura útil do container.

## Decisões consolidadas

1. `/join` continua sendo entrada pública/transitória; não é substituído pelo workspace persistente.
2. Journey representa estudo sequencial: **Journey → capítulo/módulo → conteúdo → progresso**.
3. Aula ao vivo e estudo persistente são experiências relacionadas, mas não a mesma coisa.
4. A preferência de zoom é global ao conteúdo do Student Shell; o chrome da aplicação permanece estável.
5. Descrição pedagógica pode aparecer ao aluno; proveniência técnica da importação não.
6. Estado não deve depender somente de cor e caracteres Unicode não são a linguagem primária de iconografia funcional.

## Gates executados

- frontend typecheck;
- suíte frontend: **271 testes**;
- build de produção Next.js;
- `git diff --check`;
- suíte backend completa (`mvn -q -f backend/pom.xml test`) aprovada no fechamento;
- suíte frontend: **271/271 testes**, typecheck e build de produção aprovados no fechamento;
- `git diff --check` aprovado.

## Pendências conhecidas

### Antes de release/tag da v0.8
- auditoria manual final de acessibilidade: contraste medido, teclado, leitor de tela, text spacing, reflow/zoom e foco não obscurecido;
- validação visual final em mobile e larguras representativas, incluindo ultrawide;
- consolidar as camadas históricas de `study.module.css` depois do gate visual, removendo overrides redundantes sem alterar a UI aprovada;
- executar clean-install/migrations e restore-check do release quando a v0.8 for efetivamente preparada para publicação;
- E2E do fluxo completo do aluno ainda é desejável para o release.

### Fora deste ciclo
- **16.5 — Content Library & Reuse:** próximo domínio candidato; requer decisão arquitetural sobre ownership, proveniência, versionamento e referência vs. snapshot.
- piloto real com alunos/professor e coleta de métricas continuam necessários para fechar a v0.8 como versão de produto.

## Próximo ponto de decisão

Não iniciar automaticamente uma feature grande. Primeiro escolher entre:

1. **hardening curto do Student Shell** (CSS + auditoria de acessibilidade/E2E), se o objetivo for preparar release; ou
2. **16.4D Achievements Foundation**, se a prioridade for completar a fundação de gamificação; ou
3. **16.5 Content Library & Reuse**, se a prioridade for acelerar criação/reuso de material pelo professor.

A biblioteca permanece deliberadamente separada do ciclo encerrado para evitar ampliar novamente o escopo da Journey.
