package br.com.arenadev.content.ingestion;

import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.shared.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class ContentIngestionService {
    private final ClassroomRepository classrooms;
    private final JourneyDraftAiProvider aiProvider;
    private final ContentFileExtractionService fileExtraction;

    public ContentIngestionService(
            ClassroomRepository classrooms,
            JourneyDraftAiProvider aiProvider,
            ContentFileExtractionService fileExtraction
    ) {
        this.classrooms = classrooms;
        this.aiProvider = aiProvider;
        this.fileExtraction = fileExtraction;
    }

    public Capabilities capabilities() {
        return new Capabilities(
                aiProvider.isConfigured(),
                List.of("SEQUENCE", "PROJECT", "EXAM_PREP", "CHALLENGE"),
                List.of("TEXT", "MARKDOWN"),
                fileExtraction.supportedExtensions(),
                true,
                true
        );
    }
    public DraftView preview(PreviewRequest request) {
        validateClassroom(request);
        ContentIngestionSource source = Objects.requireNonNull(
                request.source(),
                "Fonte de criação é obrigatória."
        );
        return switch (source) {
            case AI -> aiProvider.generate(request);
            case TEMPLATE -> fromTemplate(request);
            case TEXT -> fromText(request, ContentIngestionSource.TEXT);
            case MARKDOWN -> fromMarkdown(request);
            case FILE -> fromText(request, ContentIngestionSource.FILE);
            case URL, NOTION -> fromLink(request);
        };
    }

    private void validateClassroom(PreviewRequest request) {
        if (request == null || request.classroomId() == null) {
            throw new IllegalArgumentException("Turma é obrigatória.");
        }
        if (!classrooms.existsById(request.classroomId())) {
            throw new ResourceNotFoundException("Turma não encontrada.");
        }
    }

    private DraftView fromTemplate(PreviewRequest request) {
        String key = clean(request.templateKey());
        if (key == null) key = "SEQUENCE";
        return switch (key.toUpperCase(Locale.ROOT)) {
            case "PROJECT" -> projectTemplate(request);
            case "EXAM_PREP" -> examTemplate(request);
            case "CHALLENGE" -> challengeTemplate(request);
            default -> sequenceTemplate(request);
        };
    }
    private DraftView sequenceTemplate(PreviewRequest request) {
        String title = valueOr(request.title(), "Nova jornada");
        return new DraftView(
                title,
                valueOr(request.description(), "Sequência progressiva de aprendizagem."),
                ContentIngestionSource.TEMPLATE,
                "Sequência de aulas",
                List.of(
                        section("Começar", "Introduza o tema e ative conhecimentos prévios.",
                                item("Contexto e objetivos", DraftItemType.CONTENT),
                                item("Diagnóstico inicial", DraftItemType.QUIZ)),
                        section("Desenvolver", "Avance do conceito para a aplicação.",
                                item("Conteúdo principal", DraftItemType.CONTENT),
                                item("Prática guiada", DraftItemType.ACTIVITY)),
                        section("Consolidar", "Verifique compreensão e aplicação.",
                                item("Checkpoint", DraftItemType.CHECKPOINT))
                )
        );
    }

    private DraftView projectTemplate(PreviewRequest request) {
        String title = valueOr(request.title(), "Projeto integrador");
        return new DraftView(
                title,
                valueOr(request.description(), "Jornada orientada à construção de um produto ou solução."),
                ContentIngestionSource.TEMPLATE,
                "Projeto integrador",
                List.of(
                        section("Descoberta", null,
                                item("Problema e contexto", DraftItemType.CONTENT),
                                item("Definir escopo", DraftItemType.ACTIVITY)),
                        section("Construção", null,
                                item("Primeira entrega", DraftItemType.ACTIVITY),
                                item("Revisão intermediária", DraftItemType.CHECKPOINT)),
                        section("Entrega", null,
                                item("Desafio final", DraftItemType.CHALLENGE))
                )
        );
    }
    private DraftView examTemplate(PreviewRequest request) {
        String title = valueOr(request.title(), "Preparação para avaliação");
        return new DraftView(
                title,
                valueOr(request.description(), "Revisão orientada por diagnóstico, prática e checkpoint."),
                ContentIngestionSource.TEMPLATE,
                "Preparação para avaliação",
                List.of(
                        section("Diagnóstico", null,
                                item("O que já sabemos?", DraftItemType.QUIZ)),
                        section("Revisão", null,
                                item("Conceitos essenciais", DraftItemType.CONTENT),
                                item("Prática de recuperação", DraftItemType.ACTIVITY)),
                        section("Verificação", null,
                                item("Checkpoint final", DraftItemType.CHECKPOINT))
                )
        );
    }

    private DraftView challengeTemplate(PreviewRequest request) {
        String title = valueOr(request.title(), "Aprendizagem por desafios");
        return new DraftView(
                title,
                valueOr(request.description(), "Jornada centrada em missões e checkpoints."),
                ContentIngestionSource.TEMPLATE,
                "Aprendizagem por desafios",
                List.of(
                        section("Preparação", null,
                                item("Briefing do desafio", DraftItemType.CONTENT)),
                        section("Missões", null,
                                item("Missão 1", DraftItemType.CHALLENGE),
                                item("Missão 2", DraftItemType.CHALLENGE)),
                        section("Fechamento", null,
                                item("Checkpoint", DraftItemType.CHECKPOINT))
                )
        );
    }
    public DraftView previewFile(UUID classroomId, String title, org.springframework.web.multipart.MultipartFile file) {
        if (classroomId == null) throw new IllegalArgumentException("Turma é obrigatória.");
        if (!classrooms.existsById(classroomId)) throw new ResourceNotFoundException("Turma não encontrada.");
        ContentFileExtractionService.ExtractedFile extracted = fileExtraction.extract(file);
        PreviewRequest request = new PreviewRequest(
                classroomId, extracted.source(), title, null, null, extracted.content(), null, extracted.filename()
        );
        if (extracted.source() == ContentIngestionSource.MARKDOWN) return fromMarkdown(request);
        return fromText(request, extracted.source());
    }

    private DraftView fromText(PreviewRequest request, ContentIngestionSource source) {
        String content = requireContent(request);
        List<TextBlock> blocks = textBlocks(content);
        String title = valueOr(request.title(), blocks.isEmpty() ? "Jornada importada" : summarize(blocks.getFirst().text(), 70));
        List<DraftSection> sections = inferSections(blocks);
        return new DraftView(
                title,
                valueOr(request.description(), "Estrutura sugerida a partir do material fornecido."),
                source,
                clean(request.sourceLabel()),
                sections
        );
    }

    private List<TextBlock> textBlocks(String content) {
        List<TextBlock> blocks = new ArrayList<>();
        String normalized = content.replace("\r\n", "\n").replace('\r', '\n').trim();
        for (String paragraph : normalized.split("\n\s*\n")) {
            String text = paragraph.trim();
            if (text.isEmpty()) continue;
            String[] lines = text.split("\n");
            if (lines.length > 1 && looksLikeHeading(lines[0].trim())) {
                blocks.add(new TextBlock(lines[0].trim(), true));
                String remainder = String.join("\n", java.util.Arrays.copyOfRange(lines, 1, lines.length)).trim();
                if (!remainder.isEmpty()) blocks.add(new TextBlock(remainder, false));
            } else {
                blocks.add(new TextBlock(text, looksLikeHeading(text)));
            }
            if (blocks.size() >= 48) break;
        }
        return blocks;
    }

    private List<DraftSection> inferSections(List<TextBlock> blocks) {
        if (blocks.isEmpty()) return List.of(new DraftSection("Conteúdo", null, List.of()));
        long headingCount = blocks.stream().filter(TextBlock::heading).count();
        if (headingCount >= 2) return sectionsFromHeadings(blocks);

        List<DraftItem> items = blocks.stream()
                .filter(block -> !block.heading())
                .map(block -> contentItem(block.text()))
                .limit(18)
                .toList();
        if (items.isEmpty()) items = List.of(contentItem(blocks.getFirst().text()));
        if (items.size() <= 6) return List.of(new DraftSection("Conteúdo", null, items));

        List<DraftSection> sections = new ArrayList<>();
        for (int start = 0; start < items.size(); start += 3) {
            int end = Math.min(start + 3, items.size());
            List<DraftItem> slice = List.copyOf(items.subList(start, end));
            String sectionTitle = inferSectionTitle(slice.getFirst().title(), sections.size() + 1);
            sections.add(new DraftSection(sectionTitle, "Agrupamento sugerido a partir da estrutura do documento.", slice));
            if (sections.size() >= 6) break;
        }
        return sections;
    }

    private List<DraftSection> sectionsFromHeadings(List<TextBlock> blocks) {
        List<DraftSection> sections = new ArrayList<>();
        String sectionTitle = "Introdução";
        List<DraftItem> items = new ArrayList<>();
        for (TextBlock block : blocks) {
            if (block.heading()) {
                if (!items.isEmpty()) {
                    sections.add(new DraftSection(sectionTitle, null, List.copyOf(items)));
                    items.clear();
                    if (sections.size() >= 6) break;
                }
                sectionTitle = cleanHeading(block.text());
            } else {
                items.add(contentItem(block.text()));
                if (items.size() >= 4) {
                    sections.add(new DraftSection(sectionTitle, null, List.copyOf(items)));
                    items.clear();
                    sectionTitle = sectionTitle + " · continuação";
                    if (sections.size() >= 6) break;
                }
            }
        }
        if (!items.isEmpty() && sections.size() < 6) {
            sections.add(new DraftSection(sectionTitle, null, List.copyOf(items)));
        }
        return sections.isEmpty() ? List.of(new DraftSection("Conteúdo", null, blocks.stream().map(block -> contentItem(block.text())).limit(12).toList())) : sections;
    }

    private DraftItem contentItem(String text) {
        String normalized = text.trim();
        String firstLine = normalized.lines().findFirst().orElse(normalized);
        String itemTitle = summarize(firstLine.replaceFirst("^[•▪◦*-]\\s*", ""), 72);
        return new DraftItem(itemTitle, summarize(normalized, 180), DraftItemType.CONTENT, normalized, null);
    }

    private boolean looksLikeHeading(String value) {
        String text = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        if (text.isEmpty() || text.length() > 90 || text.contains("\n")) return false;
        if (text.matches("(?i)^(m[oó]dulo|cap[ií]tulo|unidade|aula|tema|etapa|se[cç][aã]o|parte)\\s+[A-ZÀ-Ú0-9IVXLC].*")) return true;
        if (text.matches("^\\d+(?:\\.\\d+){0,3}[).:-]?\\s+.{2,70}$")) return true;
        int letters = 0;
        int upper = 0;
        for (char c : text.toCharArray()) {
            if (Character.isLetter(c)) { letters++; if (Character.isUpperCase(c)) upper++; }
        }
        return letters >= 4 && upper >= Math.ceil(letters * .82) && !text.endsWith(".");
    }

    private String cleanHeading(String heading) {
        String clean = heading
                .replaceFirst("(?iu)^(m[oó]dulo|cap[ií]tulo|unidade|aula|tema|etapa|se[cç][aã]o|parte)\\s+", "")
                .replaceFirst("^[0-9IVXLC.-]+\\s*[—–:-]?\\s*", "")
                .replaceFirst("^\\d+(?:\\.\\d+){0,3}[).:-]?\\s+", "")
                .trim();
        return summarize(clean.isBlank() ? heading : clean, 80);
    }

    private String inferSectionTitle(String firstItemTitle, int index) {
        String title = summarize(firstItemTitle, 54);
        return title.isBlank() ? "Parte " + index : title;
    }

    private record TextBlock(String text, boolean heading) {}

    private DraftView fromMarkdown(PreviewRequest request) {
        String markdown = requireContent(request);
        String title = clean(request.title());
        List<DraftSection> sections = new ArrayList<>();
        String currentSection = "Conteúdo";
        String currentSectionDescription = null;
        List<DraftItem> currentItems = new ArrayList<>();
        String currentItemTitle = null;
        StringBuilder currentBody = new StringBuilder();

        for (String rawLine : markdown.split("\\R")) {
            String line = rawLine.stripTrailing();
            if (line.startsWith("# ") && title == null) {
                title = line.substring(2).trim();
                continue;
            }
            if (line.startsWith("## ")) {
                flushItem(currentItems, currentItemTitle, currentBody);
                currentItemTitle = null;
                if (!currentItems.isEmpty()) {
                    sections.add(new DraftSection(currentSection, currentSectionDescription, List.copyOf(currentItems)));
                }
                currentSection = line.substring(3).trim();
                currentSectionDescription = null;
                currentItems = new ArrayList<>();
                currentBody = new StringBuilder();
                continue;
            }
            if (line.startsWith("### ")) {
                flushItem(currentItems, currentItemTitle, currentBody);
                currentItemTitle = line.substring(4).trim();
                currentBody = new StringBuilder();
                continue;
            }
            currentBody.append(line).append('\n');
        }
        flushItem(currentItems, currentItemTitle, currentBody);
        if (!currentItems.isEmpty()) {
            sections.add(new DraftSection(currentSection, currentSectionDescription, List.copyOf(currentItems)));
        }
        if (sections.isEmpty()) {
            sections = fromText(new PreviewRequest(
                    request.classroomId(), ContentIngestionSource.TEXT, request.title(),
                    request.description(), null, markdown, request.sourceUrl(), request.sourceLabel()
            ), ContentIngestionSource.TEXT).sections();
        }
        return new DraftView(
                valueOr(title, "Jornada importada"),
                valueOr(request.description(), "Estrutura sugerida a partir do Markdown."),
                ContentIngestionSource.MARKDOWN,
                clean(request.sourceLabel()),
                sections
        );
    }

    private void flushItem(List<DraftItem> items, String title, StringBuilder body) {
        String content = body.toString().trim();
        if (title == null && content.isEmpty()) return;
        String itemTitle = title == null ? summarize(content, 72) : title;
        items.add(new DraftItem(
                itemTitle,
                content.isEmpty() ? null : summarize(content, 180),
                DraftItemType.CONTENT,
                content.isEmpty() ? null : content,
                null
        ));
    }

    private DraftView fromLink(PreviewRequest request) {
        String sourceUrl = clean(request.sourceUrl());
        if (sourceUrl == null) throw new IllegalArgumentException("Informe o link do material.");
        validateHttpUrl(sourceUrl);
        boolean notion = request.source() == ContentIngestionSource.NOTION;
        String title = valueOr(request.title(), notion ? "Conteúdo do Notion" : "Recurso externo");
        return new DraftView(
                title,
                valueOr(
                        request.description(),
                        notion
                                ? "Página vinculada. A leitura automática do conteúdo depende de uma integração autorizada."
                                : "Link preservado como referência externa."
                ),
                request.source(),
                valueOr(request.sourceLabel(), sourceUrl),
                List.of(section(
                        notion ? "Material do Notion" : "Material externo",
                        null,
                        new DraftItem(title, null, DraftItemType.EXTERNAL_RESOURCE, null, sourceUrl)
                ))
        );
    }
    private void validateHttpUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            if (scheme == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException("Use uma URL HTTP ou HTTPS válida.");
            }
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Use uma URL HTTP ou HTTPS válida.", error);
        }
    }

    private String requireContent(PreviewRequest request) {
        String content = clean(request.content());
        if (content == null) throw new IllegalArgumentException("Forneça o conteúdo a ser analisado.");
        if (content.length() > 120_000) {
            throw new IllegalArgumentException("O conteúdo excede o limite de 120 mil caracteres por análise.");
        }
        return content;
    }

    private static DraftSection section(
            String title,
            String description,
            DraftItem... items
    ) {
        return new DraftSection(title, description, List.of(items));
    }

    private static DraftItem item(String title, DraftItemType type) {
        return new DraftItem(title, null, type, null, null);
    }

    private static String summarize(String value, int max) {
        String text = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        if (text.length() <= max) return text;
        return text.substring(0, Math.max(1, max - 1)).trim() + "…";
    }

    private static String valueOr(String value, String fallback) {
        String clean = clean(value);
        return clean == null ? fallback : clean;
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
    public record Capabilities(
            boolean aiConfigured,
            List<String> templates,
            List<String> directTextSources,
            List<String> supportedFileExtensions,
            boolean externalUrlSupported,
            boolean notionLinkSupported
    ) {}

    public record PreviewRequest(
            UUID classroomId,
            ContentIngestionSource source,
            String title,
            String description,
            String templateKey,
            String content,
            String sourceUrl,
            String sourceLabel
    ) {}

    public record DraftView(
            String title,
            String description,
            ContentIngestionSource source,
            String sourceLabel,
            List<DraftSection> sections
    ) {}

    public record DraftSection(
            String title,
            String description,
            List<DraftItem> items
    ) {}

    public record DraftItem(
            String title,
            String description,
            DraftItemType type,
            String body,
            String sourceUrl
    ) {}
}
