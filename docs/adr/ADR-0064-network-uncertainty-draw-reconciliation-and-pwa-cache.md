# ADR-0064 — Conciliação após falha de rede no sorteio e atualização PWA controlada

**Data:** 08/10/2026 · **Estado:** implementado na candidata v0.10; sem merge/publicação.

## Problema

Um POST pode ser persistido no backend, mas sua resposta HTTP ser perdida. O cliente antes tratava essa perda como falha genérica; ao tentar novamente, o professor poderia emitir **um novo UUID de comando**, criando seleção posterior, conflito ou lançamento indevido de XP. O ledger de sorteio/XP já possui idempotência por chave de requisição e índices únicos, mas isso não resolve sozinho a decisão equivocada de um cliente com estado antigo. Outro risco é a PWA tomar controle da aba durante uma resposta não enviada e reutilizar HTML de um cache da v0.9.

## Decisão técnica

- O hook `useDrawSession` ganha estado separado `needsReconciliation` para falha **incerta de transporte**, diferenciando-a de erros HTTP estruturados. Não afirma se houve commit ou rollback do comando.
- Em falha de rede, bloqueia novas operações mutáveis de sorteio/confirmar/XP/trocar política/iniciar rodada, avisa claramente ao professor que **o comando pode ter sido aceito**, e exige leitura autoritativa por `GET .../draw-attempts/state` (`Sincronizar sorteio`). Nunca reenvia automaticamente o POST nem gera novo UUID durante a conciliação. Um evento `online` pode disparar **apenas GET de sincronização**; na perda isolada de uma resposta HTTP, mesmo com `navigator.onLine=true`, há comando manual explícito.
- Uma ref síncrona previne dois comandos de clique rápido antes de o estado React `busy` propagar. O desbloqueio ocorre somente depois do GET bem-sucedido; se a leitura falhar, a proteção permanece ativa. O servidor continua autoridade para o histórico e o XP.
- Ajuste semântico: mensagem de rede distinta do aviso de incompatibilidade entre protocolos legados. O Grid e a Roleta compartilham o mesmo hook e o espaço útil do cockpit é mantido.
- O fluxo PWA mantém `skipWaiting`/`clients.claim` **sem reload automático**, informa a nova versão e permite ao aluno concluir o formulário antes de clicar para atualizar. O cache versionado da v0.9 deve ser excluído por `activate.waitUntil`. Nome acessível `aria-label="Código da sessão"` adicionado ao input.

## Provas executadas

- Playwright simula **POST persistido no servidor mas resposta abortada** no navegador, tanto na seleção quanto na confirmação com +5 XP. Antes de reconciliar, o professor não pode repetir o sorteio; depois de `Sincronizar sorteio`, há **exatamente um attempt confirmado e uma associação a ScoreEvent**, sem duplicações.
- Outro cenário coloca o navegador offline **antes de clicar**: nenhum POST acontece, nenhuma tentativa é criada, e o evento `online` recarrega apenas o estado para permitir a seleção.
- Cenário de PWA simula **caches versão v0.9** e uma mudança real de endereço do script do service worker da mesma origem (forçando ativação). O rascunho no input permanece até a decisão do usuário, caches antigos são removidos assincronamente, e a navegação sem rede mostra offline.html neutro, nunca HTML privado legado. **Não é uma instalação real da PWA v0.9 num aparelho móvel** nem garante comportamento igual em iOS/Safari.
- Execução focada **3/3 testes E2E**. TypeScript, lint (0 erros; avisos preexistentes), build e **313/313 testes unitários** aprovados. A suíte E2E total tem **38 cenários**, mas a tentativa em localhost sem configuração de credenciais causou 401 e disparou a defesa legítima de rate limit HTTP 429; **não interpretar essa execução como falha funcional nem como aprovação da suíte integral**. Reexecutar em stack isolada com credenciais de E2E definidas antes de declarar o novo HEAD apto.

## Restrições e seguimento

- O GET não prova entrega de mensagens WebSocket em tempo real, apenas estado persistido. Testar rede com perda de pacotes/latência reais e cliente desatualizado ainda é necessário.
- O servidor define o ledger e o resultado do sorteio. Não executar replay de POST sem a chave original; não usar cache para respostas autenticadas.
- PWA em Android/Chrome e iOS/Safari instaladas **na v0.9** e atualizadas após publicação **permanecem NO-GO** até ensaio manual.
- Relatórios de WCAG AAA, leitores de tela e piloto docente não estão implícitos nestes testes. Não remover o draft do PR sem gate final.
