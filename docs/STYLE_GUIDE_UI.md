# Arena Dev — UI Style Guide

## Contrato visual

Componentes não escolhem cores absolutas. Componentes escolhem papéis semânticos.

### Camadas

- `styles/theme.css`: fonte única das cores de Escuro/Claro.
- `styles/tokens.css`: tipografia, espaçamento, raios, motion, z-index e aliases `--ds-*`.
- CSS de componentes: consome `--ds-*`.

Exemplo:

```css
.card {
  background: var(--ds-surface);
  color: var(--ds-text-primary);
  border-color: var(--ds-border);
}
```

Evite cores estruturais literais dentro de componentes quando houver papel semântico equivalente.

## Tokens principais

| Papel | Token |
|---|---|
| Canvas | `--ds-canvas` |
| Superfície | `--ds-surface` |
| Superfície elevada | `--ds-surface-raised` |
| Controle/input | `--ds-surface-control` |
| Área interna | `--ds-surface-inset` |
| Hover neutro | `--ds-surface-hover` |
| Texto principal | `--ds-text-primary` |
| Texto secundário | `--ds-text-secondary` |
| Texto terciário | `--ds-text-tertiary` |
| Borda | `--ds-border` |
| Borda sutil | `--ds-border-subtle` |
| Accent | `--ds-accent` |
| Danger | `--ds-danger` |
| Warning | `--ds-warning` |

## Identidade da turma

A cor da turma é contextual e não substitui o tema global. Pode aparecer em hero, watermark, borda, preview e CTA contextual.

## Tema Claro

Claro não é inversão do Escuro. Deve preservar contraste, hierarquia de superfícies, hover/focus, Danger/Warning e distinção entre superfície, controle e inset.

## Semântica de domínio na interface

- Turma: contexto persistente.
- Sessão: execução operacional em andamento.
- Participantes: pessoas vinculadas à sessão e seu estado de presença/conexão.
- Não criar a entidade `Aula` apenas por nomenclatura de UI.

## Checklist

1. Escuro.
2. Claro.
3. Sistema.
4. Hover.
5. Focus-visible.
6. Disabled.
7. Danger/Warning.
8. Mobile/reflow.
9. Sem cores estruturais absolutas quando houver token semântico.
