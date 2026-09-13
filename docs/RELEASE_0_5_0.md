# Release candidate `v0.5.0` — Live Quiz & Structured Responses

**Data de preparação:** 13/09/2026  
**Estado:** candidate preparada; **não publicada**.

## Escopo

`v0.5.0` fecha a primeira experiência de Quiz estruturado ao vivo do Arena Dev:

- `QuizRound` autoritativo;
- respostas MULTIPLE_CHOICE e TRUE_FALSE no `/join`;
- restauração por snapshot/reconnect;
- resultados privados para professor;
- reveal controlado no `/join` e Projetor;
- avaliação automática;
- XP exclusivamente via `ScoreEvent`;
- feedback pedagógico derivado;
- experiência Mobile/PWA;
- hardening/E2E e release gate;
- UX final 13.7A–13.7E: Students, identidade visual, hard delete seguro, CTAs de sessão, página de gerenciamento e tema Escuro/Claro/Sistema.

## Persistência

Schema máximo: **Flyway V17**.

```text
V15  quiz_rounds + quiz_participant_answers
V16  avaliação + vínculo opcional com ScoreEvent
V17  cor e ícone semânticos da turma
```

Não existe `QuizScore`.

## Metadata do candidate

Esperado:

```text
Maven       0.5.0
npm         0.5.0
package-lock 0.5.0
release tooling 0.5.0
```

## Checklist de preparação

- [x] 13.0–13.6 implementados em código;
- [x] 13.7A–13.7E implementados e validados localmente;
- [x] cenário E2E completo do Quiz versionado;
- [x] verifier de backup atualizado para V17;
- [x] metadata preparada para 0.5.0;
- [x] documentação de release candidate criada.

## Gates ainda obrigatórios

- [x] `npm audit --omit=dev --audit-level=high` verde;
- [x] `npm test` verde;
- [x] `npm run typecheck` verde;
- [x] `npm run build` verde;
- [x] `mvn -B -ntp verify` verde;
- [x] Compose dev/prod válido;
- [x] Playwright crítico completo verde;
- [x] `release-gate.sh local` verde;
- [ ] PR mergeado em `main`;
- [ ] CI final verde no SHA de merge;
- [ ] backup real produzido;
- [ ] SHA-256 do backup validado;
- [ ] restore-check PostgreSQL 17 / Flyway V1–V17 verde;
- [ ] rollback/restore ensaiado e registrado;
- [ ] `release-gate.sh final` verde no mesmo SHA.

## Publicação

A tag `v0.5.0` deve ser **anotada** e criada somente depois dos gates acima.

Não mover `v0.3.0` nem `v0.4.0`.

Depois da tag:

```text
GitHub Release
name: Arena Dev Community v0.5.0
tag:  v0.5.0
prerelease: false
draft: false
```

Este documento é um checklist de candidate até que a publicação seja efetivamente registrada.
