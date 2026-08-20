package br.com.controlealunos.ui;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.exception.BusinessException;
import br.com.controlealunos.exception.RepositoryException;
import br.com.controlealunos.exception.ValidationException;
import br.com.controlealunos.io.AlunoCsvService;
import br.com.controlealunos.service.AlunoService;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public class MainFrame extends JFrame {
    private final AlunoService service;
    private final AlunoCsvService csvService;
    private final AlunoTableModel tableModel = new AlunoTableModel();
    private final JTable table = new JTable(tableModel);
    private final JTextField searchField = new JTextField(24);
    private final JLabel statusLabel = new JLabel(" ");

    public MainFrame(AlunoService service, AlunoCsvService csvService) {
        super("Controle de Alunos — Legacy v0.2");
        this.service = service;
        this.csvService = csvService;
        buildUi();
        refresh();
    }

    private void buildUi() {
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(980, 620));
        setSize(1100, 680);
        setLocationRelativeTo(null);
        setJMenuBar(buildMenu());

        JPanel header = new JPanel(new BorderLayout(12, 12));
        header.setBorder(BorderFactory.createEmptyBorder(16, 16, 8, 16));
        JLabel title = new JLabel("Controle de Alunos");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 24f));
        JLabel subtitle = new JLabel("Versão 0.2 — Java 21 + Swing + JDBC + MySQL");
        JPanel titlePanel = new JPanel(new GridLayout(2, 1, 0, 2));
        titlePanel.add(title);
        titlePanel.add(subtitle);
        header.add(titlePanel, BorderLayout.WEST);

        JPanel search = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        search.add(new JLabel("Pesquisar:"));
        search.add(searchField);
        header.add(search, BorderLayout.EAST);

        searchField.getDocument().addDocumentListener(new DocumentListener() {
            @Override public void insertUpdate(DocumentEvent e) { search(); }
            @Override public void removeUpdate(DocumentEvent e) { search(); }
            @Override public void changedUpdate(DocumentEvent e) { search(); }
        });

        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setRowHeight(28);
        table.setAutoCreateRowSorter(true);
        table.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent event) {
                if (event.getClickCount() == 2 && table.getSelectedRow() >= 0) {
                    editSelected();
                }
            }
        });

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT));
        actions.setBorder(BorderFactory.createEmptyBorder(6, 12, 6, 12));
        JButton newButton = new JButton("+ Novo aluno");
        JButton editButton = new JButton("Editar");
        JButton deleteButton = new JButton("Excluir");
        JButton importButton = new JButton("Importar CSV/TXT");
        JButton exportButton = new JButton("Exportar CSV");
        JButton refreshButton = new JButton("Atualizar");

        newButton.addActionListener(event -> createStudent());
        editButton.addActionListener(event -> editSelected());
        deleteButton.addActionListener(event -> deleteSelected());
        importButton.addActionListener(event -> importFile());
        exportButton.addActionListener(event -> exportFile());
        refreshButton.addActionListener(event -> refresh());

        actions.add(newButton);
        actions.add(editButton);
        actions.add(deleteButton);
        actions.add(importButton);
        actions.add(exportButton);
        actions.add(refreshButton);

        JPanel footer = new JPanel(new BorderLayout());
        footer.setBorder(BorderFactory.createEmptyBorder(4, 16, 10, 16));
        footer.add(statusLabel, BorderLayout.WEST);

        add(header, BorderLayout.NORTH);
        add(new JScrollPane(table), BorderLayout.CENTER);
        add(actions, BorderLayout.SOUTH);
        JPanel container = new JPanel(new BorderLayout());
        container.add(actions, BorderLayout.NORTH);
        container.add(footer, BorderLayout.SOUTH);
        add(container, BorderLayout.SOUTH);
    }

    private JMenuBar buildMenu() {
        JMenuBar menuBar = new JMenuBar();
        JMenu arquivo = new JMenu("Arquivo");
        JMenuItem importar = new JMenuItem("Importar CSV/TXT...");
        JMenuItem exportar = new JMenuItem("Exportar CSV...");
        JMenuItem sair = new JMenuItem("Sair");
        importar.addActionListener(event -> importFile());
        exportar.addActionListener(event -> exportFile());
        sair.addActionListener(event -> dispose());
        arquivo.add(importar);
        arquivo.add(exportar);
        arquivo.addSeparator();
        arquivo.add(sair);
        menuBar.add(arquivo);
        return menuBar;
    }

    private void createStudent() {
        AlunoDialog.showDialog(this, null).ifPresent(aluno -> execute(() -> {
            service.cadastrar(aluno);
            refresh();
            showInfo("Aluno cadastrado com sucesso.");
        }));
    }

    private void editSelected() {
        Aluno selected = getSelectedAluno();
        if (selected == null) {
            return;
        }
        AlunoDialog.showDialog(this, selected).ifPresent(aluno -> execute(() -> {
            service.atualizar(aluno);
            refresh();
            showInfo("Aluno atualizado com sucesso.");
        }));
    }

    private void deleteSelected() {
        Aluno selected = getSelectedAluno();
        if (selected == null) {
            return;
        }

        int answer = JOptionPane.showConfirmDialog(
                this,
                "Excluir " + selected.nome() + " (matrícula " + selected.matricula() + ")?",
                "Confirmar exclusão",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE
        );
        if (answer != JOptionPane.YES_OPTION) {
            return;
        }

        execute(() -> {
            service.excluir(selected.matricula());
            refresh();
            showInfo("Aluno excluído com sucesso.");
        });
    }

    private void importFile() {
        JFileChooser chooser = new JFileChooser();
        chooser.setDialogTitle("Importar alunos");
        chooser.setFileFilter(new FileNameExtensionFilter("CSV ou TXT (*.csv, *.txt)", "csv", "txt"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) {
            return;
        }

        execute(() -> {
            try {
                List<Aluno> alunos = csvService.importar(chooser.getSelectedFile().toPath());
                int imported = service.importar(alunos);
                refresh();
                showInfo(imported + " aluno(s) importado(s). Matrículas existentes foram atualizadas.");
            } catch (IOException exception) {
                throw new BusinessException("Falha ao importar arquivo: " + exception.getMessage());
            }
        });
    }

    private void exportFile() {
        JFileChooser chooser = new JFileChooser();
        chooser.setDialogTitle("Exportar alunos");
        chooser.setSelectedFile(new java.io.File("alunos.csv"));
        chooser.setFileFilter(new FileNameExtensionFilter("CSV (*.csv)", "csv"));
        if (chooser.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
            return;
        }

        execute(() -> {
            Path path = chooser.getSelectedFile().toPath();
            if (!path.getFileName().toString().toLowerCase().endsWith(".csv")) {
                path = path.resolveSibling(path.getFileName() + ".csv");
            }
            try {
                csvService.exportar(path, service.listar());
                showInfo("Arquivo exportado para:\n" + path.toAbsolutePath());
            } catch (IOException exception) {
                throw new BusinessException("Falha ao exportar arquivo: " + exception.getMessage());
            }
        });
    }

    private void search() {
        SwingUtilities.invokeLater(() -> executeQuietly(() -> updateTable(service.pesquisar(searchField.getText()))));
    }

    private void refresh() {
        executeQuietly(() -> {
            searchField.setText("");
            updateTable(service.listar());
        });
    }

    private void updateTable(List<Aluno> alunos) {
        tableModel.setAlunos(alunos);
        statusLabel.setText(alunos.size() + " aluno(s) exibido(s) • Banco conectado");
    }

    private Aluno getSelectedAluno() {
        int viewRow = table.getSelectedRow();
        if (viewRow < 0) {
            JOptionPane.showMessageDialog(
                    this,
                    "Selecione um aluno na tabela.",
                    "Nenhum aluno selecionado",
                    JOptionPane.INFORMATION_MESSAGE
            );
            return null;
        }
        int modelRow = table.convertRowIndexToModel(viewRow);
        return tableModel.getAlunoAt(modelRow);
    }

    private void execute(Runnable action) {
        try {
            action.run();
        } catch (ValidationException exception) {
            showError(String.join("\n", exception.getErrors()), "Validação");
        } catch (BusinessException exception) {
            showError(exception.getMessage(), "Operação não concluída");
        } catch (RepositoryException exception) {
            showError(exception.getMessage() + databaseHint(exception), "Erro de banco de dados");
        } catch (RuntimeException exception) {
            showError("Erro inesperado: " + exception.getMessage(), "Erro");
        }
    }

    private void executeQuietly(Runnable action) {
        try {
            action.run();
        } catch (RepositoryException exception) {
            statusLabel.setText("Banco indisponível");
            showError(exception.getMessage() + databaseHint(exception), "Erro de banco de dados");
        }
    }

    private String databaseHint(RepositoryException exception) {
        Throwable cause = exception.getCause();
        String causeText = cause == null ? "" : "\n\nDetalhe: " + cause.getMessage();
        return causeText + "\n\nVerifique se o MySQL está ativo: docker compose up -d";
    }

    private void showInfo(String message) {
        JOptionPane.showMessageDialog(this, message, "Controle de Alunos", JOptionPane.INFORMATION_MESSAGE);
    }

    private void showError(String message, String title) {
        JOptionPane.showMessageDialog(this, message, title, JOptionPane.ERROR_MESSAGE);
    }
}
