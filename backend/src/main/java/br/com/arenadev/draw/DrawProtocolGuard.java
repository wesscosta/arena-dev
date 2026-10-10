package br.com.arenadev.draw;

import br.com.arenadev.dynamic.DynamicType;
import br.com.arenadev.dynamic.SessionDynamic;
import br.com.arenadev.dynamic.SessionDynamicRepository;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;
import java.util.UUID;

/** Prevents legacy draw counters and confirmed v0.10 participation from sharing a session. */
@Component
public class DrawProtocolGuard {
    private final DrawSettingsRepository settings;
    private final SessionDynamicRepository dynamics;
    private final JsonMapper mapper;

    public DrawProtocolGuard(DrawSettingsRepository settings, SessionDynamicRepository dynamics, JsonMapper mapper) {
        this.settings = settings;
        this.dynamics = dynamics;
        this.mapper = mapper;
    }

    /** Call after locking the ClassSession row. */
    public void requireLegacyAllowed(UUID sessionId) {
        if (settings.existsById(sessionId)) {
            throw new DrawConflictException("Esta sessão já utiliza o sorteio com confirmação. Atualize a página para continuar.");
        }
    }

    /** Call after locking the ClassSession row, before creating modern settings. */
    public void requireModernAllowed(UUID sessionId) {
        var existing = dynamics.findBySessionIdAndType(sessionId, DynamicType.QUICK_DRAW);
        if (existing.isPresent() && legacySelectionExists(existing.get())) {
            throw new DrawConflictException("Esta sessão já iniciou o sorteio antigo. Encerre-a e inicie uma nova para usar rodadas com confirmação.");
        }
    }

    private boolean legacySelectionExists(SessionDynamic dynamic) {
        try {
            Map<String, Object> data = mapper.readValue(dynamic.getStateJson(), new TypeReference<>() {});
            if (data == null) throw new IllegalStateException("Estado de sorteio ausente.");
            Object last = data.get("lastDrawnStudentId");
            if (last instanceof String text && !text.isBlank()) return true;
            Object counts = data.get("drawCounts");
            if (counts instanceof Map<?, ?> values) {
                return values.values().stream().anyMatch(value -> value instanceof Number n && n.longValue() > 0);
            }
            return counts != null; // Fail closed for unrecognized legacy counters.
        } catch (RuntimeException error) {
            // A malformed legacy state must never be silently treated as an empty draw history.
            throw new DrawConflictException("O histórico antigo de sorteio não pôde ser validado. Inicie outra sessão.");
        }
    }
}
