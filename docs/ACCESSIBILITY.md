# Arena Dev — Accessibility Baseline

## Objetivo

Acessibilidade é parte da definição de pronto da interface, não um ajuste
posterior.

O Arena Dev possui dois contextos principais:

- professor: desktop/notebook, uso prolongado e alta densidade operacional;
- aluno: smartphone, interação rápida durante a aula.

## Navegação

Estrutura mínima:

```text
Skip link
↓
main#main-content

Breadcrumb
↓
conteúdo atual
```

Todo fluxo principal deve funcionar sem mouse.

## Teclado

### Tabs

```text
ArrowLeft / ArrowRight
Home / End
```

### Menus

```text
Enter / Space     abrir
ArrowDown         próximo item
ArrowUp           item anterior
Home / End        primeiro / último
Escape            fechar e devolver foco ao gatilho
Tab               sair do menu e fechá-lo
```

### Dialogs

- foco entra no diálogo ao abrir;
- `Tab` e `Shift+Tab` permanecem no diálogo;
- `Escape` fecha;
- ao fechar, foco retorna ao elemento que abriu.

## Realtime

Mudanças importantes podem ser anunciadas, mas atualizações de alta frequência
não devem saturar leitores de tela.

Anunciar:

- início/fim/pausa de uma dinâmica;
- mudança manual do step do roteiro;
- abertura/fechamento do Buzzer;
- resultado ou erro relevante.

Não anunciar:

- tick por segundo do Timer;
- animações;
- mudanças puramente decorativas;
- cada incremento visual da Nuvem.

As notificações globais do professor usam `LiveRegion` polite.

## Contraste

Baseline da paleta principal em `surface`:

| Token | Cor | Resultado mínimo esperado |
|---|---|---|
| texto | `#f3f7f5` | AA texto normal |
| muted | `#8ea39a` | AA texto normal |
| accent | `#58f3a7` | AA texto normal |
| danger | `#ff6b73` | AA texto normal |

Transparências e estados compostos ainda precisam de inspeção visual porque o
contraste final depende do fundo efetivo.

## Zoom e reflow

Gate manual:

- 100%;
- 200%;
- 400%;
- largura equivalente a smartphone.

Critérios:

- nenhuma ação essencial desaparece;
- não exigir scroll horizontal da página inteira;
- popovers permanecem alcançáveis;
- conteúdo pode reorganizar verticalmente;
- texto não deve ser truncado quando ele for necessário à operação.

## Definition of Done

Uma UI nova só é considerada pronta quando:

- possui nome acessível;
- pode ser operada por teclado;
- foco é visível;
- estado não depende somente de cor;
- hierarquia de heading é coerente;
- alterações assíncronas importantes são anunciadas;
- foi verificada em zoom/reflow;
- respeita `prefers-reduced-motion`.
