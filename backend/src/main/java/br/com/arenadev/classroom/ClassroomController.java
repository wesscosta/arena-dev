package br.com.arenadev.classroom;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
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
@RequestMapping("/api/classrooms")
public class ClassroomController {
    private final ClassroomService service;

    public ClassroomController(ClassroomService service) {
        this.service = service;
    }

    @GetMapping
    public List<ClassroomService.ClassroomView> list(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return service.list(includeInactive);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomService.ClassroomView create(@Valid @RequestBody ClassroomRequest request) {
        return service.create(request.name(), request.code(), request.themeColor(), request.themeIcon());
    }

    @PutMapping("/{id}")
    public ClassroomService.ClassroomView update(
            @PathVariable UUID id,
            @Valid @RequestBody ClassroomUpdateRequest request
    ) {
        return service.update(id, request.name(), request.code(), request.active(), request.themeColor(), request.themeIcon());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}/students")
    public List<ClassroomService.EnrollmentView> students(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return service.students(id, includeInactive);
    }

    @PostMapping("/{id}/students/{studentId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomService.EnrollmentView enroll(
            @PathVariable UUID id,
            @PathVariable UUID studentId
    ) {
        return service.enroll(id, studentId);
    }

    @PatchMapping("/{id}/students/{studentId}/preferred-name")
    public ClassroomService.EnrollmentView updatePreferredName(
            @PathVariable UUID id,
            @PathVariable UUID studentId,
            @RequestBody EnrollmentPreferredNameRequest request
    ) {
        return service.updatePreferredName(id, studentId, request.preferredName());
    }

    @PatchMapping("/{id}/students/{studentId}")
    public ClassroomService.EnrollmentView setEnrollmentActive(
            @PathVariable UUID id,
            @PathVariable UUID studentId,
            @RequestBody EnrollmentStatusRequest request
    ) {
        return service.setEnrollmentActive(id, studentId, request.active());
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID id, @PathVariable UUID studentId) {
        service.remove(id, studentId);
    }

    public record ClassroomRequest(
            @NotBlank String name,
            String code,
            String themeColor,
            String themeIcon
    ) {
    }

    public record ClassroomUpdateRequest(
            @NotBlank String name,
            String code,
            boolean active,
            String themeColor,
            String themeIcon
    ) {
    }

    public record EnrollmentStatusRequest(boolean active) {
    }

    public record EnrollmentPreferredNameRequest(String preferredName) {
    }
}
