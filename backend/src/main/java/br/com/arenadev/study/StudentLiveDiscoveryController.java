package br.com.arenadev.study;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/learn/live")
public class StudentLiveDiscoveryController {
    private final StudentLiveDiscoveryService live;
    private final StudyPrincipalResolver principals;

    public StudentLiveDiscoveryController(StudentLiveDiscoveryService live, StudyPrincipalResolver principals) {
        this.live = live;
        this.principals = principals;
    }

    @GetMapping
    public List<StudentLiveDiscoveryService.LiveSessionSummary> list(
            @RequestHeader("X-Study-Token") String token
    ) {
        return live.list(principals.resolve(token));
    }
}
