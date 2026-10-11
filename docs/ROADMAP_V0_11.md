# Arena Dev v0.11 — roadmap e execução incremental

**Estado:** **desenvolvimento v0.11 concluído**, 11.0–11.6 integradas à `main`, merge `2c1e011`; [CI 3/3 aprovado](https://github.com/wesscosta/arena-dev/actions/runs/38098271861). **Homologação operacional NO-GO** até os oito gates. [Fechamento técnico](v0.11/11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md). **v0.12 em separado:** [roadmap de redesign e Active Learning](ROADMAP_V0_12.md).
**Baseline confirmada:** v0.10.0 publicada em 10/10/2026 (PR #35, tag e GitHub Release). Seus limites de campo e de implantação continuam registrados na própria release.
**Artefatos 11.0:** [índice e evidências](v0.11/README.md), [ADR-0067](adr/ADR-0067-material-presentation-v011.md).
**11.1 integrada:** backend V57 e testes [execução e limites](v0.11/11.1_EXECUTION_STATUS.md). **11.2 validada e integrada** (leitor seguro e apresentação docente): [status 11.2](v0.11/11.2_EXECUTION_STATUS.md). **11.3 concluída e integrada:** [execução](v0.11/11.3_EXECUTION_STATUS.md) e [validação de fechamento](v0.11/11.3_VALIDATION_CLOSURE_2026-10-10.md).
**Referências:** [ROADMAP_V0_10.md](ROADMAP_V0_10.md), [Projeção de materiais da Arena](ux/arena-material-projector-proposal.md), ADR-0045/0046/0052/0059.

## Objetivo geral

Evoluir a Arena e a Jornada sem duplicar material canônico, conservando a separação **estudo sequencial (Jornada)** / **atividades e entregas** / **condução síncrona (Arena)**. Consolidar conteúdo, autoria, proveniência e uso pedagógico de materiais e questões de forma progressiva, mantendo interfaces acessíveis e estado autoritativo.

## Entregas candidatas

| Prioridade | Capacidade | Objetivo | Gate |
| --- | --- | --- | --- |
| P1 (proposta) | **Projeção de material da Biblioteca na Arena** | Professor apresenta conteúdo canônico e navega por seções; projetor exibe somente o conteúdo autorizado, sem lista da Biblioteca | Autorização, acessibilidade, segurança e sincronização/reconexão validadas |
| P1 (planejamento) | Base de conteúdo com autoria/proveniência/revisão | Referenciar origem e revisão do material reutilizado por Jornada e Arena | Modelo sem perder histórico e sem duplicar documentos |
| P1/P2 (discovery) | Taxonomia e questões alinhadas ao blueprint de avaliação | Preparar competência/assunto, com autoria e validação auditáveis | Validação pedagógica e arquitetura de dados antes de nova API |
| P2 (exploração) | Integração entre apresentação e jornada | Apresentar conteúdo sem confundir exposição com leitura/conclusão/mastery | Sem pontuação, progresso ou evidência por simples visualização |

Nenhum item autoriza geração de conteúdo/questões por IA ou publicação automática sem revisão humana e controle de proveniência.

## Fatias técnicas para projeção da Biblioteca (v0.11)

### 11.M1 — Autorização, contrato e auditoria

- Ação **Apresentar material** explícita e separada de **Vincular material** e de **Projetar janela**.
- Estado público versionado por sessão, gerenciado no backend (p.ex. modo de palco `MATERIAL`, `resourceId`, revisão fixada, seção ativa, status/publicação), integrável ao mecanismo existente de `LiveStage` sem criar um segundo estado concorrente.
- Publicação somente pelo professor autorizado à sessão e ao recurso; revogação ao retirar material, encerrar sessão e quando o recurso ficar indisponível.
- Endpoint/snapshot público expõe **apenas** a revisão explicitamente publicada e segura para exibição. Nunca concede acesso geral à Biblioteca ou metadados privados.
- Auditoria de publicação, troca de seção, retirada e condições de erro; confirmar contrato e migração antes de codificar.

### 11.M2 — Leitor e palco de apresentação

- Professor permanece no leitor de material na Arena, com navegação estrutural (títulos e seções) reutilizando os anchors estáveis do conteúdo canônico.
- Projetor reutiliza o renderer Markdown seguro, em modo leitura, com `<aside>`/callouts, listas, tabelas, imagens autorizadas, código e tipografia própria de projeção.
- Não projetar a lista de arquivos, busca, modais, controles de edição, progresso individual ou painel do professor.
- Abertura sem material publicado, material removido, revisão alterada, conteúdo muito longo e LINK externo têm estados e fallback explícitos.

### 11.M3 — Navegação sincronizada e reconexão

- Mudança deliberada de seção envia identificador estrutural (`anchorId`) e versão de estado; nada de sincronização por pixels de rolagem.
- Reconexão/reload recebe modo e seção do snapshot autoritativo; testar ordem de eventos, dispositivo secundário e latência.
- **Voltar às dinâmicas** restaura palco anterior sem iniciar/encerrar rodadas, alterar XP ou avançar roteiro automaticamente.

### 11.M4 — Homologação pedagógica e operacional

- Testes API de autenticação/autorização, material não publicado, revogação e conteúdo malicioso.
- E2E professor → projetor → mudança de seção → reconexão → encerramento, incluindo desktop e Safari iOS, temas, zoom e teclado.
- Piloto com turma real para validar redução de alternância de abas, legibilidade do conteúdo, qualidade da condução e necessidade de controles adicionais.

## Eixo transversal de melhoria de UI/UX (planejamento, não v0.10)

- Auditoria responsiva por tela e por persona (docente desktop/mobile, aluno, projetor), incluindo Safari/iOS e PWA. Priorizar tarefas recorrentes, legibilidade, consistência de navegação e densidade de informação.
- Revisar ergonomia e estados operacionais das dinâmicas (início/coleta/resultado/confirmação/XP) sem criar ações redundantes ou experiência visual semelhante a apostas.
- Simplificar formulários, modais, menus, feedback de reconexão e acesso a recursos; reduzir cliques somente quando preservada a intenção pedagógica e a prevenção de erros.
- Investigar acessibilidade manual (foco, leitura assistiva, zoom, contraste e alvos de toque) com critérios testáveis em vez de prometer AAA sem auditoria.
- Manter roadmap modular e priorizar por evidência de uso/piloto; protótipos e comparações com concorrentes não são aprovação automática para implementar novos componentes.

## Não incluir nessa fatia

- Editor duplicado da Biblioteca/Jornada dentro da Arena.
- Publicação de toda a turma/acervo com o código de acesso à sessão.
- Iframe arbitrário/HTML ativo e dados individuais no palco público.
- Geração automática de slides, material ou evidências de aprendizagem.

## Próxima decisão de planejamento

11.0–11.6 já integradas e aprovadas em CI; novos incrementos visuais/pedagógicos entram **somente na v0.12**. Para publicar a v0.11 ainda são necessárias evidências reais Safari/iOS/VoiceOver, PWA, rede, piloto, backup/rollback, segurança e GO assinado. CI não equivale à publicação. [Gates](v0.11/11.0_PLANO_GATES.md) · [fechamento](v0.11/11.6_TECHNICAL_CLOSURE_NO_GO_2026-10-10.md).
