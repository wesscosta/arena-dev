# ADR-0002 — Monólito modular com Next.js, Spring Boot, PostgreSQL e Docker

- **Status:** Aceito
- **Data:** 2026-08-20
- **Escopo:** arquitetura, infraestrutura

## Contexto

O Arena Dev precisa suportar CRUD, regras de negócio, histórico auditável e algumas interações em tempo real, mas ainda está em fase de MVP. Microserviços, mensageria e coordenação distribuída aumentariam custo operacional sem benefício proporcional neste estágio.

## Decisão

Adotar:

- **Frontend:** Next.js + TypeScript;
- **Backend:** Java 21 + Spring Boot;
- **Banco:** PostgreSQL;
- **Migrations:** Flyway;
- **Infra local/inicial:** Docker Compose;
- **Arquitetura de backend:** monólito modular por domínio.

Não adotar no MVP:

- microserviços;
- Kafka/RabbitMQ;
- Redis como requisito;
- acesso direto do frontend ao banco.

## Consequências

### Positivas

- implantação simples;
- transações e regras centralizadas;
- menor custo de observabilidade e operação;
- módulos podem evoluir internamente sem distribuição prematura.

### Custos e riscos

- exige disciplina de modularização para evitar monólito acoplado;
- escalabilidade horizontal de recursos em tempo real poderá exigir coordenação adicional no futuro.

## Alternativas consideradas

### Microserviços desde o MVP

Rejeitada por complexidade prematura.

### Backend-as-a-Service acessado diretamente pelo navegador

Rejeitada porque regras como score, sorteio e Buzzer precisam de autoridade de servidor.

## Critérios de validação

- [ ] módulos de domínio possuem responsabilidades claras;
- [ ] frontend não executa escrita direta no PostgreSQL;
- [ ] aplicação sobe com frontend, backend e banco em Compose.

## Relações

- Relacionados: ADR-0006, ADR-0014
