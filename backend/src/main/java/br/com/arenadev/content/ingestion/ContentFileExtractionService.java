package br.com.arenadev.content.ingestion;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

@Service
public class ContentFileExtractionService {
    private static final long MAX_FILE_BYTES = 20L * 1024L * 1024L;
    private static final List<String> SUPPORTED_EXTENSIONS = List.of(
            ".md", ".markdown", ".txt", ".pdf", ".doc", ".docx", ".ppt", ".pptx"
    );

    private final Tika tika = new Tika();

    public ContentFileExtractionService() {
        // One character past the limit: Tika truncates silently, so a longer
        // extraction is how an oversized file is detected and refused instead
        // of losing its end without the teacher noticing.
        tika.setMaxStringLength(ContentIngestionLimits.MAX_ANALYSIS_CHARACTERS + 1);
    }

    public ExtractedFile extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Selecione um arquivo com conteúdo.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("O arquivo excede o limite de 20 MB.");
        }

        String filename = safeFilename(file.getOriginalFilename());
        String extension = extension(filename);
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Formato não suportado. Use PDF, DOC, DOCX, PPT, PPTX, Markdown ou TXT.");
        }

        try {
            String text = tika.parseToString(file.getInputStream());
            if (text.length() > ContentIngestionLimits.MAX_ANALYSIS_CHARACTERS) {
                throw new IllegalArgumentException("O arquivo tem mais de 1 milhão de caracteres de texto, o limite por análise. "
                        + "Divida o material em partes e importe cada uma separadamente.");
            }
            String normalized = normalize(text);
            if (normalized.isBlank()) {
                throw new IllegalArgumentException("Não foi possível identificar texto útil neste arquivo.");
            }
            ContentIngestionSource source = extension.equals(".md") || extension.equals(".markdown")
                    ? ContentIngestionSource.MARKDOWN
                    : extension.equals(".txt")
                        ? ContentIngestionSource.TEXT
                        : ContentIngestionSource.FILE;
            return new ExtractedFile(filename, normalized, source, extension.substring(1).toUpperCase(Locale.ROOT));
        } catch (IOException | TikaException error) {
            throw new IllegalArgumentException("Não foi possível extrair o conteúdo deste arquivo.", error);
        }
    }

    public List<String> supportedExtensions() {
        return SUPPORTED_EXTENSIONS.stream().map(value -> value.substring(1).toUpperCase(Locale.ROOT)).toList();
    }

    private static String safeFilename(String value) {
        if (value == null || value.isBlank()) return "material";
        String normalized = value.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        return slash >= 0 ? normalized.substring(slash + 1) : normalized;
    }

    private static String extension(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        return dot < 0 ? "" : lower.substring(dot);
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return value
                .replace("\u0000", "")
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t\\x0B\\f]+", " ")
                .replaceAll("[ ]{2,}", " ")
                .replaceAll("\\n{4,}", "\n\n\n")
                .trim();
    }

    public record ExtractedFile(
            String filename,
            String content,
            ContentIngestionSource source,
            String formatLabel
    ) {}
}
