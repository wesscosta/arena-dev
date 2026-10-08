# ADR-0058 — PWA seguro por versão, fallback neutro e retomada consciente

**Data:** 08/10/2026 · **Status:** implementada na branch de trabalho v0.10, com gate de homologação em navegador. **Não publicar a release automaticamente.**

## Diagnóstico real

O PWA existente registrava `/sw.js` em `PwaRuntime`, mas a imagem `frontend/Dockerfile` de produção (Next `output: standalone`) **não copiava `/app/public`**. Na instalação Docker, `/sw.js`, `/offline.html` e `/icons/arena-192.png` devolviam **HTTP 404**; assim a aplicação web funcionava, porém o PWA não era efetivamente instalável, independentemente dos testes estáticos em código-fonte. A correção adiciona `COPY --from=build --chown=arena:arena /app/public ./public` à imagem final. Smoke test em Docker verifica os recursos com **HTTP 200**.

O worker antigo ainda utilizava caches `arena-dev-shell-v0.8-join-fix-1`, cacheava **HTML do `/join`** e o devolvia offline. Após uma atualização de Next, esse HTML pode apontar para chunks antigos, reidratar uma versão obsoleta do cliente ou criar uma impressão falsa de sessão disponível. O browser WebSocket também podia exibir **"Conectado"** após `navigator.onLine=false` se o socket ainda não disparasse `close`.

## Decisão e implementação

1. **Cache não é domínio.** O novo worker usa prefixo próprio e versão `v0.10-pwa-gate-1`, apaga somente caches de nomes `arena-dev-` de releases anteriores e preserva caches de outros produtos na mesma origem. Instala apenas fallback HTML neutro, manifest e ícones; não armazena `/join` nem SSR, e nunca intercepta `/api/`, `/ws/` nem comandos HTTP POST.
2. **Navegação sempre network-first.** Falha de rede para qualquer navegação retorna **somente `/offline.html`**, sem login, gabarito, sessão ou HTML antigo; assets estáticos com hash `/_next/static` usam cache-first. A instalação falha (sem substituir worker existente) se a tela offline obrigatória não foi obtida.
3. **Atualização sem interromper respostas.** Novo worker pode assumir o controle, mas o app **não recarrega automaticamente**. A interface oferece aviso “Nova versão disponível” com **Atualizar agora** / **Depois**, orientando o estudante a concluir a resposta. `updateViaCache: none` verifica o script; o app revalida o worker ao voltar online.
4. **Conectividade autoritativa.** Em perda de rede, o cliente do estudante sinaliza `Offline`, fecha o WebSocket obsoleto e **não** tenta novas conexões repetidas enquanto `navigator.onLine=false`. Quando a conectividade retorna, força nova sessão WebSocket e recebe o snapshot autoritativo do servidor; respostas existentes não são reenviadas automaticamente nem XP é criado pela reconexão. A proteção de ações também depende do sinal de conexão no `StudentJoinFlow`.
5. **Compatibilidade:** nenhuma migração SQL, alteração de tokens de acesso ou alteração das regras do DrawProtocolGuard e XP. Um dispositivo que ficou aberto com **JS da v0.9 anterior à nova UI de atualização** não receberá retroativamente o novo aviso; a atualização total de clientes legados exige **teste real em dispositivos com v0.9 previamente instalada**, que segue como gate manual.

## Evidência de teste

- Teste comportamental `frontend/tests/pwa-lifecycle.test.ts` simula worker antigo/cache `/join`/chunks, `install→activate`, remoção de caches próprios sem apagar cache de outro app, navegação offline apenas neutra, API/WS bypass, assets estáticos em cache.
- `frontend/tests/pwa.test.ts` cobre contrato do worker e inclusão de `public/` no Dockerfile. `frontend/tests/join-mobile-pwa.test.ts` cobre a indicação offline e a reconexão explícita.
- E2E Chromium `frontend/e2e/pwa-upgrade-recovery.spec.ts` usa service worker **real do Docker**, sem mock de resposta: `/join` offline não serve HTML legado nem API persistida; rede restabelecida devolve página normal; participante conectado passa a Offline e reconecta sem duplicação de presença/XP.
- **Não comprovam**: compatibilidade com v0.9 instalada dias antes em Android/iOS, atualização com aba já preenchida e app fechado pelo sistema operacional, WAN/intermitência sob alta carga, ou certificação manual WCAG. Não alegar rollout completo com esses testes.

## Riscos e próximos testes

- O bundle Next usa URLs de chunks com hash. Como a instalação ativa o novo worker enquanto abas antigas podem permanecer abertas, partes do JS antigo podem solicitar chunks indisponíveis após o deploy. A recomendação é o aviso de atualização sem reload involuntário, mais teste em dispositivos reais. Evitar chamar o produto de “offline-first”: **o domínio é sempre online**.
- Mensuração de uso de CacheStorage e limpeza de caches antigos em Android/iOS ainda exige dispositivos reais; PWA instalada e atualização de versão têm variações entre navegadores.
- A entrega não autoriza tag, merge ou abertura multi-tenant; v0.9.0 permanece congelada e PR #35 continua em rascunho.
