# Incremento 12.3D.6 — Navegação contextual e cards de turma

## Hierarquia

```text
Visão geral › Turma › Arena
```

O nome da turma vira o próprio seletor contextual, com busca por nome/código.

O header deixa de repetir:

- título grande da turma;
- select isolado;
- selo global `Sessão ativa`.

Ao trocar de turma enquanto está na Arena, o usuário retorna para a Home da
nova turma.

## Cards

Regras:

- ativa sem sessão: nenhum badge;
- inativa: `INATIVA`;
- sessão ativa: `AO VIVO`;
- selecionada: somente borda/acento, sem texto `SELECIONADA`.

Ações:

```text
⋯
├── Editar turma
├── Desativar / Reativar
└── Excluir turma
```

Turma com sessão ativa não pode ser desativada.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```
