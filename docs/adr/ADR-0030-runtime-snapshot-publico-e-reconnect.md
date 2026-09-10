# ADR-0030 — Snapshot público de runtime e política de reconnect

**Status:** aceito  
**Data:** 08/09/2026

## Contexto

Após 12.4D/12.4E, Projetor e `/join` consumiam o mesmo Live Stage, porém a restauração inicial do WebSocket era composta por vários frames independentes (`LIVE_STAGE_STATE`, `BUZZER_STATE`, `TIMER_STATE`, `WORD_CLOUD_STATE`, `POLL_STATE` e estados privados).

Em reconnect isso podia criar estados transitórios inconsistentes e mantinha dois problemas adicionais:

1. o Buzzer enviado ao participante ainda reutilizava a projeção administrativa;
2. credencial inválida podia permanecer em ciclo de reconnect.

## Decisão

Adotar um `RUNTIME_SNAPSHOT` por audiência após autenticação bem-sucedida.

### Projetor

Recebe somente estado público:

```text
stage + buzzer público + timer + word cloud + poll + boss
```

### Participante

Recebe o mesmo núcleo público mais estados privados exclusivamente próprios:

```text
buzzerParticipant
wordCloudParticipant
pollParticipant
```

Eventos especializados continuam sendo usados para atualizações incrementais depois do snapshot.

Falha de autenticação gera `AUTH_FAILED` e encerramento do WebSocket com `POLICY_VIOLATION`.

Reconnect usa backoff limitado e preserva o último palco enquanto tenta recuperar sincronização.

## Consequências

### Positivas

- restauração coerente após reconnect;
- primeiro paint do Projetor com runtime completo via REST;
- menor exposição de dados no Buzzer público;
- separação explícita entre estado coletivo e estado privado do participante;
- fim do loop infinito de reconnect com token inválido;
- device claim pode recuperar novo participant token sem armazenar identidade no navegador;
- Boss passa a ser sincronizado como runtime especializado.

### Custos

- novo contrato `RUNTIME_SNAPSHOT` precisa ser mantido junto dos eventos incrementais;
- clientes antigos que esperem somente frames individuais não recebem restauração inicial completa;
- o snapshot agrega leituras de vários módulos no momento da autenticação.

## Regras

1. reconnect nunca cria Poll, Word Cloud, Buzzer, Boss ou ActivityStep;
2. snapshot é leitura do estado autoritativo atual;
3. participante não recebe DTO administrativo de Buzzer;
4. socket só é considerado `online` após `AUTH_OK`;
5. `AUTH_FAILED` interrompe retry daquela credencial;
6. `/join` pode trocar device claim válido por novo participant token;
7. Projetor e `/join` preservam último estado conhecido durante perda transitória de conexão;
8. Quiz não é simulado por este contrato antes de existir runtime próprio.
