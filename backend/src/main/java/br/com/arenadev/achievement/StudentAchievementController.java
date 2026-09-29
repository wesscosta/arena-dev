package br.com.arenadev.achievement;

import br.com.arenadev.study.StudyPrincipal;
import br.com.arenadev.study.StudyPrincipalResolver;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/learn/achievements")
public class StudentAchievementController {
    private final AchievementService achievements;
    private final StudyPrincipalResolver principals;

    public StudentAchievementController(AchievementService achievements, StudyPrincipalResolver principals) {
        this.achievements = achievements;
        this.principals = principals;
    }

    @GetMapping
    public AchievementService.AchievementSummary list(@RequestHeader("X-Study-Token") String token) {
        StudyPrincipal principal = principals.resolve(token);
        return achievements.list(principal.userId());
    }
}
