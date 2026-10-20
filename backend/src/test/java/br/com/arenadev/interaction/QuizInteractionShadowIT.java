package br.com.arenadev.interaction;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.activity.ActivityResourceKind;
import br.com.arenadev.activity.ActivityService;
import br.com.arenadev.activity.QuestionDifficulty;
import br.com.arenadev.activity.QuestionType;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.classroom.StudentService;
import br.com.arenadev.quiz.QuizService;
import br.com.arenadev.session.SessionParticipant;
import br.com.arenadev.session.SessionParticipantRepository;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "app.learning-core.quiz-shadow-enabled=true")
class QuizInteractionShadowIT {
    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, QuizInteractionShadowIT.class);
    }

    @Autowired private ClassroomService classroomService;
    @Autowired private StudentService studentService;
    @Autowired private SessionService sessionService;
    @Autowired private SessionParticipantRepository participantRepository;
    @Autowired private ActivityService activityService;
    @Autowired private QuizService quizService;
    @Autowired private QuizInteractionShadowService shadowService;
    @Autowired private QuizInteractionShadowLinkRepository linkRepository;
    @Autowired private InteractionResponseRepository responseRepository;
    @Autowired private InteractionEvaluationRepository evaluationRepository;
    @Autowired private InteractionShadowObservationRepository observationRepository;

    @Test
    void automaticShadowMatchesLegacyQuizAcrossAnswerChangeLockRevealAndClose() {
        Scenario scenario = scenario();
        UUID firstParticipant = scenario.participants().get(0).getId();
        UUID secondParticipant = scenario.participants().get(1).getId();

        QuizService.StateView prepared =
                quizService.prepare(scenario.sessionId(), scenario.questionId());

        QuizInteractionShadowLink preparedLink = link(prepared.round().id());
        assertThat(preparedLink.getRun().getStatus()).isEqualTo(InteractionRunStatus.CREATED);
        assertThat(preparedLink.getRun().acceptsResponses()).isFalse();

        quizService.open(scenario.sessionId(), prepared.round().id());
        QuizInteractionShadowLink openedLink = link(prepared.round().id());
        assertThat(openedLink.getRun().getStatus()).isEqualTo(InteractionRunStatus.ACTIVE);
        assertThat(openedLink.getRun().acceptsResponses()).isTrue();

        quizService.answer(scenario.sessionId(), prepared.round().id(), firstParticipant, "b");
        quizService.answer(scenario.sessionId(), prepared.round().id(), firstParticipant, "a");
        quizService.answer(scenario.sessionId(), prepared.round().id(), secondParticipant, "b");

        QuizInteractionShadowLink answeredLink = link(prepared.round().id());
        InteractionResponse changed = responseRepository
                .findByRunIdAndParticipantId(answeredLink.getRun().getId(), firstParticipant)
                .orElseThrow();
        assertThat(changed.getRevision()).isEqualTo(2);

        quizService.lock(scenario.sessionId(), prepared.round().id());

        QuizInteractionShadowLink lockedLink = link(prepared.round().id());
        assertThat(lockedLink.getRun().acceptsResponses()).isFalse();
        assertThat(evaluationRepository.findByResponseRunIdOrderByEvaluatedAtAsc(
                lockedLink.getRun().getId()
        )).hasSize(2);

        QuizInteractionShadowService.ShadowComparison comparison =
                shadowService.compare(prepared.round().id());
        assertThat(comparison.equivalent()).isTrue();
        assertThat(comparison.mismatches()).isEmpty();
        assertThat(comparison.legacy().responseCount()).isEqualTo(2);
        assertThat(comparison.legacy().distribution())
                .containsEntry("a", 1L)
                .containsEntry("b", 1L)
                .containsEntry("c", 0L)
                .containsEntry("d", 0L);
        assertThat(comparison.legacy().evaluatedCount()).isEqualTo(2);
        assertThat(comparison.legacy().correctCount()).isEqualTo(1);
        assertThat(comparison.shadow().evaluation().accuracy()).isEqualTo(0.5);

        quizService.reveal(scenario.sessionId(), prepared.round().id());
        assertThat(link(prepared.round().id()).getRun().resultsVisiblePublicly()).isTrue();

        quizService.close(scenario.sessionId(), prepared.round().id());
        assertThat(link(prepared.round().id()).getRun().getStatus())
                .isEqualTo(InteractionRunStatus.CLOSED);

        assertThat(shadowService.compare(prepared.round().id()).equivalent()).isTrue();
        assertThat(observationRepository.findAll()).anyMatch(observation ->
                observation.getLegacyRoundId().equals(prepared.round().id())
                        && observation.terminal()
                        && observation.getStatus()
                        == InteractionShadowObservationStatus.EQUIVALENT
        );
    }

    private QuizInteractionShadowLink link(UUID quizRoundId) {
        return linkRepository.findByQuizRoundIdWithGraph(quizRoundId).orElseThrow();
    }

    private Scenario scenario() {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        var classroom = classroomService.create("Turma Shadow " + suffix, "SH" + suffix);

        ArrayList<UUID> studentIds = new ArrayList<>();
        for (int index = 1; index <= 2; index++) {
            var student = studentService.create(
                    "SH-" + suffix + "-" + index,
                    "Aluno Shadow " + index + " " + suffix,
                    null
            );
            classroomService.enroll(classroom.id(), student.id());
            studentIds.add(student.id());
        }

        var session = sessionService.start(classroom.id(), "Aula Shadow", Set.copyOf(studentIds));
        UUID questionId = createQuestion(classroom.id(), suffix);
        List<SessionParticipant> participants =
                participantRepository.findBySessionIdOrderByStudentNameAsc(session.id());

        return new Scenario(session.id(), questionId, participants);
    }

    private UUID createQuestion(UUID classroomId, String suffix) {
        ActivityService.ActivityView activity = activityService.create(
                new ActivityService.ActivityInput(
                        classroomId,
                        "Atividade Shadow " + suffix,
                        "Validação strangler Quiz → Interaction",
                        100,
                        0,
                        new ActivityService.ResourceInput(ActivityResourceKind.INTERNAL, null, null),
                        List.of(new ActivityService.QuestionInput(
                                null,
                                QuestionType.MULTIPLE_CHOICE,
                                "Questão Shadow " + suffix,
                                QuestionDifficulty.EASY,
                                10,
                                List.of(
                                        new ActivityService.QuestionOptionInput("a", "Alternativa A"),
                                        new ActivityService.QuestionOptionInput("b", "Alternativa B"),
                                        new ActivityService.QuestionOptionInput("c", "Alternativa C"),
                                        new ActivityService.QuestionOptionInput("d", "Alternativa D")
                                ),
                                "a",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                        ))
                )
        );
        return UUID.fromString(activity.questions().getFirst().id());
    }

    private record Scenario(
            UUID sessionId,
            UUID questionId,
            List<SessionParticipant> participants
    ) {
    }
}
