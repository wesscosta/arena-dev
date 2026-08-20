package br.com.arenadev.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public Map<String, Object> health() {
        Integer database = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return Map.of(
                "status", "UP",
                "application", "arena-dev-api",
                "database", database != null && database == 1 ? "UP" : "DOWN",
                "timestamp", OffsetDateTime.now().toString()
        );
    }
}
