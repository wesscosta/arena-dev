package br.com.arenadev.study;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/learn/profile")
public class StudentProfileController {
    private final StudentProfileService profiles;
    private final StudyPrincipalResolver principals;

    public StudentProfileController(StudentProfileService profiles, StudyPrincipalResolver principals) {
        this.profiles = profiles;
        this.principals = principals;
    }

    @GetMapping
    public StudentProfileService.ProfileView get(@RequestHeader("X-Study-Token") String token) {
        return profiles.get(principals.resolve(token));
    }

    @PutMapping
    public StudentProfileService.ProfileView complete(
            @RequestHeader("X-Study-Token") String token,
            @RequestBody ProfileRequest request
    ) {
        return profiles.complete(principals.resolve(token), request.name(), request.email());
    }

    public record ProfileRequest(String name, String email) {
    }
}
