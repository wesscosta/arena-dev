package br.com.arenadev.content;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ContentCanonicalizerTest {
    private final ContentCanonicalizer canonicalizer = new ContentCanonicalizer();

    @Test
    void canonicalizesMarkdownDeterministicallyAndBuildsNestedOutline() {
        String markdown = """
                # Banco de Dados

                ## SQL
                ### SELECT
                Conteúdo.
                #### WHERE
                Mais conteúdo.

                ## Normalização
                ### 1FN
                """;

        var first = canonicalizer.canonicalize(
                "Banco de Dados", markdown, LearningResourceFormat.MARKDOWN, null,
                "Banco de Dados", List.of("SQL", " sql ", "SELECT"), "pt-BR"
        );
        var second = canonicalizer.canonicalize(
                "Banco de Dados", markdown.replace("\n", "\r\n"), LearningResourceFormat.MARKDOWN, null,
                "Banco de Dados", List.of("SQL", "SELECT"), "pt-BR"
        );

        assertThat(first.contentSha256()).isEqualTo(second.contentSha256());
        assertThat(first.sections()).hasSize(1);
        assertThat(first.sections().getFirst().title()).isEqualTo("Banco de Dados");
        assertThat(first.sections().getFirst().children()).extracting(CanonicalDocument.Section::title)
                .containsExactly("SQL", "Normalização");
        assertThat(first.sections().getFirst().children().getFirst().children().getFirst().sectionPath())
                .containsExactly("Banco de Dados", "SQL", "SELECT");
        assertThat(first.tags()).containsExactly("SQL", "SELECT");
    }

    @Test
    void ignoresMarkdownHeadingsInsideCodeFencesAndCreatesStableDuplicateAnchors() {
        String markdown = """
                # Python
                ## Funções
                ```python
                # não é heading
                ## também não
                ```
                ## Funções
                """;

        var document = canonicalizer.canonicalize(
                "Python", markdown, LearningResourceFormat.MARKDOWN, null,
                null, List.of(), "pt-BR"
        );

        var children = document.sections().getFirst().children();
        assertThat(children).extracting(CanonicalDocument.Section::title)
                .containsExactly("Funções", "Funções");
        assertThat(children).extracting(CanonicalDocument.Section::anchor)
                .containsExactly("funcoes", "funcoes-2");
    }

    @Test
    void linkHashDependsOnUrlWithoutInventingAnOutline() {
        var first = canonicalizer.canonicalize(
                "Docs", null, LearningResourceFormat.LINK, "https://example.com/a",
                null, List.of(), null
        );
        var second = canonicalizer.canonicalize(
                "Docs", null, LearningResourceFormat.LINK, "https://example.com/b",
                null, List.of(), null
        );

        assertThat(first.sections()).isEmpty();
        assertThat(first.contentSha256()).isNotEqualTo(second.contentSha256());
    }
}
