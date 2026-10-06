package br.com.arenadev.content;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/library/resources")
public class ContentLibraryController {
    private final LearningResourceService service;
    private final LearningResourceUsageService usageService;

    public ContentLibraryController(
            LearningResourceService service,
            LearningResourceUsageService usageService
    ) {
        this.service = service;
        this.usageService = usageService;
    }

    @GetMapping
    public List<LearningResourceService.ResourceView> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String language,
            @RequestParam(defaultValue = "RECENT") LearningResourceService.LibrarySort sort
    ) {
        return service.listLibrary(q, archived, subject, tag, language, sort);
    }

    @GetMapping("/facets")
    public LearningResourceService.LibraryFacets facets() {
        return service.facets();
    }

    @GetMapping("/{id}")
    public LearningResourceService.ResourceView get(@PathVariable UUID id) {
        return service.getLibrary(id);
    }

    @GetMapping("/{id}/usage")
    public LearningResourceUsageService.ResourceUsageView usage(@PathVariable UUID id) {
        return usageService.usage(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningResourceService.ResourceView create(
            @RequestBody LearningResourceService.LibraryResourceInput input
    ) {
        return service.createLibrary(input);
    }

    @PutMapping("/{id}")
    public LearningResourceService.ResourceView update(
            @PathVariable UUID id,
            @RequestBody LearningResourceService.LibraryResourceInput input
    ) {
        return service.updateLibrary(id, input);
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable UUID id) {
        service.archiveLibrary(id);
    }

    @PostMapping("/{id}/restore")
    public LearningResourceService.ResourceView restore(@PathVariable UUID id) {
        return service.restoreLibrary(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void legacyArchive(@PathVariable UUID id) {
        service.archiveLibrary(id);
    }
}
