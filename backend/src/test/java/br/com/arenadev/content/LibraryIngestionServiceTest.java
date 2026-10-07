package br.com.arenadev.content;

import br.com.arenadev.content.ingestion.ContentFileExtractionService;
import br.com.arenadev.content.ingestion.ContentIngestionSource;
import br.com.arenadev.content.ingestion.LibraryIngestionService;
import br.com.arenadev.content.ingestion.NotionPageProvider;
import br.com.arenadev.content.ingestion.TextSourceAdapter;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LibraryIngestionServiceTest {
    private final ContentFileExtractionService files = mock(ContentFileExtractionService.class);
    private final NotionPageProvider notion = mock(NotionPageProvider.class);
    private final LibraryIngestionService service = new LibraryIngestionService(
            new ContentCanonicalizer(), files, notion, new TextSourceAdapter()
    );

    @Test
    void markdownPreviewPreservesHierarchyWithoutAiAndCarriesEditorialMetadata() {
        var preview = service.preview(new LibraryIngestionService.PreviewRequest(
                ContentIngestionSource.MARKDOWN,
                null,
                "Material da UC",
                "Banco de Dados",
                List.of("SQL", "SELECT"),
                "pt-BR",
                """
                # SQL Essencial
                ## Consultas
                ### SELECT
                Consulta dados.
                ### WHERE
                Filtra linhas.
                """,
                null,
                "sql.md"
        ));

        assertThat(preview.title()).isEqualTo("SQL Essencial");
        assertThat(preview.subject()).isEqualTo("Banco de Dados");
        assertThat(preview.tags()).containsExactly("SQL", "SELECT");
        assertThat(preview.outline()).hasSize(1);
        assertThat(preview.outline().getFirst().children().getFirst().title()).isEqualTo("Consultas");
        assertThat(preview.structureAnalysis().mode()).isEqualTo("DETERMINISTIC");
        assertThat(preview.structureAnalysis().aiRecommended()).isFalse();
        assertThat(preview.sourceReference()).isEqualTo("sql.md");
    }

    @Test
    void urlPreviewStaysReferenceOnlyAndNeverPretendsToHaveContent() {
        var preview = service.preview(new LibraryIngestionService.PreviewRequest(
                ContentIngestionSource.URL,
                "Documentação",
                null,
                "APIs",
                List.of("HTTP"),
                "pt-BR",
                null,
                "https://example.com/docs",
                "Docs"
        ));

        assertThat(preview.format()).isEqualTo(LearningResourceFormat.LINK);
        assertThat(preview.body()).isNull();
        assertThat(preview.outline()).isEmpty();
        assertThat(preview.structureAnalysis().mode()).isEqualTo("REFERENCE_ONLY");
    }

    @Test
    void notionWithoutAuthorizedProviderKeepsAReferenceInsteadOfScraping() {
        when(notion.isConfigured()).thenReturn(false);

        var preview = service.preview(new LibraryIngestionService.PreviewRequest(
                ContentIngestionSource.NOTION,
                "Página",
                null,
                null,
                List.of(),
                "pt-BR",
                null,
                "https://example.notion.site/Pagina-1234567890abcdef1234567890abcdef",
                "Notion"
        ));

        assertThat(preview.sourceType()).isEqualTo(LearningResourceSourceType.NOTION);
        assertThat(preview.format()).isEqualTo(LearningResourceFormat.LINK);
        assertThat(preview.structureAnalysis().mode()).isEqualTo("REFERENCE_ONLY");
    }
}
