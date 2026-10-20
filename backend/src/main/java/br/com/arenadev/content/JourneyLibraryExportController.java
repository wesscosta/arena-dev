package br.com.arenadev.content;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class JourneyLibraryExportController {
    private final JourneyLibraryExportService service;

    public JourneyLibraryExportController(JourneyLibraryExportService service) { this.service = service; }

    @PostMapping("/api/journeys/{id}/library-export")
    public JourneyLibraryExportService.ExportResult saveContentsToLibrary(@PathVariable UUID id) {
        return service.saveContentsToLibrary(id);
    }
}
