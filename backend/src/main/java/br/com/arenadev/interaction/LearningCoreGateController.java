package br.com.arenadev.interaction;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/learning-core/gate")
public class LearningCoreGateController {
    private final InteractionCutoverGateService cutoverGateService;
    private final InteractionTraceService traceService;

    public LearningCoreGateController(
            InteractionCutoverGateService cutoverGateService,
            InteractionTraceService traceService
    ) {
        this.cutoverGateService = cutoverGateService;
        this.traceService = traceService;
    }

    @GetMapping("/cutover")
    public InteractionCutoverGateService.GateReport cutover() {
        return cutoverGateService.report();
    }

    @GetMapping("/runs/{runId}/trace")
    public InteractionTraceService.TraceView trace(@PathVariable UUID runId) {
        return traceService.trace(runId);
    }
}
