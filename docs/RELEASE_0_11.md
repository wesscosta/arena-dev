# Arena Dev v0.11.0 — Material Presentation e Jornada (pré-release)

**Situação em 24/10/2026:** desenvolvimento funcional encerrado; candidata **v0.11.0-rc.8**, com homologação operacional **NO-GO**. A rc.8 substitui rc.7 como candidata técnica após a tag no SHA validado. A última versão estável permanece v0.10.0.

## rc.8 — fechamento funcional e estabilização (24/10/2026)

- **Material e projetor:** publicação versionada, leitor seguro, navegação por seções, reconexão e revogação, com autorização explícita.
- **Jornada:** professor libera os primeiros N capítulos/módulos inteiros de uma Jornada publicada (0..total); bloqueio efetivo no backend e preservação da conclusão. Progressão legada mantida até ativação docente. Flyway **V66**.
- **Aluno:** menu mobile completo, Configurações centralizadas e remoção de controles duplicados da entrada ao vivo incorporada.
- **Integridade:** gestão de turmas/participantes, rascunhos, dependências, experiências de Atividades e validação E2E de liberação/rebloqueio.
- **Qualidade:** regressão Java/PostgreSQL, frontend, TypeScript e E2E Chromium/WebKit. [Evidências e limites](v0.11/11.10_RELEASE_INTEGRATED_REGRESSION_2026-10-24.md).
- **Metadados:** backend, frontend e lockfile em **0.11.0-rc.8**, migrações **V1–V66**.
- **Limite:** esta pré-release **não é versão operacional homologada**. Oito gates 11.6 seguem pendentes na [issue #110](https://github.com/wesscosta/arena-dev/issues/110).

## Principais entregas da candidata

- Apresentação de material da Biblioteca na Arena: snapshot imutável por publicação (V57), sem segunda Biblioteca e sem expor o acervo pelo código do projetor. [ADR-0067](adr/ADR-0067-material-presentation-v011.md).
- Leitor seguro no projetor com controles explícitos de publicar/retirar e renderer Markdown único (11.2/11.4).
- Navegação sincronizada por `anchorId`, CAS por `stageVersion`, comandos idempotentes de seção (V58) e reconciliação após reconexão (11.3).
- UX responsiva, foco/rolagem, CSP e segurança do frontend, WebKit emulado em CI (11.4).
- Discovery editorial e de proveniência sem nova API/DDL; ADR-0068 apenas proposta (11.5).
- Gate técnico 11.6: E2E com dois projetores, offline/reconexão/revogação e verificador fail-closed.
- Coerência e acessibilidade (11.7): títulos e espaçamentos por papel tipográfico do Design System; cor da turma visível e adaptada ao tema claro; correções WCAG AA nos dois temas e contraste de texto em nível AAA (7:1) nos tokens do sistema, verificados por axe nos elementos mensuráveis; cores de turma em AA. **Mudança visual perceptível:** títulos de página a 30px e alinhados entre as páginas; controles de barra de ferramenta com 44px; tema claro menos luminoso; brilhos neon removidos; textos secundários mais contrastados; novo favicon e ícones da PWA com a marca da interface. [Detalhes](v0.11/11.7_COHERENCE_AA.md).

## rc.7 — área de estudos legível nos dois temas e ajustes do professor (20/10/2026)

- **Contraste do `/learn` (Jornadas, leitor e prévia do professor).** O CSS da área do aluno tinha 150 cores fixas do tema escuro e definia texto quase branco para toda a área; no tema claro, código e a barra de prévia ficavam sem contraste. As cores viraram variáveis: o escuro usa tons medidos para pelo menos 7:1 (antes alguns cinzas tinham 3,1–6,9:1) e o claro usa os tokens do tema. Blocos de código ficam escuros nos dois temas. A varredura WCAG A/AA e de contraste AAA passou a cobrir a prévia da Jornada e o leitor, nos dois temas; ela reprovava os dois temas antes da correção e passa sem violações depois.
- **Adicionar material a uma Jornada.** A turma aparecia como grupo vazio e não clicável quando não tinha Jornada em rascunho. Agora Jornadas publicadas aparecem desabilitadas com o motivo e, sem rascunho, a tela explica o que fazer.
- **Impedir cópia.** A chave aparece também em Jornada publicada (salva na hora) e não quebra mais a linha nos editores.
- **Salvar conteúdos na Biblioteca.** Nova ação no menu da Jornada: cada etapa vira um material independente na Biblioteca, sem alterar a Jornada; o que já está na Biblioteca é pulado e a proteção contra cópia é herdada. Duplicar uma Jornada inteira como modelo fica para a v0.12.

## rc.6 — bugs de sala da auditoria SOLID (20/10/2026)

| Bug | Correção | Gate afetado |
| --- | --- | --- |
| Grupos montados e ainda não salvos eram apagados por qualquer outra atualização da Arena (sorteio, Boss, troca de apresentação) | a composição só é trocada quando o conteúdo salvo muda e nunca enquanto há edição não salva | `teacher_pedagogical_pilot` |
| Boss, questões da Arena e roteiro liam e gravavam o estado sem trava: cliques rápidos ou duas abas perdiam um dano | toda alteração de dinâmica trava a sessão antes de ler e gravar, como o sorteio já fazia | `teacher_pedagogical_pilot` |
| O celular do aluno aplicava atualizações de palco na ordem de chegada; com rede ruim podia voltar a um palco antigo | `stageFromEvent`, compartilhado com o projetor, aplica o palco na ordem do `stageVersion` | `network_degraded_two_projectors` |

**Nova opção do professor — impedir cópia do conteúdo (Flyway V61).** Uma chave na Jornada e outra no material da Biblioteca. O conteúdo fica protegido no leitor do aluno quando qualquer uma está ligada; um material protegido continua protegido em qualquer Jornada que o use. Bloqueia seleção, copiar, recortar, arrastar e o menu do botão direito no texto e no código; campos de resposta continuam aceitando colar. Desligada por padrão e alterável depois de publicar. Desencoraja a cópia, mas não a impede (captura de tela e ferramentas do navegador continuam funcionando). Antecipa o requisito D12-JR-CODE-01 da v0.12, ampliado para todo o conteúdo e para o material.

Também: estado salvo ilegível continua caindo no padrão, mas registra aviso no log; os erros de API do frontend estendem `HttpApiError`; oito funções sem uso removidas. Cada bug tem teste novo (`MechanicsConcurrencyIT`, E2E de grupos não salvos, `stage-from-event.test.ts`). Desenho (estado tipado, divisão do `MechanicsService`, interface de dinâmicas, cliente de socket único, decomposição do `ArenaApp`) fica para as bases da v0.12.

## rc.5 — robustez de sala (20/10/2026)

Sete PRs planejados a partir da [auditoria da rc.3](https://app.notion.com/p/3fef3eb198c381148bdcf38b4cdee1ab), todos antes dos gates de campo, porque cada um afeta pelo menos um gate. Flyway passa a **V60**.

| Área | Mudança | Gate afetado |
| --- | --- | --- |
| Tempo real | Envio por socket com limite de tempo (3s) e buffer (512 KB); cliente lento é desconectado e reconcilia por snapshot; varredura fecha sockets sem atividade há 60s; cliente envia PING a cada 25s e reconecta sem resposta em 10s | `network_degraded_two_projectors` |
| Sessão do professor | Duração configurável pelo professor em Configurações (30 a 720 min, padrão 4h, V59); sessão expirada abre novo login sem perder a tela | `teacher_pedagogical_pilot` |
| Limites de entrada | Login e entrada do aluno com limite por cliente; IP real só de proxies internos; mensagem única para aluno inexistente ou ambíguo | `teacher_pedagogical_pilot` |
| Dados dos alunos | "Apagar dados pessoais" troca nome, matrícula e apelido por pseudônimo e apaga aparelhos lembrados e vínculos externos, preservando o XP (V60); backup cifrado com `age` e rotação | `backup_restore_rollback` |
| Observabilidade | Logs de conexão e fechamento por lentidão ou inatividade; `GET /api/diagnostics/sessions/{id}`; estado inválido vira 409 | todos (evidência) |
| Operação | `scripts/arena.sh` (install, upgrade, backup, restore, status), perfil de sala só com o frontend na rede, HTTPS opcional com Caddy; README "Operação em sala" | `release_owner_go_nogo` |
| Feedback | Erros ficam na tela até serem fechados e são anunciados como alerta; QR e endereço completo no rodapé do projetor; aula ao vivo primeiro no `/learn` | `teacher_pedagogical_pilot` |
| CI | Teste que só passa na repetição falha; E2E falha em erro de console, de script ou de CSP; tabela evento → público; um Postgres por JVM nos testes de integração | todos |

Fica para a v0.12: "Tentar de novo" em cada erro e "você foi chamado(a)" só para o sorteado.

## rc.4 — correções da auditoria de 19/10/2026

A [auditoria da rc.3](https://app.notion.com/p/3fef3eb198c381148bdcf38b4cdee1ab) (desenvolvimento, solução, UX/UI e game design) achou defeitos que os gates de campo pegariam. A rc.4 corrige os de esforço pequeno:

| Defeito | Correção |
| --- | --- |
| Foco roubado a cada segundo nos drawers da Arena (o relógio da sessão re-renderiza o `ArenaView` e o efeito do drawer devolvia o foco ao botão fechar); provável causa do teste de Spotlight instável no CI da rc.3 | `onClose` guardado em ref no `ArenaToolDrawer`, no modal de resultados externos e no assistente de Jornada; E2E de regressão digita no drawer de Pontuação enquanto o relógio avança |
| Nome civil do aluno enviado a todos os celulares em `PARTICIPANT_CONNECTED/DISCONNECTED` | eventos só para o professor (`broadcastTeachers`), com teste de audiência |
| Postgres do perfil de desenvolvimento publicado em todas as interfaces com a senha padrão, e o README orienta esse perfil na LAN | porta ligada a `127.0.0.1` por padrão (`POSTGRES_BIND`) |
| Anel de foco no tema claro com ~2,5:1 (WCAG 1.4.11 exige 3:1) e campos que anulavam o contorno | anel com `--ds-accent-text`; campos com contorno visível em `:focus-visible` |
| Página de Conquistas com template literals escapados (barra, `aria-label` e estado quebrados) | corrigida; teste impede `\${` escapado no código |
| Texto técnico no celular do aluno durante o sorteio ("definido pelo backend") | texto de orientação ao aluno |
| Status de conexão do aluno com 8px | 12px, anunciado (`role="status"`) |
| Ranking "Todos" projetava quem tinha zero ponto; anonimização desligada por padrão | o projetor mostra só quem já pontuou; anonimizado por padrão; texto explica que o XP soma participação e acertos |
| Variáveis `ARENA_AI_*` não chegavam ao container | repassadas no `compose.yaml` |

Fica para a v0.12: mostrar "você foi chamado(a)" só ao sorteado (exige uma visão do palco por participante). Itens maiores da auditoria seguem em "Riscos residuais" e no roadmap.

**Correção de registro:** a rc.1 a rc.3 afirmavam "WCAG AA nos dois temas". Isso valia para contraste de texto e para as regras medidas pelo axe, não para o indicador de foco no tema claro, corrigido nesta rc.

## rc.3 — CSP restrita ao próprio host e varredura do aluno e do projetor

- `connect-src` deixa de aceitar **qualquer** destino `wss:`. A política passa a ser montada por requisição em `frontend/proxy.ts` e lista só `ws://` e `wss://` do host que serviu a página (o cliente de tempo real sempre conecta na origem da página, e o `/ws` é repassado ao backend) e a origem configurada da API. `Host` malformado é descartado. `/api` e `/ws` ficam fora do proxy.
- Prova automatizada: `e2e/csp-websocket.spec.ts`, em Chromium e WebKit, verifica o cabeçalho, bloqueia um WebSocket para host externo e não bloqueia o do próprio host. A confirmação em Safari/iOS físico fica no gate `ios_safari_physical`.
- Varredura axe (A/AA e contraste de texto AAA) ampliada para a entrada do aluno, a sessão ao vivo do aluno e o projetor, nos dois temas.
- Metadata `0.11.0-rc.3`.

## rc.2 — correção de segurança do Next.js

Os avisos do Next.js de 14/10/2026 cobrem a faixa `16.0.0`–`16.4.0`; a `rc.1` usava `16.3.8`. A `rc.2` atualiza para **`next@16.4.2`** (e `eslint-config-next`), sem outras mudanças de dependência, e desliga o otimizador de imagens (`images.unoptimized`), que o produto não usa.

| Aviso | Gravidade | Exposição na rc.1 |
| --- | --- | --- |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) (CVE-2026-96889), RCE no Image Optimization com SVG | crítica | baixa: sem `next/image` nem `remotePatterns`, `sharp` 0.35.5 já corrigido no lockfile, imagem Alpine (musl); o endpoint `/_next/image` existia e agora fica desligado |
| [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), RCE em funções `use cache` | crítica | nenhuma: o código não usa `use cache` |
| [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), DoS em Server Actions | alta | não identificada: o código não define Server Actions |

`npm audit --omit=dev`: 0 vulnerabilidades. Os 5 avisos altos restantes (`braces`) estão só nas ferramentas de desenvolvimento e não entram na imagem de produção.

## Compatibilidade e implantação

- Migrações Flyway V57–V58, aditivas sobre V56. O retorno à v0.10 exige **restore do backup V56 pré-upgrade**; publicações e comandos de seção gravados após o upgrade são perdidos no rollback.
- Ensaio isolado: `scripts/release/rehearse-v010-v011-rollback.sh` (tag `v0.10.0` → candidata → restore V56 → v0.10). Usa apenas containers descartáveis e dados sintéticos.
- Gate final: `scripts/release/release-gate.sh final --ci-run-url URL --backup DUMP_V58 --attestation ACEITE_PRIVADO.json`, com metadata `0.11.0` exata na `main`.
- Clientes PWA v0.10 instalados precisam do gate `android_pwa_upgrade` antes do GO.

## Riscos residuais a decidir antes do GO

- CSP mantém `script-src 'unsafe-inline'` (bootstrap do Next.js). Aceitar com mitigação registrada ou migrar para nonce em release própria.
- ~~`connect-src` permite qualquer host `wss:`~~ **resolvido na rc.3**: só o host da página e a API configurada. Falta a confirmação em Safari/iOS físico (`ios_safari_physical`). Limite conhecido: atrás de um proxy reverso que reescreva o cabeçalho `Host`, o WebKit antigo depende de `'self'` cobrir `ws`/`wss`; o proxy deve preservar `Host`.
- Direitos de material de terceiros dependem de responsável editorial/jurídico (ADR-0068 proposta).
- Da auditoria de 19/10 (antes do GO): anonimização/eliminação de aluno e retenção (LGPD); entrada do aluno sem rate limit e com enumeração por mensagem; envio de WebSocket sem backpressure e PONG ignorado (a confirmar); rate limit de login com chave pelo IP do proxy (a confirmar); runbook e backup automático antes do upgrade; observabilidade mínima.

## Publicação (somente após GO)

1. PR com metadata `0.11.0` integrado na `main`; CI 3/3 nesse SHA.
2. Ensaio de rollback executado no SHA candidato e registrado.
3. Backup V58 com SHA-256 validado por `verify-backup.sh`.
4. Gate final com aceite privado; tag anotada `v0.11.0` e GitHub Release apenas com autorização explícita do responsável.
