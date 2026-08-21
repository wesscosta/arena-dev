package br.com.arenadev.classroom;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    List<Enrollment> findByClassroomIdOrderByStudentNameAsc(UUID classroomId);
    List<Enrollment> findByClassroomIdAndActiveTrueOrderByStudentNameAsc(UUID classroomId);
    Optional<Enrollment> findByClassroomIdAndStudentId(UUID classroomId, UUID studentId);
}
