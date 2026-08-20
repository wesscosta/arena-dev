package br.com.controlealunos.service;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.exception.BusinessException;
import br.com.controlealunos.exception.ValidationException;
import br.com.controlealunos.repository.AlunoRepository;
import br.com.controlealunos.validation.AlunoValidator;

import java.util.List;

public class AlunoService {
    private final AlunoRepository repository;
    private final AlunoValidator validator;

    public AlunoService(AlunoRepository repository, AlunoValidator validator) {
        this.repository = repository;
        this.validator = validator;
    }

    public List<Aluno> listar() {
        return repository.findAll();
    }

    public List<Aluno> pesquisar(String termo) {
        return repository.search(termo);
    }

    public void cadastrar(Aluno aluno) {
        validar(aluno);
        if (repository.findByMatricula(aluno.matricula()).isPresent()) {
            throw new BusinessException("Já existe um aluno com a matrícula " + aluno.matricula() + ".");
        }
        repository.insert(aluno);
    }

    public void atualizar(Aluno aluno) {
        validar(aluno);
        if (repository.findByMatricula(aluno.matricula()).isEmpty()) {
            throw new BusinessException("Aluno não encontrado para atualização.");
        }
        repository.update(aluno);
    }

    public void excluir(int matricula) {
        repository.deleteByMatricula(matricula);
    }

    public int importar(List<Aluno> alunos) {
        if (alunos == null || alunos.isEmpty()) {
            return 0;
        }
        for (int index = 0; index < alunos.size(); index++) {
            int lineNumber = index + 1;
            List<String> errors = validator.validate(alunos.get(index));
            if (!errors.isEmpty()) {
                throw new ValidationException(errors.stream()
                        .map(error -> "Linha " + lineNumber + ": " + error)
                        .toList());
            }
        }
        repository.upsertAll(alunos);
        return alunos.size();
    }

    public boolean bancoDisponivel() {
        return repository.ping();
    }

    private void validar(Aluno aluno) {
        List<String> errors = validator.validate(aluno);
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}
