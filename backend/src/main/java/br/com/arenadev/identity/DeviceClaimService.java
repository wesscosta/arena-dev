package br.com.arenadev.identity;

import br.com.arenadev.classroom.Enrollment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class DeviceClaimService {
    private final EnrollmentDeviceClaimRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    public DeviceClaimService(EnrollmentDeviceClaimRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public IssuedDeviceClaim issue(Enrollment enrollment) {
        Instant now = Instant.now();
        String token = generateToken();
        EnrollmentDeviceClaim claim = new EnrollmentDeviceClaim(enrollment, hashToken(token), now);
        repository.save(claim);
        return new IssuedDeviceClaim(token, claim.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public EnrollmentDeviceClaim requireUsable(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidClaim();
        }
        Instant now = Instant.now();
        EnrollmentDeviceClaim claim = repository.findByTokenHash(hashToken(rawToken.trim()))
                .orElseThrow(DeviceClaimService::invalidClaim);
        if (!claim.isUsableAt(now) || !claim.getEnrollment().isActive()) {
            throw invalidClaim();
        }
        return claim;
    }

    @Transactional
    public void markUsed(EnrollmentDeviceClaim claim) {
        claim.touch(Instant.now());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        repository.findByTokenHash(hashToken(rawToken.trim()))
                .filter(claim -> claim.getRevokedAt() == null)
                .ifPresent(claim -> claim.revoke(Instant.now()));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 indisponível.", error);
        }
    }

    private static IllegalArgumentException invalidClaim() {
        return new IllegalArgumentException("Dispositivo não reconhecido para esta turma.");
    }

    public record IssuedDeviceClaim(String token, Instant expiresAt) {
    }
}
