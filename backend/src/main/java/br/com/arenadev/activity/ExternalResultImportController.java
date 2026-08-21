package br.com.arenadev.activity;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities/{activityId}/external-results")
public class ExternalResultImportController {
    private final ExternalResultImportService service;

    public ExternalResultImportController(ExternalResultImportService service) {
        this.service = service;
    }

    @PostMapping("/preview")
    public ExternalResultImportService.Preview preview(
            @PathVariable UUID activityId,
            @RequestBody ExternalResultImportService.ImportRequest request
    ) {
        return service.preview(activityId, request);
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public ExternalResultImportService.ImportView execute(
            @PathVariable UUID activityId,
            @RequestBody ExternalResultImportService.ImportRequest request
    ) {
        return service.execute(activityId, request);
    }

    @GetMapping("/imports")
    public List<ExternalResultImportService.ImportSummary> history(@PathVariable UUID activityId) {
        return service.history(activityId);
    }
}
