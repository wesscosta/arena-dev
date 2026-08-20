package br.com.controlealunos.repository;

import br.com.controlealunos.config.DatabaseConfig;
import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.domain.Endereco;
import br.com.controlealunos.exception.RepositoryException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class JdbcAlunoRepository implements AlunoRepository {
    private static final String SELECT_COLUMNS = """
            matricula, nome, email, cpf, sexo,
            tipo_logradouro, logradouro, numero, complemento,
            bairro, cep, cidade, estado, telefone
            """;

    private static final String INSERT_SQL = """
            INSERT INTO aluno (
                matricula, nome, email, cpf, sexo,
                tipo_logradouro, logradouro, numero, complemento,
                bairro, cep, cidade, estado, telefone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String UPDATE_SQL = """
            UPDATE aluno SET
                nome = ?, email = ?, cpf = ?, sexo = ?,
                tipo_logradouro = ?, logradouro = ?, numero = ?, complemento = ?,
                bairro = ?, cep = ?, cidade = ?, estado = ?, telefone = ?
            WHERE matricula = ?
            """;

    private static final String UPSERT_SQL = INSERT_SQL + """
            ON DUPLICATE KEY UPDATE
                nome = VALUES(nome),
                email = VALUES(email),
                cpf = VALUES(cpf),
                sexo = VALUES(sexo),
                tipo_logradouro = VALUES(tipo_logradouro),
                logradouro = VALUES(logradouro),
                numero = VALUES(numero),
                complemento = VALUES(complemento),
                bairro = VALUES(bairro),
                cep = VALUES(cep),
                cidade = VALUES(cidade),
                estado = VALUES(estado),
                telefone = VALUES(telefone)
            """;

    private final DatabaseConfig config;

    public JdbcAlunoRepository(DatabaseConfig config) {
        this.config = config;
    }

    @Override
    public List<Aluno> findAll() {
        String sql = "SELECT " + SELECT_COLUMNS + " FROM aluno ORDER BY nome";
        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            return mapAll(resultSet);
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível listar os alunos.", exception);
        }
    }

    @Override
    public List<Aluno> search(String term) {
        if (term == null || term.isBlank()) {
            return findAll();
        }

        String sql = "SELECT " + SELECT_COLUMNS + " FROM aluno "
                + "WHERE LOWER(nome) LIKE ? OR CAST(matricula AS CHAR) LIKE ? OR LOWER(email) LIKE ? "
                + "ORDER BY nome";
        String pattern = "%" + term.trim().toLowerCase() + "%";

        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, pattern);
            statement.setString(2, pattern);
            statement.setString(3, pattern);
            try (ResultSet resultSet = statement.executeQuery()) {
                return mapAll(resultSet);
            }
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível pesquisar os alunos.", exception);
        }
    }

    @Override
    public Optional<Aluno> findByMatricula(int matricula) {
        String sql = "SELECT " + SELECT_COLUMNS + " FROM aluno WHERE matricula = ?";
        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, matricula);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível consultar o aluno.", exception);
        }
    }

    @Override
    public void insert(Aluno aluno) {
        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            bindInsert(statement, aluno);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível cadastrar o aluno.", exception);
        }
    }

    @Override
    public void update(Aluno aluno) {
        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(UPDATE_SQL)) {
            int index = bindCommonFields(statement, aluno, 1);
            statement.setInt(index, aluno.matricula());
            int affected = statement.executeUpdate();
            if (affected == 0) {
                throw new RepositoryException("Aluno não encontrado para atualização.", null);
            }
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível atualizar o aluno.", exception);
        }
    }

    @Override
    public void deleteByMatricula(int matricula) {
        String sql = "DELETE FROM aluno WHERE matricula = ?";
        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, matricula);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível excluir o aluno.", exception);
        }
    }

    @Override
    public void upsertAll(List<Aluno> alunos) {
        if (alunos.isEmpty()) {
            return;
        }

        try (Connection connection = config.openConnection();
             PreparedStatement statement = connection.prepareStatement(UPSERT_SQL)) {
            boolean previousAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                for (Aluno aluno : alunos) {
                    bindInsert(statement, aluno);
                    statement.addBatch();
                }
                statement.executeBatch();
                connection.commit();
            } catch (SQLException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(previousAutoCommit);
            }
        } catch (SQLException exception) {
            throw new RepositoryException("Não foi possível importar os alunos.", exception);
        }
    }

    @Override
    public boolean ping() {
        try (Connection connection = config.openConnection()) {
            return connection.isValid(3);
        } catch (SQLException exception) {
            return false;
        }
    }

    private static List<Aluno> mapAll(ResultSet resultSet) throws SQLException {
        List<Aluno> alunos = new ArrayList<>();
        while (resultSet.next()) {
            alunos.add(map(resultSet));
        }
        return alunos;
    }

    private static Aluno map(ResultSet rs) throws SQLException {
        Integer numero = (Integer) rs.getObject("numero");
        String sexoText = rs.getString("sexo");
        char sexo = sexoText == null || sexoText.isBlank() ? 'N' : sexoText.charAt(0);

        Endereco endereco = new Endereco(
                valueOrEmpty(rs.getString("tipo_logradouro")),
                valueOrEmpty(rs.getString("logradouro")),
                numero,
                valueOrEmpty(rs.getString("complemento")),
                valueOrEmpty(rs.getString("bairro")),
                valueOrEmpty(rs.getString("cep")),
                valueOrEmpty(rs.getString("cidade")),
                valueOrEmpty(rs.getString("estado")),
                valueOrEmpty(rs.getString("telefone"))
        );

        return new Aluno(
                rs.getInt("matricula"),
                rs.getString("nome"),
                valueOrEmpty(rs.getString("email")),
                valueOrEmpty(rs.getString("cpf")),
                sexo,
                endereco
        );
    }

    private static void bindInsert(PreparedStatement statement, Aluno aluno) throws SQLException {
        statement.setInt(1, aluno.matricula());
        bindCommonFields(statement, aluno, 2);
    }

    private static int bindCommonFields(PreparedStatement statement, Aluno aluno, int start) throws SQLException {
        Endereco endereco = aluno.endereco();
        int index = start;
        statement.setString(index++, aluno.nome());
        statement.setString(index++, nullIfBlank(aluno.email()));
        statement.setString(index++, nullIfBlank(aluno.cpf()));
        statement.setString(index++, String.valueOf(aluno.sexo()));
        statement.setString(index++, nullIfBlank(endereco.tipoLogradouro()));
        statement.setString(index++, nullIfBlank(endereco.logradouro()));
        if (endereco.numero() == null) {
            statement.setNull(index++, java.sql.Types.INTEGER);
        } else {
            statement.setInt(index++, endereco.numero());
        }
        statement.setString(index++, nullIfBlank(endereco.complemento()));
        statement.setString(index++, nullIfBlank(endereco.bairro()));
        statement.setString(index++, nullIfBlank(endereco.cep()));
        statement.setString(index++, nullIfBlank(endereco.cidade()));
        statement.setString(index++, nullIfBlank(endereco.estado()));
        statement.setString(index++, nullIfBlank(endereco.telefone()));
        return index;
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String nullIfBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
