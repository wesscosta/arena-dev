package br.com.arenadev.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardBootstrapController {
    private final DashboardBootstrapService service;
    public DashboardBootstrapController(DashboardBootstrapService service) { this.service=service; }

    @GetMapping("/bootstrap")
    public DashboardBootstrapService.DashboardSnapshot bootstrap() { return service.bootstrap(); }
}
