# Incremento 11.3 — Testes automatizados

**Status:** parcial — fatia 11.3A implementada; execução pendente em ambiente com Java 21, Maven e Docker.

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

### Evidência disponível

- o código da suíte e a configuração Maven estão implementados;
- o diff e a estrutura documental foram validados no ambiente de auditoria;
- a execução Java ainda não foi realizada nesse ambiente porque Java 21, Maven e Docker não estão disponíveis.

Essa limitação deve permanecer explícita: a fatia está **Implementada**, mas não deve ser classificada como **Validada** até que `mvn verify` finalize com sucesso.

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
- [ ] `mvn test` executado com sucesso em Java 21;
- [ ] `mvn verify` executado com sucesso com Docker ativo;
- [ ] evidência de execução registrada neste documento.
