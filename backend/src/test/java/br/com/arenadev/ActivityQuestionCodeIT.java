package br.com.arenadev;

import br.com.arenadev.activity.ActivityRepository;
import br.com.arenadev.activity.ActivityService;
import br.com.arenadev.activity.ActivityService.ActivityInput;
import br.com.arenadev.activity.ActivityService.QuestionInput;
import br.com.arenadev.activity.ActivityService.QuestionOptionInput;
import br.com.arenadev.activity.ActivityService.QuestionView;
import br.com.arenadev.activity.QuestionDifficulty;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.classroom.ClassroomRepository;
import br.com.arenadev.support.SharedPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** code e language são opcionais em qualquer tipo de questão, inclusive BUG_FIX. */
@SpringBootTest
class ActivityQuestionCodeIT {
    private static final String PYTHON = "def main():\n    app = QApplication(sys.argv)\n    return app.exec()";
    private static final String SQL = "SELECT nome\n  FROM alunos\n WHERE ativo;";

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, ActivityQuestionCodeIT.class);
    }

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        activityRepository.deleteAll();
        classroomRepository.deleteAll();
    }

    @Test
    void persistsAndReturnsCodeForEveryQuestionTypeOnlyWhenInformed() {
        Classroom classroom = classroomRepository.save(new Classroom("TDS", "TDS-CODE"));
        List<QuestionInput> questions = List.of(
                question(QuestionType.MULTIPLE_CHOICE, PYTHON, "python",
                        List.of(option("A"), option("B"), option("C"), option("D")), "B", null, null, null),
                question(QuestionType.OPEN, null, null, null, null, "Resposta esperada", null, null),
                question(QuestionType.TRUE_FALSE, SQL, "sql", null, true, null, null, null),
                question(QuestionType.BUG_FIX, null, null, null, null, "Use total += valor.", null, null),
                question(QuestionType.ANALYSIS, PYTHON, "python", null, null, "Análise esperada", null, null),
                question(QuestionType.PRACTICAL, SQL, "sql", null, null, null, "Consulta executa", List.of("Filtra ativos")),
                question(QuestionType.SCENARIO, null, null, null, null, "Resposta do cenário", null, null)
        );

        ActivityService.ActivityView created = activityService.create(new ActivityInput(
                classroom.getId(), "Código nas questões", "Python", 10, 0, null, questions
        ));

        List<QuestionView> returned = activityService.get(created.id()).questions();
        assertThat(returned).extracting(QuestionView::type).containsExactly(
                QuestionType.MULTIPLE_CHOICE, QuestionType.OPEN, QuestionType.TRUE_FALSE, QuestionType.BUG_FIX,
                QuestionType.ANALYSIS, QuestionType.PRACTICAL, QuestionType.SCENARIO
        );
        assertThat(returned).extracting(QuestionView::code)
                .containsExactly(PYTHON, null, SQL, null, PYTHON, SQL, null);
        assertThat(returned).extracting(QuestionView::language)
                .containsExactly("python", null, "sql", null, "python", "sql", null);

        Map<String, String> storedCode = new HashMap<>();
        Map<String, String> storedLanguage = new HashMap<>();
        jdbcTemplate.query(
                "select type, code, language from activity_questions where activity_id = ?",
                row -> {
                    storedCode.put(row.getString("type"), row.getString("code"));
                    storedLanguage.put(row.getString("type"), row.getString("language"));
                },
                created.id()
        );
        assertThat(storedCode).hasSize(7)
                .containsEntry("MULTIPLE_CHOICE", PYTHON)
                .containsEntry("TRUE_FALSE", SQL)
                .containsEntry("ANALYSIS", PYTHON)
                .containsEntry("PRACTICAL", SQL)
                .containsEntry("OPEN", null)
                .containsEntry("BUG_FIX", null)
                .containsEntry("SCENARIO", null);
        assertThat(storedLanguage)
                .containsEntry("MULTIPLE_CHOICE", "python")
                .containsEntry("PRACTICAL", "sql")
                .containsEntry("BUG_FIX", null);
    }

    private static QuestionOptionInput option(String id) {
        return new QuestionOptionInput(id, "Alternativa " + id);
    }

    private static QuestionInput question(
            QuestionType type, String code, String language, List<QuestionOptionInput> options, Object answer,
            String expectedAnswer, String expectedOutcome, List<String> evaluationCriteria
    ) {
        return new QuestionInput(
                null, type, "Enunciado de " + type.name() + ", em texto corrido.", QuestionDifficulty.INTERMEDIATE, 2,
                options, answer, expectedAnswer, null, code, language, expectedOutcome, evaluationCriteria
        );
    }
}
