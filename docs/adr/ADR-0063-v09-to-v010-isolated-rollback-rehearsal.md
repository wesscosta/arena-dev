# ADR-0063 — Ensaio isolado de upgrade e rollback v0.9 ↔ v0.10

**Data:** 08/10/2026 (09/10 UTC) · **Situação:** implementado e validado como ensaio técnico local. **Não autoriza release estável.**

## Problema e decisão

Backup V55 restaurável comprova que a candidata atual pode ser recuperada, **não** que um binário antigo da v0.9 volte a operar após uma atualização V48→V55. Flyway não permite simplesmente iniciar a versão anterior sobre um esquema mais novo. A reversão correta requer **restaurar um snapshot V48 anterior à migração** e só então iniciar a v0.9.

Para comprovar o procedimento sem tocar dados de alunos, o projeto inclui `scripts/release/rehearse-v09-v010-rollback.sh`. Ele exige a branch de testes da v0.10 e a tag `v0.9.0`, exporta o backend original dessa tag com `git archive`, gera duas imagens Docker **temporárias a partir das fontes respectivas** e usa rede PostgreSQL 17 independente, sem portas publicadas ou serviços do Compose principal. O Dockerfile de empacotamento da v0.10 é usado somente como receita temporária de build para o código histórico; o código-fonte do tag **não é alterado**. O trabalho é removido ao terminar, mesmo com erro.

## Sequência auditável

1. Subir aplicação **original v0.9.0** contra PostgreSQL descartável vazio. Exigir `ready` e exatamente Flyway **V48**.
2. Popular dados **100% sintéticos** com UUIDs fixos somente naquele banco: uma turma, aluno, matrícula, sessão, participante presente, ScoreEvent de +7 e reversão de −7 referenciando o evento original. Conferir contagens, referências e **saldo final zero**, sem duplicidade da reversão.
3. Fazer `pg_dump -Fc` e gerar/verificar `SHA-256` do **snapshot pré-upgrade V48** no diretório temporário privado (`0700`). Parar v0.9.
4. Iniciar a candidata v0.10, executar o Flyway até **V55**, conferir 55 migrações bem-sucedidas, novas tabelas e exatamente os mesmos dados, IDs, presença e saldo do ledger.
5. Parar v0.10. **Não iniciar binário v0.9 sobre banco V55.** Revalidar SHA-256 e recriar **somente** o banco do container PostgreSQL efêmero; restaurar backup V48 com `pg_restore --exit-on-error`. Confirmar V48, ausência das tabelas V55 e mesmos dados.
6. Iniciar o binário original v0.9, exigir `readiness` e revalidar novamente o fingerprint. Ao terminar, encerrar e remover rede/containers/imagens temporários sem afetar os serviços principais.

## Execução confirmada

- Primeira versão do roteiro: **exit 0** e `ROLLBACK_REHEARSAL_RESULT=PASS` (`/tmp/arena-v010-synthetic-rollback-rehearsal.log`, ~40 segundos após caches quentes).
- Segunda execução reforçada: reconstruiu **ambos** os binários a partir do source na tag e da branch, sem confiar em `arena-dev-backend:latest`, passou em todas as mesmas fases com exit 0 (`/tmp/arena-v010-rollback-current-head.log`).
- Log usa marcadores `OLD_API_V48_READY`, `PRE_UPGRADE_BACKUP_SHA256`, `UPGRADE_V48_TO_V55_PRESERVES_IDS_AND_XP`, `BACKWARD_RESTORE_V48_AND_ORIGINAL_V09_API_READY` e `SYNTHETIC_DATA_FINGERPRINT=1|1|1|1|2|0|1`. Os três containers originais `arena-dev-postgres-1`, `arena-dev-backend-1`, `arena-dev-frontend-1` permaneceram ativos e saudáveis; temporários foram removidos.
- A suíte estática do frontend protege o contrato de segurança do roteiro: tag original, rede exclusiva, backup/checksum e restauração, armadilha de cleanup e proibição de invocar Compose/restore destrutivos no ensaio.

## Restrições operacionais (NO-GO ainda aberto)

**RPO:** restaurar um snapshot V48 **descarta todas as alterações feitas durante a operação sobre V55**; o ensaio não valida migração reversa dos dados criados em v0.10, e os sete novos modelos não ficam disponíveis após o rollback. Em produção, impedir escritas durante a janela de decisão ou aceitar explicitamente a perda desde o snapshot; obter aprovação operacional e backup previamente testado.

**RTO:** tempo curto em Docker local com cache aquecido **não** demonstra o tempo de recuperação de um banco de produção. É preciso ensaio com volume de dados representativo, janela máxima de indisponibilidade e cronômetro, acompanhando sessões e reconexão após troca de binário.

**PWA e clientes:** ainda faltam testar app já instalada na v0.9 em Android/iOS, service worker antigo, client novo contra servidor antigo, cache, tokens e WebSocket durante janela de manutenção. Nunca publicar uma versão usando unicamente o laboratório sintético como critério.

**Segurança:** o roteiro não acessa `.env`, banco principal, restauração real nem dados pessoais; não usa portas host. Em caso de incidente real, somente o runbook destrutivo existente `restore-postgres.sh --confirm-replace`, com backup correto, aprovação e operação monitorada pode alterar uma instalação.
