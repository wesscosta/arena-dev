package br.com.arenadev.content;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.content.ingestion.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ContentIngestionServiceTest {
    private final ClassroomRepository classrooms = mock(ClassroomRepository.class);
    private final JourneyDraftAiProvider ai = mock(JourneyDraftAiProvider.class);
    private final ContentFileExtractionService files = mock(ContentFileExtractionService.class);
    private final JourneyStructureFallbackService fallback = new JourneyStructureFallbackService(ai);
    private final ContentSourceAdapterRegistry adapters = new ContentSourceAdapterRegistry(List.of(
            new MarkdownSourceAdapter(), new TextSourceAdapter(), new NotionSourceAdapter(new MarkdownSourceAdapter(), mock(NotionPageProvider.class))
    ));
    private final ContentIngestionService service = new ContentIngestionService(classrooms, ai, files, fallback, adapters);

    @Test
    void reportsCapabilitiesWithoutAssumingOneTeacherWorkflow() {
        when(ai.isConfigured()).thenReturn(true);
        when(files.supportedExtensions()).thenReturn(List.of("PDF", "DOCX", "PPTX", "MD", "TXT"));

        var capabilities = service.capabilities();

        assertThat(capabilities.aiConfigured()).isTrue();
        assertThat(capabilities.templates())
                .containsExactly("SEQUENCE", "PROJECT", "EXAM_PREP", "CHALLENGE");
        assertThat(capabilities.directTextSources()).contains("TEXT", "MARKDOWN");
        assertThat(capabilities.supportedFileExtensions()).contains("PDF", "DOCX", "PPTX", "MD", "TXT");
        assertThat(capabilities.externalUrlSupported()).isTrue();
        assertThat(capabilities.notionLinkSupported()).isTrue();
    }
    @Test
    void createsAUsefulTemplateDraftForTeachersStartingFromZero() {
        UUID classroomId = classroom();
        var request = new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.TEMPLATE,
                "Banco de Dados",
                null,
                "SEQUENCE",
                null,
                null,
                null
        );

        var draft = service.preview(request);

        assertThat(draft.title()).isEqualTo("Banco de Dados");
        assertThat(draft.sections()).hasSize(3);
        assertThat(draft.sections().getFirst().items())
                .extracting(ContentIngestionService.DraftItem::type)
                .containsOnly(DraftItemType.CONTENT);
    }

    @Test
    void turnsMarkdownHeadingsIntoReviewableModulesAndItems() {
        UUID classroomId = classroom();
        String markdown = """
                # Backend

                ## Fundamentos
                ### HTTP
                Protocolo base da web.

                ### REST
                Arquitetura para APIs.

                ## Persistência
                ### Banco de Dados
                Introdução à persistência.
                """;
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.MARKDOWN,
                null,
                null,
                null,
                markdown,
                null,
                "backend.md"
        ));

        assertThat(draft.title()).isEqualTo("Backend");
        assertThat(draft.sections()).extracting(ContentIngestionService.DraftSection::title)
                .containsExactly("Fundamentos", "Persistência");
        assertThat(draft.sections().getFirst().items())
                .extracting(ContentIngestionService.DraftItem::title)
                .containsExactly("HTTP", "REST");
        assertThat(draft.sourceLabel()).isEqualTo("backend.md");
    }

    @Test
    void preservesDeepMarkdownHeadingsInsideContentWithoutCallingAi() {
        UUID classroomId = classroom();
        String markdown = """
                # Python
                ## Fundamentos
                Introdução do módulo.
                ### Variáveis
                Conceito de variável.
                #### Boas práticas
                Use nomes significativos.
                ```python
                # isto não é heading
                valor = 10
                ```
                ### Tipos de dados
                Texto do segundo conteúdo.
                """;

        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId, ContentIngestionSource.MARKDOWN, null, null, null,
                markdown, null, "python.md"
        ));

        assertThat(draft.title()).isEqualTo("Python");
        assertThat(draft.sections()).hasSize(1);
        assertThat(draft.sections().getFirst().title()).isEqualTo("Fundamentos");
        assertThat(draft.sections().getFirst().description()).contains("Introdução do módulo");
        assertThat(draft.sections().getFirst().items()).extracting(ContentIngestionService.DraftItem::title)
                .containsExactly("Variáveis", "Tipos de dados");
        assertThat(draft.sections().getFirst().items().getFirst().body())
                .contains("#### Boas práticas", "# isto não é heading", "valor = 10");
        verifyNoInteractions(ai);
    }

    @Test
    void mapsH2BodyToContentWithoutInventingStructureOrCallingAi() {
        UUID classroomId = classroom();
        String markdown = """
                # Git
                ## Fundamentos
                Git é um sistema de controle de versão distribuído.
                ## Commits
                Um commit registra um estado relevante do trabalho.
                """;

        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId, ContentIngestionSource.MARKDOWN, null, null, null,
                markdown, null, "git.md"
        ));

        assertThat(draft.sections()).extracting(ContentIngestionService.DraftSection::title)
                .containsExactly("Fundamentos", "Commits");
        assertThat(draft.sections()).allSatisfy(section -> assertThat(section.items()).hasSize(1));
        assertThat(draft.sections().getFirst().items().getFirst().body()).contains("controle de versão");
        verifyNoInteractions(ai);
    }

    @Test
    void contentDescriptionsNeverCarryRawMarkdownTableSyntax() {
        String markdown = """
                # Banco de Dados

                ## Organização

                ### Capítulos do material

                | Capítulo | Tema | Descrição |
                | --- | --- | --- |
                | 01 | Introdução | Dados e informação |

                Cada capítulo combina leitura e prática.
                """;
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroom(), ContentIngestionSource.MARKDOWN, null, null, null, markdown, null, "bd.md"));

        var item = draft.sections().getFirst().items().getFirst();
        assertThat(item.description()).doesNotContain("|").doesNotContain("---");
        assertThat(item.description()).contains("Cada capítulo combina leitura e prática.");
        assertThat(item.body()).contains("| Capítulo | Tema | Descrição |");
    }

    @Test
    void keepsExternalAndNotionLinksAsReferencesInsteadOfScrapingThem() {
        UUID classroomId = classroom();

        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.NOTION,
                "Material da UC",
                null,
                null,
                null,
                "https://example.notion.site/material",
                "Notion"
        ));
        assertThat(draft.sections()).hasSize(1);
        var item = draft.sections().getFirst().items().getFirst();
        assertThat(item.type()).isEqualTo(DraftItemType.EXTERNAL_RESOURCE);
        assertThat(item.sourceUrl()).isEqualTo("https://example.notion.site/material");
        assertThat(draft.description()).contains("integração autorizada");
    }

    @Test
    void delegatesAiCreationOnlyToTheConfiguredProvider() {
        UUID classroomId = classroom();
        var request = new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.AI,
                null,
                null,
                null,
                "Turma iniciante, 20 horas, introdução a SQL com prática.",
                null,
                null
        );
        var expected = new ContentIngestionService.DraftView(
                "SQL",
                "Rascunho",
                ContentIngestionSource.AI,
                "Gerado com IA",
                List.of()
        );
        when(ai.generate(request)).thenReturn(expected);

        assertThat(service.preview(request)).isSameAs(expected);
        verify(ai).generate(request);
    }


    @Test
    void infersModulesFromOfficeStyleHeadingsWithoutMarkdown() {
        UUID classroomId = classroom();
        String content = """
                MÓDULO 1 — FUNDAMENTOS

                Conceitos iniciais de banco de dados e persistência.

                Modelagem conceitual com entidades, atributos e relacionamentos.

                MÓDULO 2 — NORMALIZAÇÃO

                Primeira, segunda e terceira forma normal.

                Dependências funcionais e redução de redundância.
                """;

        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.FILE,
                "Banco de Dados",
                null,
                null,
                content,
                null,
                "apostila.docx"
        ));

        assertThat(draft.sections()).extracting(ContentIngestionService.DraftSection::title)
                .containsExactly("FUNDAMENTOS", "NORMALIZAÇÃO");
        assertThat(draft.sections().getFirst().items()).hasSize(2);
        assertThat(draft.sections().get(1).items()).hasSize(2);
    }

    @Test
    void groupsLongHeadinglessDocumentsIntoReviewablePartsInsteadOfOneFlatList() {
        UUID classroomId = classroom();
        String content = String.join("\n\n",
                "Introdução aos bancos de dados relacionais e ao papel do SGBD.",
                "Entidades representam objetos relevantes do domínio analisado.",
                "Atributos descrevem propriedades que pertencem às entidades.",
                "Relacionamentos conectam entidades e expressam regras do negócio.",
                "Chaves primárias identificam unicamente cada ocorrência.",
                "Chaves estrangeiras materializam relacionamentos no modelo relacional.",
                "A primeira forma normal elimina grupos repetitivos e valores não atômicos.",
                "A segunda forma normal remove dependências parciais da chave.",
                "A terceira forma normal reduz dependências transitivas."
        );

        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId,
                ContentIngestionSource.FILE,
                "Modelagem de Dados",
                null,
                null,
                content,
                null,
                "material.pdf"
        ));

        assertThat(draft.sections()).hasSize(3);
        assertThat(draft.sections()).allSatisfy(section -> assertThat(section.items()).hasSize(3));
        assertThat(draft.sections()).extracting(ContentIngestionService.DraftSection::title)
                .allSatisfy(title -> assertThat(title).isNotBlank());
    }

    @Test
    void keepsAmbiguousTextDeterministicWhenAiIsUnavailable() {
        UUID classroomId = classroom();
        when(ai.isConfigured()).thenReturn(false);
        String content = String.join("\n\n",
                "Primeiro conceito explicado em um parágrafo sem título explícito.",
                "Segundo conceito explicado em um parágrafo sem título explícito.",
                "Terceiro conceito explicado em um parágrafo sem título explícito.",
                "Quarto conceito explicado em um parágrafo sem título explícito.",
                "Quinto conceito explicado em um parágrafo sem título explícito.",
                "Sexto conceito explicado em um parágrafo sem título explícito.",
                "Sétimo conceito explicado em um parágrafo sem título explícito."
        );
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId, ContentIngestionSource.TEXT, "Material", null, null,
                content, null, "Texto colado"
        ));
        assertThat(draft.sections()).isNotEmpty();
        assertThat(draft.structureAnalysis().mode()).isEqualTo("DETERMINISTIC");
        assertThat(draft.structureAnalysis().aiUsed()).isFalse();
        assertThat(draft.structureAnalysis().confidence()).isLessThan(0.6);
        verify(ai, never()).generate(any());
    }

    @Test
    void usesAiOnlyAsOptionalFallbackForAmbiguousTextAndPreservesSource() {
        UUID classroomId = classroom();
        when(ai.isConfigured()).thenReturn(true);
        var suggestion = new ContentIngestionService.DraftView(
                "Material organizado", "Sugestão", ContentIngestionSource.AI, "Gerado com IA",
                List.of(new ContentIngestionService.DraftSection("Fundamentos", null,
                        List.of(new ContentIngestionService.DraftItem("Conceito", null, DraftItemType.CONTENT, "Corpo", null))))
        );
        when(ai.generate(any())).thenReturn(suggestion);
        String content = String.join("\n\n",
                "Primeiro conceito sem hierarquia explícita.", "Segundo conceito sem hierarquia explícita.",
                "Terceiro conceito sem hierarquia explícita.", "Quarto conceito sem hierarquia explícita.",
                "Quinto conceito sem hierarquia explícita.", "Sexto conceito sem hierarquia explícita.",
                "Sétimo conceito sem hierarquia explícita."
        );
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId, ContentIngestionSource.FILE, "Material", null, null,
                content, null, "apostila.pdf"
        ));
        assertThat(draft.title()).isEqualTo("Material organizado");
        assertThat(draft.source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(draft.sourceLabel()).isEqualTo("apostila.pdf");
        assertThat(draft.structureAnalysis().mode()).isEqualTo("AI_ASSISTED");
        assertThat(draft.structureAnalysis().aiUsed()).isTrue();
        verify(ai).generate(any());
    }

    @Test
    void providerFailureNeverBreaksAmbiguousImport() {
        UUID classroomId = classroom();
        when(ai.isConfigured()).thenReturn(true);
        when(ai.generate(any())).thenThrow(new RuntimeException("provider offline"));
        String content = String.join("\n\n",
                "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete"
        );
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroomId, ContentIngestionSource.TEXT, "Material", null, null,
                content, null, "Texto colado"
        ));
        assertThat(draft.sections()).isNotEmpty();
        assertThat(draft.source()).isEqualTo(ContentIngestionSource.TEXT);
        assertThat(draft.structureAnalysis().aiUsed()).isFalse();
    }

    @Test
    void turnsExtractedOfficeOrPdfTextIntoAReviewableDraft() {
        UUID classroomId = classroom();
        var file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(files.extract(file)).thenReturn(new ContentFileExtractionService.ExtractedFile(
                "apostila.pdf",
                "Fundamentos de banco de dados\n\nModelagem conceitual e relacionamentos.\n\nNormalização e formas normais.",
                ContentIngestionSource.FILE,
                "PDF"
        ));

        var draft = service.previewFile(classroomId, "Banco de Dados", file);

        assertThat(draft.title()).isEqualTo("Banco de Dados");
        assertThat(draft.source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(draft.sourceLabel()).isEqualTo("apostila.pdf");
        assertThat(draft.sections()).hasSize(1);
        assertThat(draft.sections().getFirst().items()).hasSize(3);
    }

    private UUID classroom() {
        UUID id = UUID.randomUUID();
        when(classrooms.existsById(id)).thenReturn(true);
        return id;
    }

    @Test
    void analysesMaterialsAboveTheFormerLimitAndExplainsTheNewOne() {
        StringBuilder markdown = new StringBuilder("# Livro\n\n");
        for (int section = 1; markdown.length() < 300_000; section++) {
            markdown.append("## Capítulo ").append(section).append("\n\n")
                    .append("Banco de dados organiza e armazena dados para leitura. ".repeat(40)).append("\n\n");
        }
        var draft = service.preview(new ContentIngestionService.PreviewRequest(
                classroom(), ContentIngestionSource.MARKDOWN, null, null, null, markdown.toString(), null, "livro.md"));
        assertThat(draft.sections()).isNotEmpty();

        String tooLong = "a".repeat(ContentIngestionLimits.MAX_ANALYSIS_CHARACTERS + 1);
        assertThatThrownBy(() -> service.preview(new ContentIngestionService.PreviewRequest(
                classroom(), ContentIngestionSource.TEXT, "Livro", null, null, tooLong, null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1.000.001 caracteres")
                .hasMessageContaining("limite por análise é de 1 milhão");
    }
}
