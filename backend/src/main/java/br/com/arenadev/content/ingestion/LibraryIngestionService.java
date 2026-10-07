package br.com.arenadev.content.ingestion;

import br.com.arenadev.content.CanonicalDocument;
import br.com.arenadev.content.ContentCanonicalizer;
import br.com.arenadev.content.LearningResourceFormat;
import br.com.arenadev.content.LearningResourceService;
import br.com.arenadev.content.LearningResourceSourceType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class LibraryIngestionService {
    private final ContentCanonicalizer canonicalizer;
    private final ContentFileExtractionService files;
    private final NotionPageProvider notion;
    private final TextSourceAdapter textAdapter;

    public LibraryIngestionService(
            ContentCanonicalizer canonicalizer,
            ContentFileExtractionService files,
            NotionPageProvider notion,
            TextSourceAdapter textAdapter
    ) {
        this.canonicalizer = canonicalizer;
        this.files = files;
        this.notion = notion;
        this.textAdapter = textAdapter;
    }

    public Capabilities capabilities() {
        return new Capabilities(
                List.of("MARKDOWN", "TEXT", "FILE", "NOTION", "URL"),
                files.supportedExtensions(),
                notion.isConfigured()
        );
    }

    public PreviewView preview(PreviewRequest request) {
        if (request == null || request.source() == null) {
            throw new IllegalArgumentException("Fonte de importação é obrigatória.");
        }
        return switch (request.source()) {
            case MARKDOWN -> fromMarkdown(request, request.content(), LearningResourceSourceType.MARKDOWN);
            case TEXT -> fromPlainText(request, request.content(), LearningResourceSourceType.TEXT, request.sourceLabel());
            case FILE -> fromPlainText(request, request.content(), LearningResourceSourceType.FILE, request.sourceLabel());
            case NOTION -> fromNotion(request);
            case URL -> fromUrl(request);
            case AI, TEMPLATE -> throw new IllegalArgumentException(
                    "A Biblioteca importa fontes existentes. IA e templates pertencem aos fluxos de autoria, não à ingestão canônica."
            );
        };
    }

    public PreviewView previewFile(
            String title,
            String summary,
            String subject,
            List<String> tags,
            String language,
            MultipartFile file
    ) {
        ContentFileExtractionService.ExtractedFile extracted = files.extract(file);
        PreviewRequest request = new PreviewRequest(
                extracted.source(),
                title,
                summary,
                subject,
                tags,
                language,
                extracted.content(),
                null,
                extracted.filename()
        );
        if (extracted.source() == ContentIngestionSource.MARKDOWN) {
            return fromMarkdown(request, extracted.content(), LearningResourceSourceType.FILE);
        }
        return fromPlainText(request, extracted.content(), LearningResourceSourceType.FILE, extracted.filename());
    }

    public LearningResourceService.ResourceView materialize(
            MaterializeRequest request,
            LearningResourceService resources
    ) {
        if (request == null) throw new IllegalArgumentException("Material revisado é obrigatório.");
        return resources.createLibraryImported(new LearningResourceService.ImportedLibraryResourceInput(
                request.title(),
                request.summary(),
                request.body(),
                request.format(),
                request.sourceType(),
                request.sourceUrl(),
                request.sourceLabel(),
                request.sourceReference(),
                request.sourceSnapshotAt(),
                request.sourceContentSha256(),
                request.subject(),
                request.tags(),
                request.language()
        ));
    }

    private PreviewView fromMarkdown(
            PreviewRequest request,
            String markdown,
            LearningResourceSourceType sourceType
    ) {
        String content = requireContent(markdown);
        String title = clean(request.title());
        CanonicalDocument firstPass = canonicalizer.canonicalize(
                title,
                content,
                LearningResourceFormat.MARKDOWN,
                request.sourceUrl(),
                request.subject(),
                request.tags(),
                request.language()
        );
        if (title == null) title = suggestedTitle(firstPass, request.sourceLabel(), "Material importado");
        CanonicalDocument canonical = canonicalizer.canonicalize(
                title,
                content,
                LearningResourceFormat.MARKDOWN,
                request.sourceUrl(),
                request.subject(),
                request.tags(),
                request.language()
        );
        boolean noStructure = canonical.sections().isEmpty();
        return view(
                canonical,
                clean(request.summary()),
                sourceType,
                clean(request.sourceUrl()),
                clean(request.sourceLabel()),
                sourceReference(request),
                new StructureAnalysis(
                        "DETERMINISTIC",
                        noStructure ? 0.60 : 1.0,
                        noStructure && content.length() >= 1200,
                        noStructure
                                ? "Não foram encontrados headings Markdown. Revise a estrutura antes de importar."
                                : "Hierarquia H1–H6 preservada deterministicamente."
                )
        );
    }

    private PreviewView fromPlainText(
            PreviewRequest request,
            String text,
            LearningResourceSourceType sourceType,
            String sourceLabel
    ) {
        String content = requireContent(text);
        NormalizedDocument normalized = textAdapter.normalize(new ContentIngestionService.PreviewRequest(
                null,
                request.source() == null ? ContentIngestionSource.TEXT : request.source(),
                request.title(),
                request.summary(),
                null,
                content,
                request.sourceUrl(),
                sourceLabel
        ));
        String markdown = normalizedToMarkdown(normalized);
        String title = clean(request.title());
        CanonicalDocument firstPass = canonicalizer.canonicalize(
                title,
                markdown,
                LearningResourceFormat.MARKDOWN,
                request.sourceUrl(),
                request.subject(),
                request.tags(),
                request.language()
        );
        if (title == null) title = suggestedTitle(firstPass, sourceLabel, "Material importado");
        CanonicalDocument canonical = canonicalizer.canonicalize(
                title,
                markdown,
                LearningResourceFormat.MARKDOWN,
                request.sourceUrl(),
                request.subject(),
                request.tags(),
                request.language()
        );
        boolean lowStructure = canonical.sections().isEmpty();
        return view(
                canonical,
                clean(request.summary()),
                sourceType,
                clean(request.sourceUrl()),
                clean(sourceLabel),
                sourceReference(request, sourceLabel),
                new StructureAnalysis(
                        "DETERMINISTIC",
                        lowStructure ? 0.45 : 0.78,
                        lowStructure && content.length() >= 1200,
                        lowStructure
                                ? "Texto sem hierarquia confiável. A revisão humana é obrigatória; IA pode ser usada depois como fallback opcional."
                                : "Títulos textuais detectados e convertidos para a estrutura canônica revisável."
                )
        );
    }

    private PreviewView fromNotion(PreviewRequest request) {
        String url = requireHttpUrl(request.sourceUrl(), true);
        String pageId = NotionSourceAdapter.extractPageId(url);
        String label = clean(request.sourceLabel()) == null ? url : clean(request.sourceLabel());
        String supplied = clean(request.content());

        if (supplied != null) {
            PreviewRequest snapshot = new PreviewRequest(
                    ContentIngestionSource.MARKDOWN,
                    request.title(),
                    request.summary(),
                    request.subject(),
                    request.tags(),
                    request.language(),
                    supplied,
                    url,
                    label
            );
            PreviewView preview = fromMarkdown(snapshot, supplied, LearningResourceSourceType.NOTION);
            return preview.withSource(url, label, pageId == null ? url : pageId);
        }

        if (notion.isConfigured() && pageId != null) {
            NotionPageProvider.NotionPageSnapshot snapshot = notion.fetch(pageId);
            String markdown = notionSnapshotToMarkdown(snapshot);
            PreviewRequest normalized = new PreviewRequest(
                    ContentIngestionSource.MARKDOWN,
                    clean(request.title()) == null ? snapshot.title() : request.title(),
                    request.summary(),
                    request.subject(),
                    request.tags(),
                    request.language(),
                    markdown,
                    url,
                    label
            );
            PreviewView preview = fromMarkdown(normalized, markdown, LearningResourceSourceType.NOTION);
            return new PreviewView(
                    preview.title(),
                    preview.summary(),
                    preview.subject(),
                    preview.tags(),
                    preview.language(),
                    preview.body(),
                    preview.format(),
                    LearningResourceSourceType.NOTION,
                    url,
                    label,
                    snapshot.pageId(),
                    preview.sourceContentSha256(),
                    preview.parserVersion(),
                    preview.outline(),
                    new StructureAnalysis(
                            "DETERMINISTIC",
                            0.98,
                            false,
                            "Hierarquia preservada do snapshot autorizado do Notion."
                    )
            );
        }

        CanonicalDocument canonical = canonicalizer.canonicalize(
                clean(request.title()) == null ? "Conteúdo do Notion" : clean(request.title()),
                null,
                LearningResourceFormat.LINK,
                url,
                request.subject(),
                request.tags(),
                request.language()
        );
        return view(
                canonical,
                clean(request.summary()),
                LearningResourceSourceType.NOTION,
                url,
                label,
                pageId == null ? url : pageId,
                new StructureAnalysis(
                        "REFERENCE_ONLY",
                        1.0,
                        false,
                        "A integração autorizada do Notion não está disponível; o material será preservado como referência externa."
                )
        );
    }

    private PreviewView fromUrl(PreviewRequest request) {
        String url = requireHttpUrl(request.sourceUrl(), false);
        String title = clean(request.title()) == null ? "Recurso externo" : clean(request.title());
        CanonicalDocument canonical = canonicalizer.canonicalize(
                title,
                null,
                LearningResourceFormat.LINK,
                url,
                request.subject(),
                request.tags(),
                request.language()
        );
        return view(
                canonical,
                clean(request.summary()),
                LearningResourceSourceType.URL,
                url,
                clean(request.sourceLabel()) == null ? url : clean(request.sourceLabel()),
                url,
                new StructureAnalysis(
                        "REFERENCE_ONLY",
                        1.0,
                        false,
                        "Link preservado como referência. Nenhum conteúdo externo foi copiado silenciosamente."
                )
        );
    }

    private PreviewView view(
            CanonicalDocument canonical,
            String summary,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String sourceReference,
            StructureAnalysis analysis
    ) {
        return new PreviewView(
                canonical.title(),
                summary,
                canonical.subject(),
                canonical.tags(),
                canonical.language(),
                canonical.body(),
                canonical.format(),
                sourceType,
                sourceUrl,
                sourceLabel,
                sourceReference,
                canonical.contentSha256(),
                canonical.parserVersion(),
                canonical.sections(),
                analysis
        );
    }

    private static String normalizedToMarkdown(NormalizedDocument document) {
        StringBuilder result = new StringBuilder();
        for (NormalizedDocument.Block block : document.blocks()) {
            if (!result.isEmpty()) result.append("\n\n");
            if (block instanceof NormalizedDocument.Heading heading) {
                int level = Math.max(2, Math.min(6, heading.level()));
                result.append("#".repeat(level)).append(' ').append(heading.text());
            } else {
                result.append(block.text());
            }
        }
        return result.toString().trim();
    }

    private static String notionSnapshotToMarkdown(NotionPageProvider.NotionPageSnapshot snapshot) {
        StringBuilder result = new StringBuilder();
        if (clean(snapshot.title()) != null) result.append("# ").append(snapshot.title().trim());
        for (NotionPageProvider.NotionBlock block : snapshot.blocks()) {
            if (clean(block.text()) == null) continue;
            if (!result.isEmpty()) result.append("\n\n");
            if (block.headingLevel() > 0) {
                result.append("#".repeat(Math.max(1, Math.min(6, block.headingLevel()))))
                        .append(' ')
                        .append(block.text().trim());
            } else {
                result.append(block.text().trim());
            }
        }
        return result.toString();
    }

    private static String suggestedTitle(CanonicalDocument canonical, String sourceLabel, String fallback) {
        CanonicalDocument.Section h1 = canonical.sections().stream()
                .filter(section -> section.level() == 1)
                .findFirst()
                .orElse(null);
        if (h1 != null) return h1.title();
        String label = clean(sourceLabel);
        if (label != null) {
            String filename = label.replace('\\', '/');
            int slash = filename.lastIndexOf('/');
            if (slash >= 0) filename = filename.substring(slash + 1);
            int dot = filename.lastIndexOf('.');
            if (dot > 0) filename = filename.substring(0, dot);
            if (!filename.isBlank()) return filename;
        }
        return fallback;
    }

    private static String sourceReference(PreviewRequest request) {
        return sourceReference(request, request.sourceLabel());
    }

    private static String sourceReference(PreviewRequest request, String fallbackLabel) {
        String url = clean(request.sourceUrl());
        if (url != null) return url;
        String label = clean(fallbackLabel);
        return label == null ? request.source().name().toLowerCase(Locale.ROOT) : label;
    }

    private static String requireContent(String value) {
        String content = clean(value);
        if (content == null) throw new IllegalArgumentException("Forneça o conteúdo a ser importado.");
        if (content.length() > 120_000) {
            throw new IllegalArgumentException("O conteúdo excede o limite de 120 mil caracteres por análise.");
        }
        return content;
    }

    private static String requireHttpUrl(String value, boolean notionOnly) {
        String url = clean(value);
        if (url == null) throw new IllegalArgumentException(notionOnly
                ? "Informe o link da página do Notion."
                : "Informe o link do material.");
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            boolean http = scheme != null && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
            boolean notionHost = host != null && (
                    host.equalsIgnoreCase("notion.so")
                            || host.endsWith(".notion.so")
                            || host.equalsIgnoreCase("notion.site")
                            || host.endsWith(".notion.site")
            );
            if (!http || host == null || (notionOnly && !notionHost)) throw new IllegalArgumentException();
            return url;
        } catch (Exception ignored) {
            throw new IllegalArgumentException(notionOnly ? "Use uma URL válida do Notion." : "Use uma URL HTTP ou HTTPS válida.");
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record Capabilities(
            List<String> sources,
            List<String> fileExtensions,
            boolean notionConfigured
    ) {}

    public record PreviewRequest(
            ContentIngestionSource source,
            String title,
            String summary,
            String subject,
            List<String> tags,
            String language,
            String content,
            String sourceUrl,
            String sourceLabel
    ) {}

    public record PreviewView(
            String title,
            String summary,
            String subject,
            List<String> tags,
            String language,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String sourceReference,
            String sourceContentSha256,
            String parserVersion,
            List<CanonicalDocument.Section> outline,
            StructureAnalysis structureAnalysis
    ) {
        public PreviewView withSource(String sourceUrl, String sourceLabel, String sourceReference) {
            return new PreviewView(
                    title, summary, subject, tags, language, body, format, sourceType,
                    sourceUrl, sourceLabel, sourceReference, sourceContentSha256,
                    parserVersion, outline, structureAnalysis
            );
        }
    }

    public record StructureAnalysis(
            String mode,
            double confidence,
            boolean aiRecommended,
            String message
    ) {}

    public record MaterializeRequest(
            String title,
            String summary,
            String body,
            LearningResourceFormat format,
            LearningResourceSourceType sourceType,
            String sourceUrl,
            String sourceLabel,
            String sourceReference,
            Instant sourceSnapshotAt,
            String sourceContentSha256,
            String subject,
            List<String> tags,
            String language
    ) {}
}
