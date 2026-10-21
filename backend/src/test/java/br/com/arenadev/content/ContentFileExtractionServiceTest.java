package br.com.arenadev.content;

import br.com.arenadev.content.ingestion.ContentFileExtractionService;
import br.com.arenadev.content.ingestion.ContentIngestionSource;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
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
    void extractsRealDocxContentWithApacheTika() throws Exception {
        byte[] bytes;
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText("MÓDULO 1 — FUNDAMENTOS");
            document.createParagraph().createRun().setText("Modelagem conceitual e relacionamentos.");
            document.write(output);
            bytes = output.toByteArray();
        }

        var file = new MockMultipartFile(
                "file",
                "apostila.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                bytes
        );

        var extracted = service.extract(file);

        assertThat(extracted.filename()).isEqualTo("apostila.docx");
        assertThat(extracted.source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(extracted.content()).contains("MÓDULO 1", "Modelagem conceitual");
    }

    @Test
    void extractsRealPptxContentWithApacheTika() throws Exception {
        byte[] bytes;
        try (XMLSlideShow presentation = new XMLSlideShow(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var slide = presentation.createSlide();
            slide.createTextBox().setText("MÓDULO 2 — NORMALIZAÇÃO");
            slide.createTextBox().setText("Primeira, segunda e terceira forma normal.");
            presentation.write(output);
            bytes = output.toByteArray();
        }

        var file = new MockMultipartFile(
                "file",
                "aula.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                bytes
        );

        var extracted = service.extract(file);

        assertThat(extracted.filename()).isEqualTo("aula.pptx");
        assertThat(extracted.source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(extracted.content()).contains("NORMALIZAÇÃO", "terceira forma normal");
    }

    @Test
    void extractsRealPdfContentWithApacheTika() throws Exception {
        byte[] bytes;
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 720);
                content.showText("Database normalization and relational modeling");
                content.endText();
            }
            document.save(output);
            bytes = output.toByteArray();
        }

        var file = new MockMultipartFile("file", "material.pdf", "application/pdf", bytes);
        var extracted = service.extract(file);

        assertThat(extracted.filename()).isEqualTo("material.pdf");
        assertThat(extracted.source()).isEqualTo(ContentIngestionSource.FILE);
        assertThat(extracted.content()).contains("Database normalization", "relational modeling");
    }

    @Test
    void rejectsUnknownFileFormatsBeforeParsing() {
        var file = new MockMultipartFile("file", "arquivo.exe", "application/octet-stream", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.extract(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Formato não suportado");
    }

    @Test
    void refusesAFileLongerThanTheAnalysisLimitInsteadOfCuttingItsEnd() {
        String text = "Banco de dados organiza informação. ".repeat(30_000);
        var file = new MockMultipartFile("file", "livro.txt", "text/plain", text.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.extract(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mais de 1 milhão de caracteres");
    }

    @Test
    void keepsTheEndOfAFileAboveTheFormerLimit() {
        String text = "Banco de dados organiza informação. ".repeat(5_000) + "FIM DO MATERIAL";
        var file = new MockMultipartFile("file", "apostila.txt", "text/plain", text.getBytes(StandardCharsets.UTF_8));

        var extracted = service.extract(file);

        assertThat(extracted.content().length()).isGreaterThan(120_000);
        assertThat(extracted.content()).endsWith("FIM DO MATERIAL");
    }
}
