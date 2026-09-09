package br.com.arenadev.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityStepRepository extends JpaRepository<ActivityStep, UUID> {
}
