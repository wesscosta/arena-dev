package br.com.arenadev.classroom;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService service;
    private final StudentAnonymizationService anonymization;

    public StudentController(StudentService service, StudentAnonymizationService anonymization) {
        this.service = service;
        this.anonymization = anonymization;
    }

    @GetMapping
    public List<StudentService.StudentView> list(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return service.list(includeInactive);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentService.StudentView create(@Valid @RequestBody StudentRequest request) {
        return service.create(request.registration(), request.name(), request.nickname(), request.email());
    }

    @PutMapping("/{id}")
    public StudentService.StudentView update(
            @PathVariable UUID id,
            @Valid @RequestBody StudentUpdateRequest request
    ) {
        return service.update(
                id,
                request.registration(),
                request.name(),
                request.nickname(),
                request.active()
        );
    }

    @PatchMapping("/{id}/email")
    public StudentService.StudentView updateEmail(
            @PathVariable UUID id,
            @RequestBody EmailRequest request
    ) {
        return service.updateEmail(id, request.email());
    }

    /** Irreversible: replaces personal data by a pseudonym and keeps the class history. */
    @PostMapping("/{id}/anonymize")
    public StudentService.StudentView anonymize(
            @PathVariable UUID id,
            @Valid @RequestBody AnonymizeRequest request
    ) {
        return anonymization.anonymize(id, request.confirmation());
    }

    public record AnonymizeRequest(@NotBlank String confirmation) {
    }

    /** Name, e-mail or both; the service rejects a request without either. */
    public record StudentRequest(String registration, String name, String nickname, String email) {
    }

    public record EmailRequest(String email) {
    }

    public record StudentUpdateRequest(
            String registration,
            @NotBlank String name,
            String nickname,
            boolean active
    ) {
    }
}
