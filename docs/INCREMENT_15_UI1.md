# Incremento 15.UI1 — Integration UX Foundation

## Decisão de produto

O Arena Dev mantém **uma única entidade de turma**.

Uma `Classroom` pode ou não possuir vínculos com plataformas externas. A
integração não cria uma segunda categoria permanente de "turma externa".

```text
Classroom
  └── ExternalClassroomLink
       ├── MICROSOFT_TEAMS
       └── GOOGLE_CLASSROOM
```

## Navegação

### Configurações

Responsável por:

- conectar plataformas;
- consultar status;
- tenant/configuração;
- gerenciar conexão.

### Turmas

Responsável pelo uso cotidiano.

A lista continua única e o card recebe apenas um badge discreto quando existir
vínculo:

```text
Técnico em Desenvolvimento de Sistemas
2026.19.52

[ Microsoft Teams ]
```

A tela de Turmas recebe uma ação global:

```text
Vincular plataforma
```

que leva ao fluxo de descoberta/vinculação.

## Mudanças

- remove "Integrações" como item independente do menu do professor;
- adiciona "Plataformas educacionais" dentro de Configurações;
- exibe status do Microsoft Teams e placeholder do Google Classroom;
- carrega `ExternalClassroomLink` das conexões ativas;
- exibe badge somente nas turmas efetivamente vinculadas;
- mantém o console avançado existente como fluxo de gerenciamento temporário.

## Princípio

> A turma é sempre Arena. O badge apenas informa que ela possui conexão com uma
> plataforma externa.

## Gate

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

## Próximo incremento

15.UI2 — Classroom Integration Workspace

Depois dele retomamos:

15.4B — Persist External Submissions.
