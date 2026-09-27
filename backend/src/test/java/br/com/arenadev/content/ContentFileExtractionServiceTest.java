package br.com.arenadev.content;

import br.com.arenadev.content.ingestion.ContentFileExtractionService;
import br.com.arenadev.content.ingestion.ContentIngestionSource;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ContentFileExtractionServiceTest {
    private final ContentFileExtractionService service = new ContentFileExtractionService();

    @Test
    void extractsPlainTextWithoutPersistingTheUploadedFile() {
        var file = new MockMultipartFile(
                "file",
                "roteiro.txt",
                "text/plain",
                "Introdução\n\nPrática orientada".getBytes(StandardCharsets.UTF_8)
        );

        var extracted = service.extract(file);

        assertThat(extracted.filename()).isEqualTo("roteiro.txt");
        assertThat(extracted.source()).isEqualTo(ContentIngestionSource.TEXT);
        assertThat(extracted.content()).contains("Introdução", "Prática orientada");
    }

    @Test
    void rejectsUnknownFileFormatsBeforeParsing() {
        var file = new MockMultipartFile("file", "arquivo.exe", "application/octet-stream", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.extract(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Formato não suportado");
    }
}
