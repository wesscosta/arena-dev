# Arena Dev — Design System

## Objetivo

O Design System é a fonte única para decisões visuais e de interação do Arena Dev.

Princípios:

1. clareza operacional antes de decoração;
2. informação primária domina informação secundária;
3. interação não depende somente de cor;
4. professor usa principalmente desktop, alunos principalmente mobile;
5. backend continua autoritativo; a UI apenas representa seu estado;
6. acessibilidade faz parte da Definition of Done.

## Tipografia

| Papel | Token | Referência |
|---|---|---:|
| Metadado mínimo | `--font-size-xs` | 12px |
| Label / breadcrumb / botão | `--font-size-sm` | 14px |
| Corpo / campo | `--font-size-md` | 16px |
| Título menor | `--font-size-lg` | 18px |
| Título de card/seção | `--font-size-xl` | 20px |
| Seção principal | `--font-size-2xl` | 24px |
| Título de página | `--font-size-3xl` | 30px |

Evitar `7px`, `8px` e `9px` para informação funcional.

## Hierarquia semântica

```text
h1 = título da tela
h2 = seção principal
h3 = card/recurso
h4 = subdivisão
```

`strong` e `span` não substituem headings quando existe hierarquia real.

## Controles

- alvo operacional: 40px;
- alvo confortável/touch: 44px;
- todos os controles precisam de `focus-visible`;
- estado selecionado deve combinar texto/forma/ícone, não apenas cor;
- ação destrutiva precisa de diferenciação e confirmação quando aplicável.

## Acessibilidade — Definition of Done

- navegação por teclado;
- foco visível;
- ordem de foco coerente;
- sem armadilhas de teclado;
- contraste funcional;
- zoom/reflow;
- `prefers-reduced-motion`;
- `prefers-contrast`;
- `forced-colors`;
- labels acessíveis;
- realtime anunciado de forma controlada.

O Timer não deve anunciar cada segundo em leitor de tela.

## Realtime

Usar `aria-live` apenas em mudanças semanticamente importantes: início/fim de Timer, mudança de step, abertura/fechamento de Buzzer, resultado final e erro operacional.

## Próximas migrações

1. Header e breadcrumb;
2. tabs da Arena;
3. buttons/icon buttons;
4. fields;
5. badges/status;
6. menus/popovers;
7. cards;
8. estados vazios;
9. Projetor e `/join`.
