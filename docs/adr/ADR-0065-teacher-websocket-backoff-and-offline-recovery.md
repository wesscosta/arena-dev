# ADR-0065 — WebSocket docente resiliente, sem polling offline e sem replay de comandos

**Data:** 08/10/2026 · **Estado:** implementado na branch v0.10; release pendente de homologação manual.

## Diagnóstico

O hook `useArenaRealtime` reconectava o WebSocket do professor a cada **1,5 s** quando ele encerrava, inclusive durante ausência prolongada de rede. Como cada tentativa também recarregava código de entrada, Buzzer, Nuvem, Votação, Quiz, Verificação de aprendizagem e Ranking, quedas de conectividade poderiam produzir consultas redundantes/avisos repetidos. O código já possuía `reconnectDelayMs` para conexões públicas, mas a conexão **docente** não o utilizava.

## Decisão implementada

- Durante `navigator.onLine === false`, o hook **não cria socket nem dispara a bateria de GETs**. Um evento `offline` fecha a conexão atual, cancela timers e marca o estado como desconectado.
- O evento `online` descarta temporizador pendente, zera a sequência de backoff e refaz **somente consultas GET + conexão WS**. Essa reconstrução obtém snapshots autoritativos sem tentar replicar alterações antigas.
- Quando a conexão cai mas o navegador ainda considera a rede disponível, a reconexão emprega os intervalos progressivos **1 s, 2 s, 4 s, 8 s, teto de 10 s**, através de `reconnectDelayMs`. Ao abrir com sucesso, o contador volta a zero. Trocar de sessão também reinicia o contador.
- Cada efeito remove listeners e timers e fecha o socket anterior na desmontagem para evitar reconexões órfãs. As consultas de estado ainda usam sua proteção de `active` antes de atualizar React.
- **Não** armazena respostas privadas offline, não reenvia POST e não muda as regras de idempotência do servidor. Se um comando de sorteio teve resposta incerta, a reconciliação separada do `useDrawSession`/ADR-0064 continua exigindo a leitura autoritativa antes de nova mutação.

## Comprovação automatizada e limites

- E2E Chromium `professor não repete consultas em loop offline e retoma snapshot ao reconectar`: mantém sessão docente aberta, impõe modo offline por **3,4 s** (superior a duas tentativas do antigo retry de 1,5 s), verifica que não há novas consultas de código de sessão durante o offline, restaura a rede e verifica retorno dos GETs, integridade do histórico de sorteio (zero alterações) e Grid visível.
- Regressões direcionadas de perda de resposta HTTP após commit/XP e tentativa offline sem POST continuam exigidas, além do E2E integral do Chromium.
- **Limites:** `navigator.onLine` indica conectividade reportada pelo navegador, não garante acesso ao servidor. Quando o dispositivo parece online mas WS falha, aplicam-se backoff e novas leituras. O teste em Chromium não representa latência variável de LTE, perda intermitente de pacotes, PWA instalada em Android/iOS nem reconexão em massa com centenas de usuários. O gate manual permanece.
- A implementação é **self-hosted com docente único** (ADR-0053), não prova isolamento multi-inquilino nem escalabilidade do WebSocket para múltiplos professores.

## Resultado final local

- `npm run lint`: 0 erros e 92 avisos preexistentes; `format:check`, `typecheck`, `npm test` **313/313** e `npm run build`: exit 0.
- Build Docker frontend atualizado com backend e PostgreSQL saudáveis; **3/3 E2E direcionados** para falta de ACK após commit/XP, tentativa de sorteio offline e WS docente; **39/39 Playwright Chromium completos em 1,3 min** na mesma imagem reconstruída (`/tmp/arena-v010-ws-backoff-full-e2e.log`).
- Esses resultados **não substituem** simulação LTE prolongada, Android/iOS com PWA v0.9 instalada, ou ensaios com clientes de várias turmas simultâneas.
