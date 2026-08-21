package br.com.arenadev.classroom;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    List<Student> findAllByOrderByNameAsc();
    List<Student> findByActiveTrueOrderByNameAsc();
    boolean existsByRegistrationIgnoreCase(String registration);
    boolean existsByRegistrationIgnoreCaseAndIdNot(String registration, UUID id);
}
