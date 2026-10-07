create table interaction_runs (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    interaction_definition_id uuid not null references interaction_definitions(id) on delete restrict,
    status varchar(20) not null default 'CREATED',
    sequence integer not null,
    opened_at timestamptz,
    responses_locked_at timestamptz,
    results_revealed_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_interaction_runs_status
        check (status in ('CREATED', 'ACTIVE', 'CLOSED')),
    constraint ck_interaction_runs_sequence
        check (sequence >= 1),
    constraint uk_interaction_runs_session_sequence
        unique (session_id, sequence)
);

create unique index uk_interaction_runs_one_active_per_session
    on interaction_runs(session_id)
    where status = 'ACTIVE';

create index idx_interaction_runs_session_history
    on interaction_runs(session_id, sequence desc);

create index idx_interaction_runs_definition
    on interaction_runs(interaction_definition_id, created_at desc);

comment on table interaction_runs is
    'Execution of an InteractionDefinition inside one Arena session.';
comment on column interaction_runs.responses_locked_at is
    'Independent response-acceptance boundary; results may be revealed before or after responses are locked.';
comment on column interaction_runs.results_revealed_at is
    'Independent public result visibility marker; does not imply that responses are locked.';
