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
| Metadado mínimo / apoio compacto | `--font-size-2xs` | 12px |
| Label compacto / status | `--font-size-xs` | 13px |
| Label / breadcrumb / botão | `--font-size-sm` | 15px |
| Corpo / campo | `--font-size-md` | 16px |
| Título menor | `--font-size-lg` | 18px |
| Título de card/seção | `--font-size-xl` | 20px |
| Seção principal | `--font-size-2xl` | 24px |
| Título de página | `--font-size-3xl` | 30px |

Evitar `7px`, `8px` e `9px` para informação funcional.

### Papéis tipográficos (v0.11 / 11.7)

Cabeçalhos usam um **papel**, nunca um tamanho próprio. Mudar o valor do papel em `styles/tokens.css` ajusta todas as telas que o usam.

| Papel | Token | Valor | Onde |
|---|---|---|---|
| Título de página | `--font-size-page-title` | `--font-size-3xl` | Turmas, Início da turma, Biblioteca, Gerenciar turma, Configurações, Integrações |
| Título de seção | `--font-size-section-title` | `--font-size-2xl` | Abas da turma (Alunos, Atividades, Jornadas) |
| Título de dinâmica | `--font-size-dynamic-title` | `clamp(1.5rem, 1.8vw, 2rem)` | `DynamicHeader` da Arena (todas as dinâmicas) |
| Título de painel | `--font-size-panel-title` | `--font-size-xl` | Roteiro ao vivo, gaveta de ferramentas |
| Eyebrow | `--font-size-eyebrow` | `--font-size-2xs` (12px) | Rótulo acima de títulos, com `--tracking-eyebrow` |
| Descrição de página | `--font-size-page-description` | `--font-size-sm` | Parágrafo sob o título de página |

Espaçamento do título: `--page-title-margin`. Tracking de títulos: `--tracking-title`.

**Dívida registrada para a v0.12:** cerca de 1.170 declarações de `font-size` e 670 cores ainda são literais. A migração é gradual, com regressão visual, e não faz parte da v0.11.

### Cor da turma

Cada cor tem `value` (superfícies escuras) e `lightValue` (≥ 4,5:1 em superfícies claras, pois a cor também aparece como texto). A classe `.classroom-accent-scope` resolve `--classroom-accent` conforme o tema; propriedades inline não podem ser sobrescritas por seletor, por isso o componente recebe `--classroom-accent-dark` e `--classroom-accent-light`. A Home da turma usa faixa sólida de 4px, borda a 40% e fundo a 12%. Colisões conhecidas (Rosa × erro, Esmeralda × destaque do sistema) ficam para a nova paleta da v0.12.

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


## Core UI Primitives — 12.3D.7B

Os primitives vivem em `frontend/components/ui/`.

- `Button`: ações textuais;
- `IconButton`: ações apenas por ícone, com label obrigatório;
- `Badge`: status curto;
- `Tabs`: navegação entre painéis equivalentes;
- `Menu`: ações secundárias/contextuais;
- `Breadcrumb`: localização hierárquica;
- `Field`: label, hint, erro e controle;
- `Card`: agrupamento visual sem impor heading;
- `EmptyState`: ausência de conteúdo com orientação;
- `RadioCard`: escolha única com semântica nativa de radio e superfície visual reutilizável.

Novas interfaces devem consumir esses primitives antes de criar padrões locais.
A migração do legado é progressiva para evitar uma refatoração big bang.


## Accessibility Pass — 12.3D.7C

O Design System passa a exigir:

- skip navigation para o `main`;
- `LiveRegion` para mensagens assíncronas relevantes;
- menus com navegação direcional e retorno de foco;
- diálogos com foco inicial, focus trap e retorno ao opener;
- ausência de anúncios por segundo do Timer;
- gate manual de zoom/reflow.

Mudanças realtime devem ser anunciadas por significado, não por frequência.


## Arena Visual Polish — 12.3D.7D

A Arena passa a ter uma camada de composição específica em
`styles/arena-polish.css`.

Essa camada pode organizar componentes existentes, mas não pode inventar
novos valores de tipografia, spacing ou controles quando já existir token.
Novas features devem preferir CSS Modules sob ownership do componente; `arena-polish.css` fica restrito a composição/hardening legado enquanto a migração avança.

Princípios aplicados:

- reduzir *card soup*;
- configuração deve parecer toolbar/configuração;
- ação principal deve ter maior peso visual;
- metadado não compete com conteúdo;
- layouts devem reflow antes de ficarem comprimidos;
- zoom alto deve se comportar como viewport estreito;
- responsividade não pode depender de esconder ações essenciais.
