-- v0.11: Immutable public presentation snapshots, scoped to a single live session.
-- Only status/revoked_at/withdraw_request_id change after insert. Publication is NOT a second Library.
create table arena_material_publications (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    resource_id uuid not null references learning_resources(id) on delete restrict,
    resource_revision integer not null check(resource_revision > 0),
    title varchar(180) not null,
    format varchar(24) not null check(format in ('MARKDOWN', 'PLAIN_TEXT')),
    snapshot_body text not null,
    outline_json jsonb not null default '[]'::jsonb,
    parser_version varchar(40) not null,
    content_sha256 char(64) not null,
    request_id uuid not null,
    expected_stage_version bigint not null check(expected_stage_version >= 0),
    published_stage_version bigint not null check(published_stage_version > 0),
    status varchar(16) not null check(status in ('ACTIVE','REVOKED')),
    created_at timestamptz not null default now(),
    revoked_at timestamptz,
    withdraw_request_id uuid,
    unique(session_id,request_id),
    constraint arena_material_revocation_consistent check(
        (status='ACTIVE' and revoked_at is null)
        or (status='REVOKED' and revoked_at is not null)
    )
);
create unique index uq_arena_material_active_session on arena_material_publications(session_id)
    where status='ACTIVE';
create index idx_arena_material_resource_active on arena_material_publications(resource_id)
    where status='ACTIVE';
comment on table arena_material_publications is
    'Immutable public projection snapshots; only an explicitly active session presentation can be fetched by code.';
