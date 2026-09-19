package br.com.arenadev.classroom;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    List<Student> findAllByOrderByNameAsc();
    List<Student> findByActiveTrueOrderByNameAsc();
    Optional<Student> findByRegistrationIgnoreCase(String registration);
    boolean existsByRegistrationIgnoreCase(String registration);
    boolean existsByRegistrationIgnoreCaseAndIdNot(String registration, UUID id);
}
