package br.com.controlealunos.domain;

public record Endereco(
        String tipoLogradouro,
        String logradouro,
        Integer numero,
        String complemento,
        String bairro,
        String cep,
        String cidade,
        String estado,
        String telefone
) {
    public static Endereco vazio() {
        return new Endereco("", "", null, "", "", "", "", "", "");
    }
}
