package br.com.arenadev.content.ingestion;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotionSourceAdapterTest {
    private final NotionPageProvider provider = org.mockito.Mockito.mock(NotionPageProvider.class);
    private final NotionSourceAdapter adapter = new NotionSourceAdapter(new MarkdownSourceAdapter(), provider);

    @Test
    void createsReferenceSnapshotWithoutScrapingWhenOnlyUrlIsAvailable() {
        var document = adapter.normalize(request(null, "https://www.notion.so/workspace/Python-3cbf3eb198c381429835c57908737722?source=copy_link"));
        assertThat(document.blocks()).isEmpty();
        assertThat(document.provenance().source()).isEqualTo(ContentIngestionSource.NOTION);
        assertThat(document.provenance().sourceIdentifier()).isEqualTo("3cbf3eb1-98c3-8142-9835-c57908737722");
        assertThat(document.metadata()).containsEntry("requiresAuthorizedProvider", "true");
    }

    @Test
    void normalizesAuthorizedSnapshotThroughTheSameHeadingContract() {
        var document = adapter.normalize(request("""
                # Python
                ## Fundamentos
                ### Variáveis
                Conteúdo da página.
                #### Observação
                Texto complementar.
                """, "https://workspace.notion.site/Python-3cbf3eb198c381429835c57908737722"));
        assertThat(document.title()).isEqualTo("Python");
        assertThat(document.provenance().format()).isEqualTo("NOTION_MARKDOWN_SNAPSHOT");
        assertThat(document.blocks()).anySatisfy(block -> {
            assertThat(block).isInstanceOf(NormalizedDocument.Heading.class);
            assertThat(((NormalizedDocument.Heading) block).level()).isEqualTo(2);
        });
        assertThat(document.metadata()).containsEntry("snapshot", "true");
    }

    @Test
    void rejectsNonNotionHosts() {
        assertThatThrownBy(() -> adapter.normalize(request(null, "https://example.com/page")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Notion");
    }

    private ContentIngestionService.PreviewRequest request(String content, String url) {
        return new ContentIngestionService.PreviewRequest(UUID.randomUUID(), ContentIngestionSource.NOTION,
                null, null, null, content, url, "Notion");
    }
}
