package br.com.controlealunos.io;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.domain.Endereco;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class AlunoCsvService {
    private static final String HEADER = String.join(";",
            "matricula", "nome", "email", "cpf", "sexo",
            "tipo_logradouro", "logradouro", "numero", "complemento",
            "bairro", "cep", "cidade", "estado", "telefone"
    );

    public void exportar(Path path, List<Aluno> alunos) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(HEADER);
            writer.newLine();
            for (Aluno aluno : alunos) {
                Endereco endereco = aluno.endereco();
                List<String> fields = List.of(
                        Integer.toString(aluno.matricula()),
                        value(aluno.nome()),
                        value(aluno.email()),
                        value(aluno.cpf()),
                        Character.toString(aluno.sexo()),
                        value(endereco.tipoLogradouro()),
                        value(endereco.logradouro()),
                        endereco.numero() == null ? "" : endereco.numero().toString(),
                        value(endereco.complemento()),
                        value(endereco.bairro()),
                        value(endereco.cep()),
                        value(endereco.cidade()),
                        value(endereco.estado()),
                        value(endereco.telefone())
                );
                writer.write(fields.stream().map(this::escape).reduce((a, b) -> a + ";" + b).orElse(""));
                writer.newLine();
            }
        }
    }

    public List<Aluno> importar(Path path) throws IOException {
        List<Aluno> alunos = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String firstLine = reader.readLine();
            if (firstLine == null) {
                return alunos;
            }

            boolean hasHeader = normalizeHeader(firstLine).startsWith("matricula;nome;");
            if (!hasHeader && !firstLine.isBlank()) {
                alunos.add(parseAluno(firstLine, 1));
            }

            String line;
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (!line.isBlank()) {
                    alunos.add(parseAluno(line, lineNumber));
                }
            }
        }
        return alunos;
    }

    private Aluno parseAluno(String line, int lineNumber) throws IOException {
        List<String> fields = parseLine(line);
        if (fields.size() != 14) {
            throw new IOException("Linha " + lineNumber + " possui " + fields.size()
                    + " campos; eram esperados 14.");
        }

        try {
            int matricula = Integer.parseInt(fields.get(0).trim());
            char sexo = fields.get(4).isBlank() ? 'N' : Character.toUpperCase(fields.get(4).trim().charAt(0));
            Integer numero = fields.get(7).isBlank() ? null : Integer.valueOf(fields.get(7).trim());

            Endereco endereco = new Endereco(
                    fields.get(5), fields.get(6), numero, fields.get(8), fields.get(9),
                    fields.get(10), fields.get(11), fields.get(12), fields.get(13)
            );
            return new Aluno(
                    matricula,
                    fields.get(1),
                    fields.get(2),
                    fields.get(3),
                    sexo,
                    endereco
            );
        } catch (NumberFormatException exception) {
            throw new IOException("Linha " + lineNumber + " possui valor numérico inválido.", exception);
        }
    }

    private List<String> parseLine(String line) throws IOException {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ';' && !quoted) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }

        if (quoted) {
            throw new IOException("CSV inválido: aspas não foram fechadas corretamente.");
        }
        result.add(current.toString());
        return result;
    }

    private String escape(String raw) {
        String value = value(raw);
        if (value.contains(";") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private static String value(String value) {
        return value == null ? "" : value;
    }

    private static String normalizeHeader(String value) {
        return value == null ? "" : value.strip().toLowerCase();
    }
}
