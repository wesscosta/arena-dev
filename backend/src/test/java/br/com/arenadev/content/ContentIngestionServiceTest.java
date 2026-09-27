package br.com.arenadev.content;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.content.ingestion.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ContentIngestionServiceTest {
    private final ClassroomRepository classrooms = mock(ClassroomRepository.class);
    private final JourneyDraftAiProvider ai = mock(JourneyDraftAiProvider.class);
    private final ContentFileExtractionService files = mock(ContentFileExtractionService.class);
    private final ContentIngestionService service = new ContentIngestionService(classrooms, ai, files);

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
                .contains(DraftItemType.CONTENT, DraftItemType.QUIZ);
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
}
