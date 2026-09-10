# Incremento 12.3D.7D — Arena Responsive & Visual Polish

## Objetivo

Fechar o ciclo visual do 12.3D.7 sem reconstruir a Arena.

O incremento consome os tokens e primitives já estabilizados e ataca:

- excesso de caixas;
- hierarquia operacional;
- densidade;
- proporção Sorteio/Pontuação;
- responsividade;
- zoom/reflow.

## Fonte da Arena

`Fonte da Arena` deixa de se comportar como outro card dentro da Condução e
passa a funcionar como toolbar contextual:

```text
Condução

FONTE DA ARENA
Modo livre
Pergunte oralmente ou utilize qualquer recurso da aula.   [Modo livre ▾]
────────────────────────────────────────────────────────────────────────
```

Isso reduz *card soup* e recupera espaço vertical.

## Sorteio

O Sorteio continua como ação visual principal da Condução, mas:

- reduz espaço vazio;
- aproxima estado, aluno sorteado e CTA;
- mantém CTA central;
- escala de título passa a usar Design System;
- card colapsa corretamente em notebook/tablet.

## Pontuação rápida

- presets ganham alvo e contraste melhores;
- XP fica visualmente separado do motivo;
- custom score usa grid sem larguras fixas;
- mobile vira coluna única;
- seleção manual ganha separação visual.

## Responsividade

### Desktop

```text
Sorteio  | Pontuação
  ~62%       ~38%
```

### Notebook / tablet

```text
Sorteio
Pontuação
```

### Mobile / zoom alto

```text
Ações da sessão
↓
Tabs com scroll
↓
Fonte
↓
Sorteio
↓
Pontuação
```

Sem scroll horizontal global obrigatório.

## Regras

- nenhuma nova escala tipográfica local;
- nenhum novo framework visual;
- nenhuma alteração de backend;
- nenhuma migration;
- nenhuma mudança de contrato realtime;
- não alterar comportamento do Roteiro, Nuvem, Timer ou Buzzer.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Validação visual:

1. Arena em 1440px ou maior;
2. 1024px;
3. 768px;
4. smartphone;
5. zoom 200%;
6. zoom 400%;
7. confirmar que Sorteio continua prioritário;
8. confirmar que Fonte da Arena parece configuração, não card;
9. confirmar que Pontuação não fica comprimida;
10. confirmar ausência de scroll horizontal da página.
