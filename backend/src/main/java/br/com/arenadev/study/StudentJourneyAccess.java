package br.com.arenadev.study;
import br.com.arenadev.classroom.Student;
import br.com.arenadev.journey.Journey;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="student_journey_access",uniqueConstraints=@UniqueConstraint(name="uk_student_journey_access",columnNames={"student_id","journey_id"}))
public class StudentJourneyAccess {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="student_id",nullable=false) private Student student;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="journey_id",nullable=false) private Journey journey;
 @Column(nullable=false,length=20) private String source="CODE";
 @Column(name="redeemed_at",nullable=false,updatable=false) private Instant redeemedAt=Instant.now();
 protected StudentJourneyAccess(){} public StudentJourneyAccess(Student student,Journey journey){this.student=student;this.journey=journey;}
 public UUID getId(){return id;} public Student getStudent(){return student;} public Journey getJourney(){return journey;}
 public String getSource(){return source;} public Instant getRedeemedAt(){return redeemedAt;}
}
