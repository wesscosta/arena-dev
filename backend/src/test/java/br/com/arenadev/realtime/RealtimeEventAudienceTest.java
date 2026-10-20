package br.com.arenadev.realtime;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Who receives each realtime event is decided at every call site. This table
 * is the review point: a new event, or an event reaching a new audience (for
 * example a teacher-only view going to the projector), fails here until the
 * table is updated on purpose.
 */
class RealtimeEventAudienceTest {
    enum Audience { TEACHER, STUDENT, PROJECTOR }

    private static final Map<String, Set<Audience>> EXPECTED = Map.ofEntries(
            Map.entry("BOSS_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("BUZZER_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("LEARNING_CHECK_STATE", EnumSet.of(Audience.TEACHER, Audience.STUDENT)),
            Map.entry("LIVE_STAGE_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("PARTICIPANT_CONNECTED", EnumSet.of(Audience.TEACHER)),
            Map.entry("PARTICIPANT_DISCONNECTED", EnumSet.of(Audience.TEACHER)),
            Map.entry("POLL_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("PUBLIC_RANKING_STATE", EnumSet.of(Audience.PROJECTOR)),
            Map.entry("QUIZ_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("SESSION_FINISHED", EnumSet.allOf(Audience.class)),
            Map.entry("SESSION_RANKING_STATE", EnumSet.of(Audience.TEACHER)),
            Map.entry("TIMER_STATE", EnumSet.allOf(Audience.class)),
            Map.entry("WORD_CLOUD_STATE", EnumSet.allOf(Audience.class))
    );

    private static final Pattern ANY_BROADCAST = Pattern.compile("\\.broadcast(Teachers|Participants|Projectors)?(AfterCommit)?\\(");
    private static final Pattern LITERAL_BROADCAST = Pattern.compile(
            "\\.broadcast(Teachers|Participants|Projectors)?(?:AfterCommit)?\\(\\s*\\w+\\s*,\\s*\"([A-Z_]+)\"");

    @Test
    void everyBroadcastEventReachesOnlyItsReviewedAudience() throws IOException {
        Map<String, Set<Audience>> actual = new TreeMap<>();
        int calls = 0;
        int literalCalls = 0;
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                if (file.endsWith("SessionRealtimeGateway.java")) continue;
                String source = Files.readString(file);
                calls += (int) ANY_BROADCAST.matcher(source).results().count();
                Matcher matcher = LITERAL_BROADCAST.matcher(source);
                while (matcher.find()) {
                    literalCalls++;
                    actual.computeIfAbsent(matcher.group(2), ignored -> EnumSet.noneOf(Audience.class))
                            .addAll(audienceOf(matcher.group(1)));
                }
            }
        }

        assertThat(literalCalls)
                .as("broadcast event types must be string literals so this table can see them")
                .isEqualTo(calls);
        assertThat(actual).isEqualTo(new TreeMap<>(EXPECTED));
    }

    private static Set<Audience> audienceOf(String suffix) {
        if (suffix == null) {
            // Plain broadcast() reaches every socket registered through register():
            // teachers and participants, never projectors.
            return EnumSet.of(Audience.TEACHER, Audience.STUDENT);
        }
        return switch (suffix) {
            case "Teachers" -> EnumSet.of(Audience.TEACHER);
            case "Participants" -> EnumSet.of(Audience.STUDENT);
            case "Projectors" -> EnumSet.of(Audience.PROJECTOR);
            default -> throw new IllegalArgumentException(suffix);
        };
    }
}
