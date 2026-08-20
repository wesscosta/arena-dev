package br.com.controlealunos.ui;

import br.com.controlealunos.domain.Aluno;
import br.com.controlealunos.domain.Endereco;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Frame;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.util.Optional;

public class AlunoDialog extends JDialog {
    private final JTextField matriculaField = new JTextField(15);
    private final JTextField nomeField = new JTextField(28);
    private final JTextField emailField = new JTextField(28);
    private final JTextField cpfField = new JTextField(18);
    private final JComboBox<String> sexoCombo =
            new JComboBox<>(new String[]{"Não informado", "Masculino", "Feminino"});

    private final JComboBox<String> tipoLogradouroCombo =
            new JComboBox<>(new String[]{"Rua", "Avenida", "Travessa", "Praça", "Rodovia", "Outro"});
    private final JTextField logradouroField = new JTextField(28);
    private final JTextField numeroField = new JTextField(8);
    private final JTextField complementoField = new JTextField(20);
    private final JTextField bairroField = new JTextField(20);
    private final JTextField cepField = new JTextField(12);
    private final JTextField cidadeField = new JTextField(20);
    private final JTextField estadoField = new JTextField(4);
    private final JTextField telefoneField = new JTextField(16);

    private Aluno result;

    public AlunoDialog(Frame owner, Aluno aluno) {
        super(owner, aluno == null ? "Novo aluno" : "Editar aluno", true);
        buildUi();

        if (aluno != null) {
            fill(aluno);
            matriculaField.setEnabled(false);
        }

        pack();
        setMinimumSize(new Dimension(610, 580));
        setLocationRelativeTo(owner);
    }

    public static Optional<Aluno> showDialog(Frame owner, Aluno aluno) {
        AlunoDialog dialog = new AlunoDialog(owner, aluno);
        dialog.setVisible(true);
        return Optional.ofNullable(dialog.result);
    }

    private void buildUi() {
        JPanel fieldsPanel = new JPanel(new GridBagLayout());
        fieldsPanel.setBorder(BorderFactory.createEmptyBorder(12, 12, 12, 12));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1;

        int row = 0;
        row = addField(fieldsPanel, gbc, row, "Matrícula *", matriculaField);
        row = addField(fieldsPanel, gbc, row, "Nome *", nomeField);
        row = addField(fieldsPanel, gbc, row, "E-mail", emailField);
        row = addField(fieldsPanel, gbc, row, "CPF", cpfField);
        row = addField(fieldsPanel, gbc, row, "Sexo", sexoCombo);

        JLabel addressTitle = new JLabel("Endereço (opcional)");
        addressTitle.setBorder(BorderFactory.createEmptyBorder(12, 0, 3, 0));

        gbc.gridx = 0;
        gbc.gridy = row++;
        gbc.gridwidth = 2;
        fieldsPanel.add(addressTitle, gbc);
        gbc.gridwidth = 1;

        row = addField(fieldsPanel, gbc, row, "Tipo", tipoLogradouroCombo);
        row = addField(fieldsPanel, gbc, row, "Logradouro", logradouroField);
        row = addField(fieldsPanel, gbc, row, "Número", numeroField);
        row = addField(fieldsPanel, gbc, row, "Complemento", complementoField);
        row = addField(fieldsPanel, gbc, row, "Bairro", bairroField);
        row = addField(fieldsPanel, gbc, row, "CEP", cepField);
        row = addField(fieldsPanel, gbc, row, "Cidade", cidadeField);
        row = addField(fieldsPanel, gbc, row, "UF", estadoField);
        addField(fieldsPanel, gbc, row, "Telefone", telefoneField);

        JButton saveButton = new JButton("Salvar");
        JButton cancelButton = new JButton("Cancelar");

        saveButton.addActionListener(event -> save());
        cancelButton.addActionListener(event -> dispose());
        getRootPane().setDefaultButton(saveButton);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        actions.add(cancelButton);
        actions.add(saveButton);

        setLayout(new BorderLayout());
        add(new JScrollPane(fieldsPanel), BorderLayout.CENTER);
        add(actions, BorderLayout.SOUTH);
    }

    private int addField(
            JPanel panel,
            GridBagConstraints gbc,
            int row,
            String label,
            Component component
    ) {
        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.weightx = 0;
        panel.add(new JLabel(label), gbc);

        gbc.gridx = 1;
        gbc.weightx = 1;
        panel.add(component, gbc);

        return row + 1;
    }

    private void fill(Aluno aluno) {
        matriculaField.setText(Integer.toString(aluno.matricula()));
        nomeField.setText(aluno.nome());
        emailField.setText(aluno.email());
        cpfField.setText(aluno.cpf());

        sexoCombo.setSelectedIndex(switch (Character.toUpperCase(aluno.sexo())) {
            case 'M' -> 1;
            case 'F' -> 2;
            default -> 0;
        });

        Endereco endereco = aluno.endereco();

        if (endereco.tipoLogradouro() != null && !endereco.tipoLogradouro().isBlank()) {
            tipoLogradouroCombo.setSelectedItem(endereco.tipoLogradouro());
        }

        logradouroField.setText(endereco.logradouro());
        numeroField.setText(endereco.numero() == null ? "" : endereco.numero().toString());
        complementoField.setText(endereco.complemento());
        bairroField.setText(endereco.bairro());
        cepField.setText(endereco.cep());
        cidadeField.setText(endereco.cidade());
        estadoField.setText(endereco.estado());
        telefoneField.setText(endereco.telefone());
    }

    private void save() {
        try {
            int matricula = parseMatricula();
            Integer numero = parseNumero();

            char sexo = switch (sexoCombo.getSelectedIndex()) {
                case 1 -> 'M';
                case 2 -> 'F';
                default -> 'N';
            };

            Endereco endereco = new Endereco(
                    selected(tipoLogradouroCombo),
                    logradouroField.getText().trim(),
                    numero,
                    complementoField.getText().trim(),
                    bairroField.getText().trim(),
                    cepField.getText().trim(),
                    cidadeField.getText().trim(),
                    estadoField.getText().trim().toUpperCase(),
                    telefoneField.getText().trim()
            );

            result = new Aluno(
                    matricula,
                    nomeField.getText().trim(),
                    emailField.getText().trim(),
                    cpfField.getText().trim(),
                    sexo,
                    endereco
            );

            dispose();
        } catch (IllegalArgumentException exception) {
            JOptionPane.showMessageDialog(
                    this,
                    exception.getMessage(),
                    "Dados inválidos",
                    JOptionPane.WARNING_MESSAGE
            );
        }
    }

    private int parseMatricula() {
        String value = matriculaField.getText().trim();

        if (value.isEmpty()) {
            matriculaField.requestFocusInWindow();
            throw new IllegalArgumentException("Matrícula é obrigatória.");
        }

        try {
            int matricula = Integer.parseInt(value);

            if (matricula <= 0) {
                matriculaField.requestFocusInWindow();
                throw new IllegalArgumentException("Matrícula deve ser maior que zero.");
            }

            return matricula;
        } catch (NumberFormatException exception) {
            matriculaField.requestFocusInWindow();
            throw new IllegalArgumentException("Matrícula deve conter apenas números.");
        }
    }

    private Integer parseNumero() {
        String value = numeroField.getText().trim();

        if (value.isEmpty()) {
            return null;
        }

        try {
            int numero = Integer.parseInt(value);

            if (numero < 0) {
                numeroField.requestFocusInWindow();
                throw new IllegalArgumentException(
                        "Número do endereço não pode ser negativo."
                );
            }

            return numero;
        } catch (NumberFormatException exception) {
            numeroField.requestFocusInWindow();
            throw new IllegalArgumentException(
                    "Número do endereço deve conter apenas números."
            );
        }
    }

    private static String selected(JComboBox<String> comboBox) {
        Object item = comboBox.getSelectedItem();
        return item == null ? "" : item.toString();
    }
}
