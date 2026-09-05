package br.com.arenadev.activity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_steps")
public class ActivityStep {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActivityStepType type;

    @Column(length = 180)
    private String title;

    @Column(columnDefinition = "text")
    private String instructions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private ActivityQuestion question;

    @Column(name = "slide_content", columnDefinition = "text")
    private String slideContent;

    @Column(name = "word_cloud_prompt", length = 280)
    private String wordCloudPrompt;

    @Column(name = "word_cloud_max_words")
    private Integer wordCloudMaxWords;

    @Column(name = "word_cloud_live_reveal")
    private Boolean wordCloudLiveReveal;

    @Column(name = "poll_prompt", length = 280)
    private String pollPrompt;

    @Column(name = "poll_options_json", columnDefinition = "text")
    private String pollOptionsJson;

    @Column(name = "poll_live_results")
    private Boolean pollLiveResults;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ActivityStep() {}

    public ActivityStep(ActivityStepType type, int position) {
        this.type = type;
        this.position = position;
    }

    void attachTo(Activity activity) {
        this.activity = activity;
    }

    public void update(
            ActivityStepType type,
            int position,
            String title,
            String instructions,
            ActivityQuestion question,
            String slideContent,
            String wordCloudPrompt,
            Integer wordCloudMaxWords,
            Boolean wordCloudLiveReveal,
            String pollPrompt,
            String pollOptionsJson,
            Boolean pollLiveResults
    ) {
        this.type = type;
        this.position = position;
        this.title = title;
        this.instructions = instructions;
        this.question = type == ActivityStepType.QUESTION ? question : null;
        this.slideContent = type == ActivityStepType.SLIDE ? slideContent : null;
        this.wordCloudPrompt = type == ActivityStepType.WORD_CLOUD ? wordCloudPrompt : null;
        this.wordCloudMaxWords = type == ActivityStepType.WORD_CLOUD ? wordCloudMaxWords : null;
        this.wordCloudLiveReveal = type == ActivityStepType.WORD_CLOUD ? wordCloudLiveReveal : null;
        this.pollPrompt = type == ActivityStepType.POLL ? pollPrompt : null;
        this.pollOptionsJson = type == ActivityStepType.POLL ? pollOptionsJson : null;
        this.pollLiveResults = type == ActivityStepType.POLL ? pollLiveResults : null;
        this.updatedAt = Instant.now();
    }

    public boolean referencesQuestion(ActivityQuestion candidate) {
        if (question == null || candidate == null) return false;
        if (question == candidate) return true;
        return question.getId() != null
                && candidate.getId() != null
                && question.getId().equals(candidate.getId());
    }

    public UUID getId() { return id; }
    public Activity getActivity() { return activity; }
    public int getPosition() { return position; }
    public ActivityStepType getType() { return type; }
    public String getTitle() { return title; }
    public String getInstructions() { return instructions; }
    public ActivityQuestion getQuestion() { return question; }
    public String getSlideContent() { return slideContent; }
    public String getWordCloudPrompt() { return wordCloudPrompt; }
    public Integer getWordCloudMaxWords() { return wordCloudMaxWords; }
    public Boolean getWordCloudLiveReveal() { return wordCloudLiveReveal; }
    public String getPollPrompt() { return pollPrompt; }
    public String getPollOptionsJson() { return pollOptionsJson; }
    public Boolean getPollLiveResults() { return pollLiveResults; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
