package br.com.controlealunos.config;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public final class DatabaseConfig {
    private final String url;
    private final String user;
    private final String password;

    private DatabaseConfig(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public static DatabaseConfig load() {
        Properties defaults = new Properties();
        try (InputStream in = DatabaseConfig.class.getResourceAsStream("/application.properties")) {
            if (in != null) {
                defaults.load(in);
            }
        } catch (IOException ignored) {
            // Os defaults internos continuam disponíveis mesmo sem o arquivo.
        }

        Map<String, String> dotEnv = loadDotEnv(Path.of(".env"));

        String url = resolve("DB_URL", "db.url", dotEnv, defaults);
        String user = resolve("DB_USER", "db.user", dotEnv, defaults);
        String password = resolve("DB_PASSWORD", "db.password", dotEnv, defaults);
        return new DatabaseConfig(url, user, password);
    }

    private static String resolve(
            String envName,
            String propertyName,
            Map<String, String> dotEnv,
            Properties defaults
    ) {
        String environment = System.getenv(envName);
        if (environment != null && !environment.isBlank()) {
            return environment;
        }
        String fileValue = dotEnv.get(envName);
        if (fileValue != null && !fileValue.isBlank()) {
            return fileValue;
        }
        return defaults.getProperty(propertyName, "");
    }

    private static Map<String, String> loadDotEnv(Path path) {
        Map<String, String> values = new HashMap<>();
        if (!Files.exists(path)) {
            return values;
        }
        try {
            for (String rawLine : Files.readAllLines(path, StandardCharsets.UTF_8)) {
                String line = rawLine.trim();
                if (line.isBlank() || line.startsWith("#") || !line.contains("=")) {
                    continue;
                }
                int separator = line.indexOf('=');
                String key = line.substring(0, separator).trim();
                String value = line.substring(separator + 1).trim();
                if ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                values.put(key, value);
            }
        } catch (IOException ignored) {
            // Falha de leitura do .env não impede o fallback para application.properties.
        }
        return values;
    }

    public Connection openConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    public String maskedDescription() {
        return url + " | user=" + user;
    }
}
