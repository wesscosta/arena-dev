create table session_timers (
    id uuid primary key,
    session_id uuid not null references class_sessions(id),
    title varchar(160) not null,
    instructions varchar(500),
    status varchar(20) not null,
    duration_seconds integer not null,
    remaining_seconds integer not null,
    started_at timestamptz,
    ends_at timestamptz,
    paused_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint ck_session_timers_duration
        check (duration_seconds between 1 and 86400),

    constraint ck_session_timers_remaining
        check (remaining_seconds >= 0),

    constraint ck_session_timers_status
        check (
            status in ('READY', 'RUNNING', 'PAUSED', 'FINISHED', 'CANCELLED')
        )
);

create index idx_session_timers_session_created
    on session_timers(session_id, created_at desc);

create unique index uk_session_timers_open_per_session
    on session_timers(session_id)
    where status in ('READY', 'RUNNING', 'PAUSED');
