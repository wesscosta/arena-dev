package br.com.arenadev.content.ingestion;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/content-ingestion")
public class ContentIngestionController {
    private final ContentIngestionService service;
    private final JourneyDraftMaterializationService materializationService;

    public ContentIngestionController(
            ContentIngestionService service,
            JourneyDraftMaterializationService materializationService
    ) {
        this.service = service;
        this.materializationService = materializationService;
    }

    @GetMapping("/capabilities")
    public ContentIngestionService.Capabilities capabilities() {
        return service.capabilities();
    }

    @PostMapping("/preview")
    public ContentIngestionService.DraftView preview(
            @RequestBody ContentIngestionService.PreviewRequest request
    ) {
        return service.preview(request);
    }

    @PostMapping(value = "/file-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ContentIngestionService.DraftView previewFile(
            @RequestParam UUID classroomId,
            @RequestParam(required = false) String title,
            @RequestPart("file") MultipartFile file
    ) {
        return service.previewFile(classroomId, title, file);
    }

    @PostMapping("/materialize")
    public br.com.arenadev.journey.JourneyService.JourneyView materialize(
            @RequestBody JourneyDraftMaterializationService.MaterializeRequest request
    ) {
        return materializationService.materialize(request);
    }
}
