# Estado atual — Arena Dev

**Última sincronização documental:** 23 de setembro de 2026

**Baseline técnica corrente:** `v0.7.0 — Educational Integrations`.

**Estado da linha:** candidata técnica concluída; aguardando merge/gate final para
publicação formal.

## Estado resumido

A linha `15.x` está tecnicamente encerrada. O Integration Core provider-independent
foi consolidado e a integração Microsoft Teams cobre conexão, turmas, estudantes,
atividades, entregas, avaliação/feedback, observabilidade e telemetria.

Google Classroom permanece em **standby** e não bloqueia a v0.7.0.

## Baseline v0.7

```text
versão                 0.7.0
schema                 Flyway V1–V27
linha                  15.x encerrada tecnicamente
provider operacional   Microsoft Teams
Google Classroom       standby
```

## Release

O fechamento técnico está documentado em [`RELEASE_0_7.md`](RELEASE_0_7.md).

Tag/GitHub Release só deve ser afirmada depois de verificação no mesmo SHA após
merge e gate final.
