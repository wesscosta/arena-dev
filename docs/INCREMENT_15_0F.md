# Incremento 15.0F — Fake Adapter, Contract Tests & Closeout

## Objetivo

Fechar o bloco 15.0 garantindo que o Integration Core consiga descobrir adapters
por provider e que qualquer implementação futura obedeça ao mesmo contrato mínimo.

## Adapter registry

Foi adicionado `LearningPlatformAdapterRegistry`.

Responsabilidades:

- indexar adapters por `LearningPlatformProvider`;
- resolver o adapter de uma conexão;
- falhar explicitamente quando não houver implementação;
- impedir dois adapters concorrentes para o mesmo provider.

O registry não conhece Microsoft Graph nem Google Classroom API.

## Fake adapter

O fake existe apenas em testes:

`FakeLearningPlatformAdapter`

Ele valida o SPI sem introduzir dependências de provider no runtime.

## Contract suite

Foi criado `LearningPlatformAdapterContract`.

Toda implementação real deverá demonstrar que:

1. declara o provider canônico correto;
2. expõe somente suas capacidades;
3. `supports(...)` respeita as capacidades;
4. nunca aceita conexão de outro provider.

## Gate

```bash
cd backend
mvn -B -ntp -Dtest=FakeLearningPlatformAdapterContractTest,LearningPlatformAdapterRegistryTest test
mvn -B -ntp verify
```

Depois:

```bash
cd ..
docker compose up -d --build
docker compose ps
```

## Fechamento esperado

```text
15.0A Audit & Contract Freeze     DONE
15.0B Integration Domain         DONE
15.0C Persistence / V26          DONE
15.0D Application Services       DONE
15.0E Administrative API         DONE
15.0F Adapter Contract/Closeout  DONE
```

O próximo bloco é **15.1 — Microsoft Identity + Graph Connection**.
