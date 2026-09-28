package br.com.arenadev.study;
import br.com.arenadev.journey.JourneyStage;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="student_journey_stage_progress",uniqueConstraints=@UniqueConstraint(name="uk_student_journey_stage_progress",columnNames={"journey_stage_id","student_journey_access_id"}))
public class StudentJourneyStageProgress {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="journey_stage_id",nullable=false) private JourneyStage stage;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="student_journey_access_id",nullable=false) private StudentJourneyAccess access;
 @Column(name="started_at") private Instant startedAt; @Column(name="completed_at") private Instant completedAt;
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 protected StudentJourneyStageProgress(){} public StudentJourneyStageProgress(JourneyStage stage,StudentJourneyAccess access){this.stage=stage;this.access=access;}
 public void start(Instant when){if(startedAt==null){startedAt=when;updatedAt=when;}}
 public void complete(Instant when){if(startedAt==null)startedAt=when;if(completedAt==null)completedAt=when;updatedAt=when;}
 public JourneyStage getStage(){return stage;} public Instant getStartedAt(){return startedAt;} public Instant getCompletedAt(){return completedAt;} public Instant getUpdatedAt(){return updatedAt;}
}
