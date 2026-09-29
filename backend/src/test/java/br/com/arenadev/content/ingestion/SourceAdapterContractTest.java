package br.com.arenadev.content.ingestion;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SourceAdapterContractTest {
    @Test
    void markdownProducesSourceNeutralBlocksAndPreservesDeepStructureAndCode() {
        var adapter = new MarkdownSourceAdapter();
        var document = adapter.normalize(request(ContentIngestionSource.MARKDOWN, """
                # Python
                ## Fundamentos
                Introdução.
                ### Variáveis
                Conceito.
                #### Boas práticas
                Use nomes claros.
                ```python
                # isto não é heading
                valor = 10
                ```
                """, "python.md"));

        assertThat(document.title()).isEqualTo("Python");
        assertThat(document.provenance().source()).isEqualTo(ContentIngestionSource.MARKDOWN);
        assertThat(document.provenance().sourceLabel()).isEqualTo("python.md");
        assertThat(document.metadata()).containsEntry("mappingProfile", "MARKDOWN_H2_H3");
        assertThat(document.blocks()).anySatisfy(block -> {
            assertThat(block).isInstanceOf(NormalizedDocument.Heading.class);
            var heading = (NormalizedDocument.Heading) block;
            assertThat(heading.level()).isEqualTo(2);
            assertThat(heading.text()).isEqualTo("Fundamentos");
        });
        assertThat(document.blocks()).anySatisfy(block -> {
            assertThat(block).isInstanceOf(NormalizedDocument.Content.class);
            assertThat(block.text()).contains("# isto não é heading", "valor = 10");
        });
    }

    @Test
    void textAndExtractedFilesUseTheSameNeutralContract() {
        var adapter = new TextSourceAdapter();
        var text = adapter.normalize(request(ContentIngestionSource.TEXT, "Primeiro bloco.\n\nSegundo bloco.", "Texto colado"));
        var file = adapter.normalize(request(ContentIngestionSource.FILE, "Primeiro bloco.\n\nSegundo bloco.", "apostila.pdf"));

        assertThat(text.blocks()).extracting(NormalizedDocument.Block::text)
                .containsExactly("Primeiro bloco.", "Segundo bloco.");
        assertThat(file.blocks()).extracting(NormalizedDocument.Block::text)
                .containsExactlyElementsOf(text.blocks().stream().map(NormalizedDocument.Block::text).toList());
        assertThat(file.provenance().source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(file.provenance().sourceLabel()).isEqualTo("apostila.pdf");
    }

    private ContentIngestionService.PreviewRequest request(ContentIngestionSource source, String content, String label) {
        return new ContentIngestionService.PreviewRequest(UUID.randomUUID(), source, null, null, null, content, null, label);
    }
}
