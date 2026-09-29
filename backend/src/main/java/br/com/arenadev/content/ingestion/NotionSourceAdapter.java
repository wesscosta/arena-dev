package br.com.arenadev.content.ingestion;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notion source boundary. It never scrapes public HTML: when a normalized snapshot is
 * supplied it preserves its hierarchy; otherwise it creates a reference-only snapshot
 * until an authorized Notion page provider is connected.
 */
@Component
public class NotionSourceAdapter implements ContentSourceAdapter {
    private static final Pattern PAGE_ID = Pattern.compile("(?i)([0-9a-f]{32})(?:[?#].*)?$");
    private final MarkdownSourceAdapter markdown;
    private final NotionPageProvider provider;

    public NotionSourceAdapter(MarkdownSourceAdapter markdown, NotionPageProvider provider) {
        this.markdown = markdown;
        this.provider = provider;
    }

    @Override
    public boolean supports(ContentIngestionSource source) { return source == ContentIngestionSource.NOTION; }

    @Override
    public NormalizedDocument normalize(ContentIngestionService.PreviewRequest request) {
        String url = requireNotionUrl(request.sourceUrl());
        String pageId = extractPageId(url);
        String label = clean(request.sourceLabel()) != null ? clean(request.sourceLabel()) : url;
        String content = clean(request.content());
        if (content == null && provider.isConfigured() && pageId != null) {
            NotionPageProvider.NotionPageSnapshot snapshot = provider.fetch(pageId);
            return fromApiSnapshot(request, url, label, snapshot);
        }
        if (content != null) {
            var snapshotRequest = new ContentIngestionService.PreviewRequest(
                    request.classroomId(), ContentIngestionSource.MARKDOWN, request.title(), request.description(),
                    request.templateKey(), content, url, label
            );
            NormalizedDocument parsed = markdown.normalize(snapshotRequest);
            return new NormalizedDocument(
                    parsed.title(), parsed.blocks(),
                    new NormalizedDocument.Provenance(ContentIngestionSource.NOTION, label, url, pageId, "NOTION_MARKDOWN_SNAPSHOT"),
                    Map.of("mappingProfile", "NOTION_HEADINGS", "snapshot", "true")
            );
        }
        return new NormalizedDocument(
                clean(request.title()) != null ? clean(request.title()) : "Conteúdo do Notion",
                List.of(),
                new NormalizedDocument.Provenance(ContentIngestionSource.NOTION, label, url, pageId, "NOTION_REFERENCE"),
                Map.of("snapshot", "false", "requiresAuthorizedProvider", "true")
        );
    }


    private NormalizedDocument fromApiSnapshot(ContentIngestionService.PreviewRequest request, String url, String label, NotionPageProvider.NotionPageSnapshot snapshot) {
        List<NormalizedDocument.Block> blocks = new java.util.ArrayList<>();
        for (NotionPageProvider.NotionBlock block : snapshot.blocks()) {
            if (block.headingLevel() > 0) blocks.add(new NormalizedDocument.Heading(block.headingLevel(), block.text()));
            else blocks.add(new NormalizedDocument.Content(block.text()));
        }
        String title = clean(request.title()) != null ? clean(request.title()) : clean(snapshot.title());
        return new NormalizedDocument(
                title, blocks,
                new NormalizedDocument.Provenance(ContentIngestionSource.NOTION, label, url, snapshot.pageId(), "NOTION_API_SNAPSHOT"),
                Map.of("mappingProfile", "NOTION_HEADINGS", "snapshot", "true", "provider", "NOTION_API")
        );
    }

    private static String requireNotionUrl(String value) {
        String url = clean(value);
        if (url == null) throw new IllegalArgumentException("Informe o link da página do Notion.");
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (uri.getScheme() == null || host == null || !(uri.getScheme().equalsIgnoreCase("http") || uri.getScheme().equalsIgnoreCase("https"))
                    || !(host.equalsIgnoreCase("notion.so") || host.endsWith(".notion.so") || host.equalsIgnoreCase("notion.site") || host.endsWith(".notion.site"))) {
                throw new IllegalArgumentException("Use uma URL válida do Notion.");
            }
            return url;
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Use uma URL válida do Notion.", error);
        }
    }

    static String extractPageId(String url) {
        String path = URI.create(url).getPath();
        if (path == null) return null;
        String compact = path.replace("-", "");
        Matcher matcher = PAGE_ID.matcher(compact);
        if (!matcher.find()) return null;
        String raw = matcher.group(1).toLowerCase();
        return raw.substring(0, 8) + "-" + raw.substring(8, 12) + "-" + raw.substring(12, 16) + "-" + raw.substring(16, 20) + "-" + raw.substring(20);
    }

    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
