package br.com.arenadev.wordcloud;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/word-cloud")
public class WordCloudController {
    private final WordCloudService service;

    public WordCloudController(WordCloudService service) {
        this.service = service;
    }

    @GetMapping
    public WordCloudService.StateView state(@PathVariable UUID sessionId) {
        return service.state(sessionId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WordCloudService.StateView create(
            @PathVariable UUID sessionId,
            @Valid @RequestBody CreateRequest request
    ) {
        return service.create(
                sessionId,
                new WordCloudService.CreateCommand(
                        request.prompt(),
                        request.liveReveal(),
                        request.maxWordsPerParticipant()
                )
        );
    }

    @PostMapping("/{roundId}/reveal")
    public WordCloudService.StateView reveal(
            @PathVariable UUID sessionId,
            @PathVariable UUID roundId
    ) {
        return service.reveal(sessionId, roundId);
    }

    @PostMapping("/{roundId}/close")
    public WordCloudService.StateView close(
            @PathVariable UUID sessionId,
            @PathVariable UUID roundId
    ) {
        return service.close(sessionId, roundId);
    }

    public record CreateRequest(
            @NotBlank
            @Size(max = 280)
            String prompt,
            boolean liveReveal,
            @Min(1)
            @Max(5)
            int maxWordsPerParticipant
    ) {
    }
}
