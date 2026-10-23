-- Segredos gerados pela própria aplicação quando nenhuma variável de ambiente
-- os define. O primeiro uso é o segredo dos ids opacos das alternativas, que
-- precisa sobreviver a reinícios para a mesma tentativa manter os mesmos ids.
create table app_secrets (
    name varchar(64) primary key,
    secret_base64 varchar(128) not null,
    created_at timestamp with time zone not null default now()
);
