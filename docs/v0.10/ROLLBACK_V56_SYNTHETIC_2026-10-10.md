# Evidência técnica — ensaio isolado V48 → V56 → V48

**Execução:** 10/10/2026. **Natureza:** laboratório sintético, temporário e não destrutivo. **Status: APROVADO (exit 0)**.

- Script executado: `scripts/release/rehearse-v09-v010-rollback.sh`.
- SHA da candidata testada: `f03f813c1d125fa2d2b3d63321fe4f3aebc3c7e8` (código da v0.10 e atualização documental inicial).
- Tag/base exata da v0.9: `add3cbcbdcba1088f4ce994a39194fde22f117d6` (`v0.9.0`).
- PostgreSQL 17 isolado, containers e rede efêmeros, fixture sintética sem utilização de dados de produção/desenvolvimento.
- Confirmações produzidas pelo script:

```text
OLD_API_V48_READY=ok
PRE_UPGRADE_BACKUP_SHA256=ok
UPGRADE_V48_TO_V56_PRESERVES_IDS_AND_XP=ok
BACKWARD_RESTORE_V48_AND_ORIGINAL_V09_API_READY=ok
SYNTHETIC_DATA_FINGERPRINT=1|1|1|1|2|0|1
ROLLBACK_REHEARSAL_RESULT=PASS (nenhum banco de desenvolvimento/produção modificado)
```

O processo confirmou versão V48 antes do upgrade, presença de 56 migrações após a atualização, criação de coluna/índice V56 de idempotência e integridade dos registros/XP após o upgrade; restaurou o dump pré-upgrade com SHA-256 verificado, removeu as estruturas novas e iniciou novamente o binário original da v0.9 com o fingerprint preservado.

**Limitações obrigatórias:** este ensaio não mede RTO/RPO com volume representativo, não prova recuperação de dados gravados depois do backup, não homologa PWA antiga, rede móvel, scripts de implantação nem operação real. O gate **rollback operacional continua aberto**. A publicação exige CI verde no SHA definitivo da `main`, aceite do operador e `release-gate.sh final` na versão estável.

**Evidência local adicional:** `/tmp/arena-v010-v56-rollback-20261010.log` na máquina de execução, sujeito à retenção local. O resumo acima é a evidência versionada. Não anexar dumps do banco de homologação/produção ao Git.
