package br.com.arenadev.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TeacherPreferenceRepository extends JpaRepository<TeacherPreference, String> {
}
