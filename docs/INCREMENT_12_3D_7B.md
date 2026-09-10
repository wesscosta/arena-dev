# Incremento 12.3D.7B — Core UI Primitives

## Objetivo

Transformar os tokens do 12.3D.7A em componentes reutilizáveis e começar a
substituir padrões duplicados do frontend.

```text
components/ui/
├── Button
├── IconButton
├── Badge
├── Tabs
├── Menu
├── Breadcrumb
├── Field
├── Card
└── EmptyState
```

## Primeira migração

O próprio incremento já migra:

- breadcrumb global;
- menu do professor;
- ações principais da sessão;
- badge `AO VIVO`;
- tabs da Arena.

A migração é progressiva. O restante do legado continua funcional.

## Acessibilidade

Os primitives já incorporam contratos mínimos:

- `IconButton` exige label;
- `Tabs` usa tablist/tab, roving tabindex e setas/Home/End;
- `Menu` usa menu/menuitem e fecha com Escape;
- `Breadcrumb` usa landmark e `aria-current`;
- `Field` conecta label, hint, erro e controle;
- `Button` expõe `aria-busy` em loading.

A auditoria completa continua no 12.3D.7C.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```
