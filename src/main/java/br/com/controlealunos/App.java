package br.com.controlealunos;

import br.com.controlealunos.config.DatabaseConfig;
import br.com.controlealunos.io.AlunoCsvService;
import br.com.controlealunos.repository.JdbcAlunoRepository;
import br.com.controlealunos.service.AlunoService;
import br.com.controlealunos.ui.MainFrame;
import br.com.controlealunos.validation.AlunoValidator;

import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;

public final class App {
    private App() {
    }

    public static void main(String[] args) {
        setSystemLookAndFeel();

        DatabaseConfig config = DatabaseConfig.load();
        JdbcAlunoRepository repository = new JdbcAlunoRepository(config);
        AlunoService service = new AlunoService(repository, new AlunoValidator());

        if (!service.bancoDisponivel()) {
            JOptionPane.showMessageDialog(
                    null,
                    "Não foi possível conectar ao banco de dados.\n\n"
                            + "Configuração: " + config.maskedDescription() + "\n\n"
                            + "1. Copie .env.example para .env\n"
                            + "2. Execute: docker compose up -d\n"
                            + "3. Inicie a aplicação novamente.",
                    "Banco de dados indisponível",
                    JOptionPane.ERROR_MESSAGE
            );
            return;
        }

        SwingUtilities.invokeLater(() -> new MainFrame(service, new AlunoCsvService()).setVisible(true));
    }

    private static void setSystemLookAndFeel() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
            // O look and feel padrão do Swing continua funcional.
        }
    }
}
