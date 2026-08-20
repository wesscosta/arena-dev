package br.com.controlealunos.ui;

import br.com.controlealunos.domain.Aluno;

import javax.swing.table.AbstractTableModel;
import java.util.ArrayList;
import java.util.List;

public class AlunoTableModel extends AbstractTableModel {
    private static final String[] COLUMNS = {
            "Matrícula", "Nome", "E-mail", "CPF", "Sexo", "Cidade", "Telefone"
    };

    private List<Aluno> alunos = new ArrayList<>();

    public void setAlunos(List<Aluno> alunos) {
        this.alunos = new ArrayList<>(alunos);
        fireTableDataChanged();
    }

    public Aluno getAlunoAt(int row) {
        return alunos.get(row);
    }

    @Override
    public int getRowCount() {
        return alunos.size();
    }

    @Override
    public int getColumnCount() {
        return COLUMNS.length;
    }

    @Override
    public String getColumnName(int column) {
        return COLUMNS[column];
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        Aluno aluno = alunos.get(rowIndex);
        return switch (columnIndex) {
            case 0 -> aluno.matricula();
            case 1 -> aluno.nome();
            case 2 -> aluno.email();
            case 3 -> aluno.cpf();
            case 4 -> aluno.sexo();
            case 5 -> aluno.endereco().cidade();
            case 6 -> aluno.endereco().telefone();
            default -> "";
        };
    }
}
