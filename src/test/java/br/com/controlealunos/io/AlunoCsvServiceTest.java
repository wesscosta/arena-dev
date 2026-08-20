package br.com.controlealunos.io;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.domain.Endereco;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AlunoCsvServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void deveExportarEImportarPreservandoDados() throws Exception {
        AlunoCsvService csv = new AlunoCsvService();
        Path file = tempDir.resolve("alunos.csv");
        Aluno original = new Aluno(
                42,
                "Ana; Souza",
                "ana@example.com",
                "",
                'F',
                new Endereco("Rua", "Exemplo", 10, "Apto \"A\"", "Centro", "", "Teresina", "PI", "")
        );

        csv.exportar(file, List.of(original));
        List<Aluno> imported = csv.importar(file);

        assertEquals(1, imported.size());
        assertEquals(original, imported.getFirst());
    }
}
