# ADR-0041 — Identidade de turma usa tokens semânticos e accent contextual

**Status:** Aceito
**Data:** 12/09/2026

## Decisão
Persistir `theme_color` e `theme_icon` em `Classroom`.

A cor vem de paleta curada e o ícone de catálogo interno. Não persistimos hexadecimal, SVG, emoji ou HTML do usuário.

A identidade afeta somente hero, CTA principal, watermark e preview; shell e superfícies globais permanecem neutros.

Defaults:
```text
theme_color = emerald
theme_icon  = code
```

## Consequências
- reconhecimento visual sem excesso cromático;
- contraste controlado pelo design system;
- mudança futura de tons não exige migração dos dados;
- V17 adiciona somente duas colunas em `classrooms`.
