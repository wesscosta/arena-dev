package br.com.controlealunos.repository;

import br.com.controlealunos.domain.Aluno;

import java.util.List;
import java.util.Optional;

public interface AlunoRepository {
    List<Aluno> findAll();
    List<Aluno> search(String term);
    Optional<Aluno> findByMatricula(int matricula);
    void insert(Aluno aluno);
    void update(Aluno aluno);
    void deleteByMatricula(int matricula);
    void upsertAll(List<Aluno> alunos);
    boolean ping();
}
