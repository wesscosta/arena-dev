# Arena Dev — Java V1 Starter

Arquitetura inicial:

- Frontend: Next.js 16 + React + TypeScript
- Backend: Java 21 + Spring Boot 4.1
- Banco: PostgreSQL 17
- Orquestração: Docker Compose

## Iniciar

```bash
cp .env.example .env
docker compose up --build
```

## Acessos

- Frontend: http://localhost:3000
- Backend health: http://localhost:8080/api/health

## Verificar containers

```bash
docker compose ps
```

## Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

## Encerrar sem apagar o banco

```bash
docker compose down
```

## Encerrar e apagar os dados do PostgreSQL

```bash
docker compose down -v
```

> O frontend desta entrega ainda conserva a V1 local-first já criada. O backend está preparado e conectado ao PostgreSQL. O próximo passo é migrar Turmas, Alunos, Sessões, ScoreEvent e Sorteio do armazenamento local para a API Java.
