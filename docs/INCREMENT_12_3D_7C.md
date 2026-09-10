# Incremento 12.3D.7C — Accessibility Pass

## Entregas

- skip link funcional;
- `main` landmark focável;
- notificações globais em `LiveRegion`;
- alerta de API com semântica assertiva;
- Menu com setas, Home/End, Escape e retorno de foco;
- modal de importação com focus trap e retorno ao opener;
- anúncio do Roteiro ao Vivo somente em mudanças manuais;
- teste automático da paleta principal;
- contrato explícito para não anunciar ticks do Timer;
- documentação de teclado, realtime, contraste e zoom/reflow.

## Princípio do realtime

Não transformar `aria-live` em um stream de telemetria.

O professor precisa ouvir mudanças de estado semanticamente importantes, não
cada atualização do relógio ou animação.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Validação manual:

1. navegar desde o topo usando apenas teclado;
2. acionar `Pular para o conteúdo principal`;
3. abrir o menu do professor e usar setas/Home/End/Escape;
4. abrir o modal de importação e confirmar focus trap;
5. fechar o modal e confirmar retorno do foco;
6. navegar pelas tabs com setas;
7. avançar o Roteiro e confirmar anúncio único;
8. testar 200% e 400% de zoom;
9. testar `prefers-reduced-motion`.
