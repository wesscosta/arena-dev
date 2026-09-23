create table integration_credentials (
    connection_id uuid primary key references integration_connections(id) on delete cascade,
    encrypted_access_token text,
    encrypted_refresh_token text,
    access_token_expires_at timestamptz,
    updated_at timestamptz not null default now()
);
