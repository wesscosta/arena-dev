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
    private final JourneyStructureFallbackService structureFallback;
    private final ContentSourceAdapterRegistry sourceAdapters;

    public ContentIngestionService(
            ClassroomRepository classrooms,
            JourneyDraftAiProvider aiProvider,
            ContentFileExtractionService fileExtraction,
            JourneyStructureFallbackService structureFallback,
            ContentSourceAdapterRegistry sourceAdapters
    ) {
        this.classrooms = classrooms;
        this.aiProvider = aiProvider;
        this.fileExtraction = fileExtraction;
        this.structureFallback = structureFallback;
        this.sourceAdapters = sourceAdapters;
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
            case TEXT, FILE -> fromNormalizedText(request, sourceAdapters.normalize(request));
            case MARKDOWN -> fromNormalizedMarkdown(request, sourceAdapters.normalize(request));
            case NOTION -> fromNormalizedNotion(request, sourceAdapters.normalize(request));
            case URL -> fromLink(request);
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
                                item("Conhecimentos prévios", DraftItemType.CONTENT)),
                        section("Desenvolver", "Avance do conceito para a aplicação.",
                                item("Conteúdo principal", DraftItemType.CONTENT),
                                item("Aplicação guiada", DraftItemType.CONTENT)),
                        section("Consolidar", "Verifique compreensão e aplicação.",
                                item("Síntese do desafio", DraftItemType.CONTENT))
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
                                item("Definição de escopo", DraftItemType.CONTENT)),
                        section("Construção", null,
                                item("Construção inicial", DraftItemType.CONTENT),
                                item("Revisão da construção", DraftItemType.CONTENT)),
                        section("Entrega", null,
                                item("Síntese do projeto", DraftItemType.CONTENT))
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
                                item("Mapa de conhecimentos prévios", DraftItemType.CONTENT)),
                        section("Revisão", null,
                                item("Conceitos essenciais", DraftItemType.CONTENT),
                                item("Revisão orientada", DraftItemType.CONTENT)),
                        section("Verificação", null,
                                item("Síntese para avaliação", DraftItemType.CONTENT))
                )
        );
    }

    private DraftView challengeTemplate(PreviewRequest request) {
        String title = valueOr(request.title(), "Estudo orientado por desafios");
        return new DraftView(
                title,
                valueOr(request.description(), "Percurso de estudo orientado por problemas e estratégias de resolução."),
                ContentIngestionSource.TEMPLATE,
                "Estudo orientado por desafios",
                List.of(
                        section("Preparação", null,
                                item("Briefing do desafio", DraftItemType.CONTENT)),
                        section("Missões", null,
                                item("Análise do desafio", DraftItemType.CONTENT),
                                item("Estratégias de resolução", DraftItemType.CONTENT)),
                        section("Fechamento", null,
                                item("Síntese do desafio", DraftItemType.CONTENT))
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
        NormalizedDocument document = sourceAdapters.normalize(request);
        if (extracted.source() == ContentIngestionSource.MARKDOWN) return fromNormalizedMarkdown(request, document);
        return fromNormalizedText(request, document);
    }

    private DraftView fromNormalizedText(PreviewRequest request, NormalizedDocument document) {
        List<TextBlock> blocks = document.blocks().stream()
                .map(block -> new TextBlock(block.text(), block instanceof NormalizedDocument.Heading))
                .toList();
        DraftView deterministic = fromTextBlocks(request, document, blocks);
        JourneyStructureFallbackService.StructureAssessment assessment = assessTextStructure(request.content(), deterministic, blocks);
        DraftView assessed = new DraftView(
                deterministic.title(), deterministic.description(), deterministic.source(), deterministic.sourceLabel(),
                deterministic.sections(), new StructureAnalysis(
                        "DETERMINISTIC", assessment.confidence(), false, assessment.reason()
                )
        );
        return structureFallback.improveIfUseful(request, assessed, assessment).draft();
    }

    private JourneyStructureFallbackService.StructureAssessment assessTextStructure(
            String content, DraftView draft, List<TextBlock> blocks
    ) {
        String value = content == null ? "" : content.trim();
        if (value.isBlank()) return new JourneyStructureFallbackService.StructureAssessment(1.0, false, "Conteúdo vazio é tratado pela validação de entrada.");
        long headings = blocks.stream().filter(TextBlock::heading).count();
        int items = draft.sections().stream().mapToInt(section -> section.items().size()).sum();
        boolean syntheticGrouping = headings < 2 && items > 6;
        boolean longUnstructured = headings == 0 && value.length() >= 1800 && items >= 4;
        if (syntheticGrouping || longUnstructured) {
            return new JourneyStructureFallbackService.StructureAssessment(
                    headings == 0 ? 0.35 : 0.55, true,
                    "Material sem hierarquia explícita; a Arena aplicou agrupamento determinístico revisável."
            );
        }
        return new JourneyStructureFallbackService.StructureAssessment(
                headings >= 2 ? 0.90 : 0.75, false,
                headings >= 2 ? "Hierarquia textual detectada com confiança." : "Material curto; estrutura determinística suficiente."
        );
    }

    private DraftView fromTextBlocks(PreviewRequest request, NormalizedDocument document, List<TextBlock> blocks) {
        String title = valueOr(document.title(), blocks.isEmpty() ? "Jornada importada" : summarize(blocks.getFirst().text(), 70));
        List<DraftSection> sections = inferSections(blocks);
        return new DraftView(
                title, valueOr(request.description(), "Estrutura sugerida a partir do material fornecido."),
                document.provenance().source(), document.provenance().sourceLabel(), sections
        );
    }

    private List<DraftSection> inferSections(List<TextBlock> blocks) {
        if (blocks.isEmpty()) return List.of(new DraftSection("Conteúdo", null, List.of()));
        long headingCount = blocks.stream().filter(TextBlock::heading).count();
        if (headingCount >= 2) return sectionsFromHeadings(blocks);
        List<DraftItem> items = blocks.stream().filter(block -> !block.heading()).map(block -> contentItem(block.text())).limit(18).toList();
        if (items.isEmpty()) items = List.of(contentItem(blocks.getFirst().text()));
        if (items.size() <= 6) return List.of(new DraftSection("Conteúdo", null, items));
        List<DraftSection> sections = new ArrayList<>();
        for (int start = 0; start < items.size(); start += 3) {
            int end = Math.min(start + 3, items.size());
            List<DraftItem> slice = List.copyOf(items.subList(start, end));
            sections.add(new DraftSection(inferSectionTitle(slice.getFirst().title(), sections.size() + 1),
                    "Agrupamento sugerido a partir da estrutura do documento.", slice));
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
                if (!items.isEmpty()) { sections.add(new DraftSection(sectionTitle, null, List.copyOf(items))); items.clear(); if (sections.size() >= 6) break; }
                sectionTitle = cleanHeading(block.text());
            } else {
                items.add(contentItem(block.text()));
                if (items.size() >= 4) { sections.add(new DraftSection(sectionTitle, null, List.copyOf(items))); items.clear(); sectionTitle += " · continuação"; if (sections.size() >= 6) break; }
            }
        }
        if (!items.isEmpty() && sections.size() < 6) sections.add(new DraftSection(sectionTitle, null, List.copyOf(items)));
        return sections.isEmpty() ? List.of(new DraftSection("Conteúdo", null, blocks.stream().map(block -> contentItem(block.text())).limit(12).toList())) : sections;
    }

    private DraftItem contentItem(String text) {
        String normalized = text.trim();
        String firstLine = normalized.lines().findFirst().orElse(normalized);
        return new DraftItem(summarize(firstLine.replaceFirst("^[•▪◦*-]\\s*", ""), 72), summarize(normalized, 180), DraftItemType.CONTENT, normalized, null);
    }

    private String cleanHeading(String heading) {
        String clean = heading
                .replaceFirst("(?iu)^(m[oó]dulo|cap[ií]tulo|unidade|aula|tema|etapa|se[cç][aã]o|parte)\\s+", "")
                .replaceFirst("^[0-9IVXLC.-]+\\s*[—–:-]?\\s*", "")
                .replaceFirst("^\\d+(?:\\.\\d+){0,3}[).:-]?\\s+", "").trim();
        return summarize(clean.isBlank() ? heading : clean, 80);
    }

    private String inferSectionTitle(String firstItemTitle, int index) {
        String title = summarize(firstItemTitle, 54);
        return title.isBlank() ? "Parte " + index : title;
    }

    private record TextBlock(String text, boolean heading) {}

    private DraftView fromNormalizedMarkdown(PreviewRequest request, NormalizedDocument document) {
        List<DraftSection> sections = mapNormalizedMarkdown(document);
        if (sections.isEmpty()) {
            List<TextBlock> blocks = document.blocks().stream().map(block -> new TextBlock(block.text(), block instanceof NormalizedDocument.Heading)).toList();
            sections = fromTextBlocks(request, document, blocks).sections();
        }
        return new DraftView(
                valueOr(document.title(), "Jornada importada"),
                valueOr(request.description(), "Estrutura preservada a partir do Markdown fornecido."),
                document.provenance().source(), document.provenance().sourceLabel(), sections
        );
    }

    private List<DraftSection> mapNormalizedMarkdown(NormalizedDocument document) {
        List<DraftSection> result = new ArrayList<>();
        String sectionTitle = null;
        StringBuilder sectionIntro = new StringBuilder();
        List<DraftItem> items = new ArrayList<>();
        String contentTitle = null;
        StringBuilder contentBody = new StringBuilder();
        for (NormalizedDocument.Block block : document.blocks()) {
            if (block instanceof NormalizedDocument.Heading heading && heading.level() == 2) {
                if (contentTitle != null) { items.add(markdownItem(contentTitle, contentBody)); contentTitle = null; contentBody.setLength(0); }
                if (sectionTitle != null) addMarkdownSection(result, sectionTitle, sectionIntro, items);
                sectionTitle = heading.text(); sectionIntro.setLength(0); items = new ArrayList<>();
            } else if (block instanceof NormalizedDocument.Heading heading && heading.level() == 3) {
                if (sectionTitle == null) sectionTitle = "Conteúdo";
                if (contentTitle != null) items.add(markdownItem(contentTitle, contentBody));
                contentTitle = heading.text(); contentBody.setLength(0);
            } else {
                String value = block instanceof NormalizedDocument.Heading h
                        ? "#".repeat(h.level()) + " " + h.text()
                        : block.text();
                if (contentTitle != null) appendBlock(contentBody, value); else appendBlock(sectionIntro, value);
            }
        }
        if (contentTitle != null) items.add(markdownItem(contentTitle, contentBody));
        if (sectionTitle != null) addMarkdownSection(result, sectionTitle, sectionIntro, items);
        return result;
    }

    private void addMarkdownSection(List<DraftSection> result, String title, StringBuilder introBuilder, List<DraftItem> items) {
        String intro = introBuilder.toString().trim();
        List<DraftItem> sectionItems = new ArrayList<>(items);
        if (sectionItems.isEmpty() && !intro.isEmpty()) {
            sectionItems.add(new DraftItem(title, summarize(intro, 180), DraftItemType.CONTENT, intro, null));
            intro = "";
        }
        if (!sectionItems.isEmpty()) result.add(new DraftSection(title, intro.isEmpty() ? null : summarize(intro, 180), List.copyOf(sectionItems)));
    }

    private DraftItem markdownItem(String title, StringBuilder bodyBuilder) {
        String body = bodyBuilder.toString().trim();
        return new DraftItem(title, body.isEmpty() ? null : summarize(body, 180), DraftItemType.CONTENT, body.isEmpty() ? null : body, null);
    }

    private void appendBlock(StringBuilder target, String value) {
        if (!target.isEmpty()) target.append("\n\n");
        target.append(value);
    }

    private DraftView fromNormalizedNotion(PreviewRequest request, NormalizedDocument document) {
        if (!document.blocks().isEmpty()) {
            DraftView mapped = fromNormalizedMarkdown(request, document);
            return new DraftView(
                    mapped.title(), valueOr(request.description(), "Snapshot importado de uma página do Notion."),
                    ContentIngestionSource.NOTION, document.provenance().sourceLabel(), mapped.sections(),
                    new StructureAnalysis("DETERMINISTIC", 0.95, false, "Hierarquia preservada do snapshot autorizado do Notion.")
            );
        }
        String sourceUrl = document.provenance().sourceUrl();
        String title = valueOr(document.title(), "Conteúdo do Notion");
        return new DraftView(
                title,
                valueOr(request.description(), "Página vinculada. A leitura automática do conteúdo depende de uma integração autorizada."),
                ContentIngestionSource.NOTION,
                document.provenance().sourceLabel(),
                List.of(section("Material do Notion", null,
                        new DraftItem(title, null, DraftItemType.EXTERNAL_RESOURCE, null, sourceUrl)))
        );
    }

    private DraftView fromLink(PreviewRequest request) {
        String sourceUrl = clean(request.sourceUrl());
        if (sourceUrl == null) throw new IllegalArgumentException("Informe o link do material.");
        validateHttpUrl(sourceUrl);
        String title = valueOr(request.title(), "Recurso externo");
        return new DraftView(
                title,
                valueOr(
                        request.description(),
                        "Link preservado como referência externa."
                ),
                request.source(),
                valueOr(request.sourceLabel(), sourceUrl),
                List.of(section(
                        "Material externo",
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
        String text = value == null ? "" : value
                .replaceAll("(?s)```.*?```", " ")
                .replaceAll("(?m)^#{1,6}\\s+", "")
                .replaceAll("(?m)^\\s*>\\s?", "")
                .replaceAll("(?m)^\\s*[-*+]\\s+", "")
                .replaceAll("!\\[[^]]*]\\([^)]*\\)", " ")
                .replaceAll("\\[([^]]+)]\\([^)]*\\)", "$1")
                .replaceAll("[`*_~]", "")
                .replaceAll("\\s+", " ")
                .trim();
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
            List<DraftSection> sections,
            StructureAnalysis structureAnalysis
    ) {
        public DraftView(String title, String description, ContentIngestionSource source, String sourceLabel, List<DraftSection> sections) {
            this(title, description, source, sourceLabel, sections, null);
        }
    }

    public record StructureAnalysis(
            String mode,
            double confidence,
            boolean aiUsed,
            String message
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
