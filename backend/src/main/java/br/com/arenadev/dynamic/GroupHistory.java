package br.com.arenadev.dynamic;

import br.com.arenadev.classroom.Classroom;
import br.com.arenadev.session.ClassSession;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_history")
public class GroupHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ClassSession session;

    @Column(name = "groups_json", nullable = false, columnDefinition = "text")
    private String groupsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected GroupHistory() {}

    public GroupHistory(Classroom classroom, ClassSession session, String groupsJson) {
        this.classroom = classroom;
        this.session = session;
        this.groupsJson = groupsJson;
    }

    public String getGroupsJson() { return groupsJson; }
}
