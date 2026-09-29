package br.com.arenadev.study;

import br.com.arenadev.classroom.Enrollment;
import br.com.arenadev.identity.DeviceClaimService;
import br.com.arenadev.identity.EnrollmentDeviceClaim;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudyPrincipalResolver {
    private final DeviceClaimService deviceClaims;

    public StudyPrincipalResolver(DeviceClaimService deviceClaims) {
        this.deviceClaims = deviceClaims;
    }

    public StudyPrincipal resolve(String token) {
        try {
            EnrollmentDeviceClaim claim = deviceClaims.requireUsable(token);
            Enrollment enrollment = claim.getEnrollment();
            deviceClaims.markUsed(claim);
            return new StudyPrincipal(
                    enrollment.getStudent().getId(),
                    enrollment.getId(),
                    enrollment.getClassroom().getId(),
                    StudyPrincipal.Role.STUDENT
            );
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidade de estudo inválida ou expirada.");
        }
    }
}
