package br.com.arenadev.interaction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "interaction_options")
public class InteractionOption {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interaction_definition_id", nullable = false)
    private InteractionDefinition definition;

    @Column(name = "option_key", nullable = false, length = 100)
    private String optionKey;

    @Column(nullable = false, columnDefinition = "text")
    private String label;

    @Column(nullable = false)
    private int position;

    @Column(name = "metadata_json", nullable = false, columnDefinition = "text")
    private String metadataJson = "{}";

    protected InteractionOption() {
    }

    InteractionOption(
            InteractionDefinition definition,
            String optionKey,
            String label,
            int position,
            String metadataJson
    ) {
        this.definition = Objects.requireNonNull(definition, "A definição da interação é obrigatória.");
        this.optionKey = requireText(optionKey, "A chave da alternativa é obrigatória.", 100);
        this.label = requireText(label, "O rótulo da alternativa é obrigatório.", null);
        if (position < 0) {
            throw new IllegalArgumentException("A posição da alternativa não pode ser negativa.");
        }
        this.position = position;
        this.metadataJson = normalizeJson(metadataJson);
    }

    private static String requireText(String value, String message, Integer maxLength) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        String normalized = value.trim();
        if (maxLength != null && normalized.length() > maxLength) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private static String normalizeJson(String value) {
        return value == null || value.isBlank() ? "{}" : value.trim();
    }

    public UUID getId() { return id; }
    public InteractionDefinition getDefinition() { return definition; }
    public String getOptionKey() { return optionKey; }
    public String getLabel() { return label; }
    public int getPosition() { return position; }
    public String getMetadataJson() { return metadataJson; }
}
