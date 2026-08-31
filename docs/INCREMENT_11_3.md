# Incremento 11.3 — Testes automatizados

**Status:** concluído — fatias backend 11.3A–11.3C e frontend 11.3D validadas.

## Objetivo

Transformar os fluxos críticos já implementados em evidência automatizada antes de novas mecânicas ou do hardening de release. A suíte deve usar PostgreSQL real para não mascarar diferenças de migrations, constraints ou comportamento transacional.

## Fatia 11.3A — Fundação backend

### Implementado

- Testcontainers 2 com PostgreSQL 17;
- Maven Surefire para os testes unitários executados por `mvn test`;
- Maven Failsafe para testes de integração `*IT` executados por `mvn verify`;
- inicialização completa do Spring Boot em porta aleatória;
- aplicação das migrations Flyway `V1`–`V6` com `ddl-auto=validate`;
- verificação das quinze tabelas operacionais esperadas;
- health check público com banco disponível;
- resposta `401` para API administrativa sem sessão;
- login do professor, persistência da sessão HTTP e acesso autenticado;
- criação autenticada de turma e normalização do código;
- logout com invalidação da sessão;
- resposta `401` uniforme para credenciais inválidas, sem revelar qual campo falhou.

### Comandos

```bash
cd backend

# Rápido e sem Docker
mvn test

# Gate completo do backend; requer Docker ativo
mvn verify
```

Na primeira execução, Testcontainers baixa a imagem `postgres:17-alpine`.

### Evidência de execução

- ambiente: Arch Linux, Java 21.0.12.1 e Docker 29.7.2;
- stack exercitada: Spring Boot 4.1.0, Testcontainers 2.0.5 e PostgreSQL 17.11;
- `mvn test`: um teste executado, zero falhas, zero erros e zero ignorados;
- `mvn verify`: quatro testes de integração executados, zero falhas, zero erros e zero ignorados;
- Flyway validou e aplicou as migrations `V1`–`V6` em schema vazio;
- Hibernate/JPA validou o schema e a aplicação iniciou em porta aleatória;
- o gate completo foi repetido com sucesso em 30/08/2026.

### Avisos não bloqueantes

- Mockito/Byte Buddy usa autoanexação dinâmica do agente no Java 21; o build atual passa, mas essa configuração deverá ser tornada explícita antes de uma versão futura do JDK bloquear o comportamento por padrão;
- Testcontainers não encontrou configuração de autenticação do Docker e usou o fallback padrão; imagens públicas foram baixadas e executadas normalmente.

## Fatia 11.3B — Regras transacionais

### Implementado

- uma sessão ativa por turma;
- snapshot de participantes e presença ao iniciar a sessão;
- encerramento da sessão ativa antes da abertura da próxima;
- constraint PostgreSQL que impede duas sessões ativas na mesma turma;
- criação e reversão auditável de `ScoreEvent`;
- bloqueio de reversão duplicada e de reversão de uma reversão;
- ranking reconstruído pela soma dos eventos, incluindo o evento inverso;
- rollback integral de lote quando um lançamento de XP é inválido.

### Evidência de execução

- ambiente: Arch Linux, Java 21.0.12.1 e Docker 29.7.2;
- stack exercitada: Spring Boot 4.1.0, Testcontainers 2.0.5 e PostgreSQL 17.11;
- `mvn test`: um teste executado, zero falhas, zero erros e zero ignorados;
- `mvn verify`: oito testes de integração executados, incluindo os quatro cenários transacionais, sem falhas, erros ou testes ignorados;
- Flyway aplicou as migrations `V1`–`V6` nos dois bancos descartáveis;
- a violação PostgreSQL `23505` da constraint `uk_class_sessions_one_active_per_classroom` foi provocada e capturada pelo teste esperado;
- o código produtivo não precisou ser alterado nesta fatia;
- gate concluído com sucesso em 30/08/2026.

### Critérios de aceite da fatia 11.3B

- [x] participantes e presença inicial são cobertos por teste automatizado;
- [x] bloqueio de sessão ativa duplicada é coberto no serviço e no PostgreSQL;
- [x] criação, reversão e preservação do histórico de XP são cobertas;
- [x] ranking é reconstruído exclusivamente pela soma dos eventos;
- [x] falha em lote de XP não deixa lançamentos parciais persistidos;
- [x] `mvn verify` executado com sucesso em Java 21 e Docker ativo;
- [x] evidência de execução registrada neste documento.

## Fatia 11.3C — Concorrência realtime

### Implementado

- teste concorrente para uma única rodada `OPEN` de Buzzer por sessão;
- teste de clique simultâneo duplicado do mesmo participante;
- teste de posições oficiais únicas para participantes concorrentes;
- teste e correção da reivindicação concorrente do mesmo dispositivo;
- teste de broadcast após commit e descarte em rollback;
- lock pessimista dos participantes da sessão durante a resolução do claim;
- token já emitido passa a representar dispositivo vinculado até reconexão ou liberação pelo professor.

### Evidência de execução

- ambiente: Arch Linux, Java 21.0.12.1 e Docker 29.7.2;
- stack exercitada: Spring Boot 4.1.0, Testcontainers 2.0.5 e PostgreSQL 17.11;
- `mvn test`: um teste executado, zero falhas, zero erros e zero ignorados;
- `mvn verify`: treze testes de integração executados, incluindo os cinco cenários realtime, sem falhas, erros ou testes ignorados;
- `RealtimeConcurrencyIT` foi executada cinco vezes consecutivas, totalizando 25 cenários sem falhas, erros ou testes ignorados;
- `SessionJoinService` e `SessionParticipantRepository` foram ajustados para eliminar a corrida de emissão de tokens;
- migrations e contratos HTTP/WebSocket permanecem inalterados;
- a violação PostgreSQL `23505` da constraint `uk_buzzer_open_round_per_session` foi provocada e capturada em cada execução esperada;
- gate concluído com sucesso em 30/08/2026.

### Critérios de aceite da fatia 11.3C

- [x] uma única rodada aberta é preservada sob requisições concorrentes;
- [x] clique duplicado do mesmo participante não cria duas posições;
- [x] participantes concorrentes recebem posições únicas e ordenadas pelo backend;
- [x] apenas um token é emitido no claim concorrente do participante;
- [x] broadcast transacional ocorre somente após commit;
- [x] rollback não publica estado realtime;
- [x] `mvn verify` executado com sucesso em Java 21 e Docker ativo;
- [x] evidência de execução registrada neste documento.

## Fatia 11.3D — Frontend

### Implementado

- test runner nativo do Node, com compilação TypeScript isolada e sem dependências adicionais;
- testes do contrato de sessão expirada e login do professor com cookie;
- teste de carga e mapeamento de turmas, alunos e matrículas;
- testes de seleção persistida, fallback de turma e sessão ativa da Arena;
- testes de ranking, níveis e formação balanceada de grupos;
- testes de normalização do código, join e restauração segura do token do participante;
- normalização do código de join centralizada no cliente realtime;
- correção da formação de grupos para não deixar um participante isolado no caso 5 alunos/grupos de 2.

### Comandos

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

### Evidência de execução

- ambiente: Node.js 24.19.0 e npm 11.9.0;
- `npm test`: doze testes executados, zero falhas, zero erros e zero ignorados;
- `npm run typecheck`: concluído sem erros TypeScript;
- `npm run build`: build Next.js 16.3.0 concluído, incluindo as rotas `/` e `/join`;
- nenhuma dependência de produção ou desenvolvimento foi adicionada;
- gate concluído com sucesso em 31/08/2026.

### Critérios de aceite da fatia 11.3D

- [x] autenticação e expiração de sessão possuem cobertura do contrato cliente;
- [x] seleção e fallback de turma possuem cobertura automatizada;
- [x] sessão ativa, ranking, níveis e grupos possuem cobertura da lógica crítica da Arena;
- [x] join e reconexão do participante possuem cobertura automatizada;
- [x] TypeScript e build de produção permanecem válidos;
- [x] evidência de execução registrada neste documento.

Testes de navegador, integração E2E com backend real e Playwright permanecem no escopo do Incremento 11.4.

## Critérios de aceite da fatia 11.3A

- [x] testes unitários continuam separados dos testes com infraestrutura;
- [x] a suíte de integração usa PostgreSQL 17 descartável;
- [x] Flyway e validação JPA fazem parte da inicialização testada;
- [x] fronteira HTTP pública/protegida possui casos automatizados;
- [x] login, sessão e logout possuem casos automatizados;
- [x] `mvn test` executado com sucesso em Java 21;
- [x] `mvn verify` executado com sucesso com Docker ativo;
- [x] evidência de execução registrada neste documento.
