# Changelog

## [0.2.0] - 2026-08-20

### Added
- Maven como sistema de build.
- Suporte a Java 21.
- MySQL 8.4 via Docker Compose.
- Configuração externa por `.env` e `application.properties`.
- Pesquisa por nome, matrícula e e-mail.
- Importação e exportação CSV.
- Compatibilidade de importação com o TXT legado sem cabeçalho.
- Validação de formulário e mensagens de erro.
- Testes unitários básicos.

### Changed
- Persistência JDBC reorganizada em Repository + Service.
- Entidades convertidas para records imutáveis.
- Recursos JDBC agora usam `try-with-resources`.
- Banco de dados é a fonte de verdade do sistema.

### Fixed
- Atualização de aluno agora executa `UPDATE` no banco.
- Exclusão de aluno agora executa `DELETE` no banco.
- Importação deixa de ser sobrescrita pela recarga da tabela.
- Operações de banco não retornam sucesso em caso de falha.
- Falha de conexão é tratada antes da abertura da interface principal.
