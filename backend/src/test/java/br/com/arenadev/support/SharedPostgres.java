package br.com.arenadev.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * One PostgreSQL 17 server per test JVM, with a fresh database per test
 * class. Classes stay as isolated as with their own container (each one
 * starts on an empty, freshly migrated schema) without paying a container
 * start per class. Testcontainers' reaper removes the server when the JVM ends.
 */
public final class SharedPostgres {
    private static final PostgreSQLContainer SERVER = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_it")
            .withUsername("arena_test")
            .withPassword("arena_test");
    private static final Set<String> CREATED = new HashSet<>();

    static {
        SERVER.start();
    }

    private SharedPostgres() {
    }

    public static void register(DynamicPropertyRegistry registry, Class<?> testClass) {
        String url = jdbcUrl(testClass);
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", SERVER::getUsername);
        registry.add("spring.datasource.password", SERVER::getPassword);
    }

    public static synchronized String jdbcUrl(Class<?> testClass) {
        String database = "it_" + testClass.getSimpleName().toLowerCase(Locale.ROOT);
        if (CREATED.add(database)) {
            try (var connection = DriverManager.getConnection(SERVER.getJdbcUrl(), username(), password());
                 var statement = connection.createStatement()) {
                statement.execute("create database " + database);
            } catch (SQLException error) {
                throw new IllegalStateException("Could not create test database " + database, error);
            }
        }
        return "jdbc:postgresql://" + SERVER.getHost() + ":" + SERVER.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT)
                + "/" + database;
    }

    public static String username() {
        return SERVER.getUsername();
    }

    public static String password() {
        return SERVER.getPassword();
    }
}
