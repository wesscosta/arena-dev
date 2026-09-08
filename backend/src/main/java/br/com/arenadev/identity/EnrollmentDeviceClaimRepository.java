package br.com.arenadev.identity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EnrollmentDeviceClaimRepository extends JpaRepository<EnrollmentDeviceClaim, UUID> {
    Optional<EnrollmentDeviceClaim> findByTokenHash(String tokenHash);
}
