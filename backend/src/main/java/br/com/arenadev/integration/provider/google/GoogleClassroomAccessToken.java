package br.com.arenadev.integration.provider.google;
import java.time.OffsetDateTime;
public record GoogleClassroomAccessToken(String token, OffsetDateTime expiresAt) {}
