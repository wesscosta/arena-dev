create table session_events (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    sequence_no bigint generated always as identity unique,
    event_type varchar(64) not null,
    actor varchar(24) not null,
    summary varchar(280) not null,
    payload_json text not null default '{}',
    occurred_at timestamptz not null default now()
);

create index idx_session_events_session_sequence
    on session_events(session_id, sequence_no desc);
