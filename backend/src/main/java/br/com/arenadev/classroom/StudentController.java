package br.com.arenadev.classroom;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
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

    public StudentController(StudentService service) {
        this.service = service;
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
        return service.create(request.registration(), request.name(), request.nickname());
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

    public record StudentRequest(String registration, @NotBlank String name, String nickname) {
    }

    public record StudentUpdateRequest(
            String registration,
            @NotBlank String name,
            String nickname,
            boolean active
    ) {
    }
}
