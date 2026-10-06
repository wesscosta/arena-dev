package br.com.arenadev.content.ingestion;

import br.com.arenadev.content.LearningResourceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/library/ingestion")
public class LibraryIngestionController {
    private final LibraryIngestionService service;
    private final LearningResourceService resources;

    public LibraryIngestionController(
            LibraryIngestionService service,
            LearningResourceService resources
    ) {
        this.service = service;
        this.resources = resources;
    }

    @GetMapping("/capabilities")
    public LibraryIngestionService.Capabilities capabilities() {
        return service.capabilities();
    }

    @PostMapping("/preview")
    public LibraryIngestionService.PreviewView preview(
            @RequestBody LibraryIngestionService.PreviewRequest request
    ) {
        return service.preview(request);
    }

    @PostMapping(value = "/file-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LibraryIngestionService.PreviewView previewFile(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String summary,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String language,
            @RequestPart("file") MultipartFile file
    ) {
        return service.previewFile(title, summary, subject, tags, language, file);
    }

    @PostMapping("/materialize")
    @ResponseStatus(HttpStatus.CREATED)
    public LearningResourceService.ResourceView materialize(
            @RequestBody LibraryIngestionService.MaterializeRequest request
    ) {
        return service.materialize(request, resources);
    }
}
