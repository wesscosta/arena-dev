package br.com.arenadev.learning.presentation;

import br.com.arenadev.content.LearningResourceFormat;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MaterialPresentationSafetyPolicyTest {
    @Test
    void acceptsRealisticDjangoHtmlAndJsInsideMarkdownCodeFences() {
        String material = """
                # Controle de Estoque com Django

                <aside>
                ## Referência didática
                Acompanhe os exemplos.
                </aside>

                ```html
                <img src="{{ produto.imagem.url }}" alt="{{ produto.nome }}">
                <script>
                    const form = document.querySelector('#form-movimentacao');
                </script>
                ```

                ~~~html
                <iframe src="https://example.test"></iframe>
                ~~~

                    <script>Exemplo de HTML indentado</script>

                Um exemplo inline: `<script>alert(1)</script>`.
                Outro exemplo inline: ``<img src="exemplo">``.
                """;
        assertThat(MaterialPresentationSafetyPolicy.containsUnsafeContent(
                material, LearningResourceFormat.MARKDOWN)).isFalse();
    }

    @Test
    void rejectsActiveHtmlAndImageOutsideCodeBlocks() {
        String[] unsafe = {
                "<script>alert(1)</script>",
                "<img src='https://example.test/photo.png'>",
                "![](https://example.test/photo.png)",
                "[Acesso](javascript:alert(1))",
                "Veja o iframe abaixo: <iframe src='https://example.test'></iframe>",
                "Data URL: data:text/html;base64,PHNjcmlwdD4="
        };
        for (String sample : unsafe) {
            assertThat(MaterialPresentationSafetyPolicy.containsUnsafeContent(
                    "# Material\n" + sample, LearningResourceFormat.MARKDOWN))
                    .as(sample).isTrue();
        }
    }

    @Test
    void doesNotBypassChecksWithUnclosedInlineTicksOrShortClosingFence() {
        String body = """
                `aberto, não fechado <script>codigo</script>
                """;
        assertThat(MaterialPresentationSafetyPolicy.containsUnsafeContent(
                body, LearningResourceFormat.MARKDOWN)).isTrue();

        String fenced = """
                ````html
                <script>código seguro</script>
                ```
                <img src="aqui"> // ainda está no bloco de quatro crases
                ````
                <script>fora do código</script>
                """;
        assertThat(MaterialPresentationSafetyPolicy.containsUnsafeContent(
                fenced, LearningResourceFormat.MARKDOWN)).isTrue();
    }

    @Test
    void plainTextAlwaysRendersEscapedAndDoesNotRequireMarkdownFences() {
        assertThat(MaterialPresentationSafetyPolicy.containsUnsafeContent(
                "<script>alert('demonstração')</script>", LearningResourceFormat.PLAIN_TEXT)).isFalse();
    }
}
