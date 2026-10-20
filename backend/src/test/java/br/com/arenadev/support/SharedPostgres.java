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
 *
 * Spring keeps up to 32 test contexts cached, each with its own pool against
 * this one server. Pools keep the default size (concurrency tests rely on it)
 * but shrink to one idle connection once their class is done, and the server
 * allows 32 x 10 connections even if every cached pool were busy at once.
 */
public final class SharedPostgres {
    private static final PostgreSQLContainer SERVER = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("arena_it")
            .withUsername("arena_test")
            .withPassword("arena_test")
            .withCommand("postgres", "-c", "max_connections=500");
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
        registry.add("spring.datasource.hikari.minimum-idle", () -> "1");
        registry.add("spring.datasource.hikari.idle-timeout", () -> "10000");
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
