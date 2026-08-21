package br.com.arenadev.activity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "activity_questions")
public class ActivityQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private QuestionType type;

    @Column(nullable = false, columnDefinition = "text")
    private String statement;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private QuestionDifficulty difficulty;

    @Column(nullable = false)
    private int points;

    @Column(nullable = false)
    private int position;

    @Column(name = "options_json", columnDefinition = "text")
    private String optionsJson;

    @Column(name = "answer_json", columnDefinition = "text")
    private String answerJson;

    @Column(name = "expected_answer", columnDefinition = "text")
    private String expectedAnswer;

    @Column(columnDefinition = "text")
    private String explanation;

    @Column(columnDefinition = "text")
    private String code;

    @Column(length = 80)
    private String language;

    @Column(name = "expected_outcome", columnDefinition = "text")
    private String expectedOutcome;

    @Column(name = "evaluation_criteria_json", columnDefinition = "text")
    private String evaluationCriteriaJson;

    protected ActivityQuestion() {}

    public ActivityQuestion(QuestionType type, String statement, QuestionDifficulty difficulty, int points, int position) {
        this.type = type;
        this.statement = statement;
        this.difficulty = difficulty;
        this.points = points;
        this.position = position;
    }

    void attachTo(Activity activity) { this.activity = activity; }

    public void update(
            QuestionType type,
            String statement,
            QuestionDifficulty difficulty,
            int points,
            int position,
            String optionsJson,
            String answerJson,
            String expectedAnswer,
            String explanation,
            String code,
            String language,
            String expectedOutcome,
            String evaluationCriteriaJson
    ) {
        this.type = type;
        this.statement = statement;
        this.difficulty = difficulty;
        this.points = points;
        this.position = position;
        this.optionsJson = optionsJson;
        this.answerJson = answerJson;
        this.expectedAnswer = expectedAnswer;
        this.explanation = explanation;
        this.code = code;
        this.language = language;
        this.expectedOutcome = expectedOutcome;
        this.evaluationCriteriaJson = evaluationCriteriaJson;
    }

    public UUID getId() { return id; }
    public Activity getActivity() { return activity; }
    public QuestionType getType() { return type; }
    public String getStatement() { return statement; }
    public QuestionDifficulty getDifficulty() { return difficulty; }
    public int getPoints() { return points; }
    public int getPosition() { return position; }
    public String getOptionsJson() { return optionsJson; }
    public String getAnswerJson() { return answerJson; }
    public String getExpectedAnswer() { return expectedAnswer; }
    public String getExplanation() { return explanation; }
    public String getCode() { return code; }
    public String getLanguage() { return language; }
    public String getExpectedOutcome() { return expectedOutcome; }
    public String getEvaluationCriteriaJson() { return evaluationCriteriaJson; }
}
