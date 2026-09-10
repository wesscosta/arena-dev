# Incremento 12.3D.7A — Design System & Accessibility Foundation

## Escopo

Cria a fundação visual sem framework externo:

```text
frontend/styles/
├── tokens.css
├── base.css
└── accessibility.css
```

`globals.css` importa essa base antes do legado.

## Melhorias imediatas

- breadcrumb/header deixam a microtipografia de 7–10px;
- perfil ganha alvo interativo confortável;
- tabs da Arena ganham escala e altura consistentes;
- botões/campos recebem escala compartilhada;
- foco por teclado explícito;
- `reduced-motion`, `prefers-contrast`, `forced-colors`;
- utilitários `sr-only` e `skip-link`;
- seletor contextual e Roteiro passam a consumir tokens.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Teste manual: header desktop, Tab/Shift+Tab, foco visível, zoom 200%, mobile e reduced motion.
