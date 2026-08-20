# Evolução do projeto

## v0.1 — projeto original

- Java 8
- Swing / NetBeans
- Ant
- JDBC
- MySQL
- persistência parcialmente implementada
- importação/exportação por arquivo texto

## v0.2 — Legacy Stabilized

- Java 21
- Swing preservado
- Maven
- CRUD persistente completo
- JDBC com `try-with-resources`
- configuração externa (`.env` / properties)
- MySQL 8.4 em Docker
- pesquisa por nome, matrícula ou e-mail
- importação/exportação CSV com compatibilidade com TXT legado
- validação de dados
- confirmação de exclusão
- testes unitários básicos
- README e scripts de execução

## v1.0 — Arena Dev

A próxima geração deixa de ser um simples cadastro desktop e passa a ser uma plataforma web de dinâmica de sala de aula:

- Java 21 + Spring Boot
- Next.js + TypeScript
- PostgreSQL
- Docker Compose
- turmas e matrículas
- sessões de aula e presença
- XP, ranking e histórico
- sorteio inteligente
- desafios e gamificação

A v0.2 existe para encerrar o legado de maneira tecnicamente consistente antes da reengenharia.
