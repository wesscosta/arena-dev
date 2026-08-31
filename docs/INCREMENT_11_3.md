# Incremento 11.3 — Testes automatizados

**Status:** parcial — fatia 11.3A validada; regras transacionais, concorrência e frontend permanecem pendentes.

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

## Próximas fatias

### 11.3B — Regras transacionais

- uma sessão ativa por turma;
- presença e participantes da sessão;
- criação e reversão de `ScoreEvent`;
- ranking como projeção da soma dos eventos;
- constraints de duplicidade e preservação de histórico.

### 11.3C — Concorrência realtime

- uma rodada `OPEN` de Buzzer por sessão;
- um clique por participante/rodada;
- posições oficiais sem duplicidade;
- reivindicação concorrente de dispositivo;
- broadcast apenas após commit.

### 11.3D — Frontend

- autenticação e expiração de sessão;
- seleção de turma;
- fluxos críticos da Arena;
- join e reconexão do participante.

## Critérios de aceite da fatia 11.3A

- [x] testes unitários continuam separados dos testes com infraestrutura;
- [x] a suíte de integração usa PostgreSQL 17 descartável;
- [x] Flyway e validação JPA fazem parte da inicialização testada;
- [x] fronteira HTTP pública/protegida possui casos automatizados;
- [x] login, sessão e logout possuem casos automatizados;
- [x] `mvn test` executado com sucesso em Java 21;
- [x] `mvn verify` executado com sucesso com Docker ativo;
- [x] evidência de execução registrada neste documento.
