# Controle de Alunos — Legacy v0.2

Versão estabilizada de um projeto desktop antigo de controle de alunos. Esta release preserva **Java + Swing + JDBC** como identidade do legado, mas corrige os problemas funcionais e moderniza a base antes da reengenharia que dará origem ao **Arena Dev**.

## O que mudou na v0.2

- Java 21;
- Maven no lugar do Ant/NetBeans como build principal;
- CRUD completo e persistente (`INSERT`, `SELECT`, `UPDATE`, `DELETE`);
- JDBC com `try-with-resources`;
- MySQL como fonte de verdade;
- MySQL 8.4 executado em container;
- configuração externa via `.env`;
- busca por nome, matrícula ou e-mail;
- importação CSV/TXT e exportação CSV;
- importação com `upsert` por matrícula;
- validação dos campos;
- confirmação antes de excluir;
- testes unitários básicos;
- tratamento explícito de falha de banco.

## Arquitetura

```text
Swing UI
   ↓
AlunoService
   ↓
AlunoRepository
   ↓
JDBC
   ↓
MySQL 8.4 (Docker)
```

O arquivo CSV é apenas um mecanismo de entrada/saída. O **MySQL é a fonte de verdade**.

## Pré-requisitos

- Java 21;
- Docker + Docker Compose;
- Maven 3.9+ (opcional, porque há um script para executar Maven via Docker).

## 1. Configuração

```bash
cp .env.example .env
```

Os valores padrão já funcionam com o `compose.yaml` fornecido.

## 2. Subir o banco

```bash
docker compose up -d
```

Confira:

```bash
docker compose ps
```

O serviço `controle-alunos-mysql` deve aparecer como `healthy`.

## 3. Executar os testes

Com Maven instalado:

```bash
mvn test
```

Ou usando somente Docker:

```bash
./scripts/mvn-docker.sh test
```

## 4. Gerar o JAR

```bash
mvn clean package
```

ou:

```bash
./scripts/mvn-docker.sh clean package
```

O artefato será criado em:

```text
target/controle-alunos-0.2.0.jar
```

## 5. Executar a aplicação

```bash
java -jar target/controle-alunos-0.2.0.jar
```

ou:

```bash
./scripts/run.sh
```

> A interface Swing roda diretamente no sistema operacional. Apenas o MySQL é containerizado intencionalmente.

## Importação

A aplicação suporta:

- CSV gerado pela própria v0.2, com cabeçalho;
- TXT legado separado por `;`, sem cabeçalho, desde que preserve os 14 campos originais.

Ao importar, uma matrícula que já exista é **atualizada**; uma matrícula nova é **inserida**.

## Exportação

A exportação gera CSV UTF-8 separado por `;`, com tratamento de `;` e aspas dentro dos campos.

## Estrutura

```text
src/main/java/br/com/controlealunos/
├── App.java
├── config/
├── domain/
├── exception/
├── io/
├── repository/
├── service/
├── ui/
└── validation/
```

## Próxima geração: Arena Dev

A v0.2 encerra a fase desktop do projeto. A v1 será uma reengenharia para:

```text
Next.js + TypeScript
        ↓ REST
Java 21 + Spring Boot
        ↓
PostgreSQL
```

com turmas, sessões, presença, XP, ranking, sorteio inteligente, desafios e gamificação.

Consulte [`docs/EVOLUTION.md`](docs/EVOLUTION.md) para a linha evolutiva completa.
