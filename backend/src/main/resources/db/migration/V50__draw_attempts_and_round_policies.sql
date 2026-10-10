-- Additive v0.10 selection ledger. Historical QUICK_DRAW counters remain untouched.
create table draw_session_settings (
    session_id uuid primary key references class_sessions(id) on delete cascade,
    selection_policy varchar(32) not null default 'ROUND_ROBIN_SHUFFLED',
    round_number integer not null default 1,
    revision bigint not null default 0,
    updated_at timestamptz not null default now(),
    last_round_request_id uuid,
    constraint ck_draw_settings_policy check (selection_policy in ('ROUND_ROBIN_SHUFFLED','BALANCED_WEIGHTED')),
    constraint ck_draw_settings_round check (round_number >= 1)
);

create table draw_attempts (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    student_id uuid not null references students(id),
    sequence integer not null,
    round_number integer not null,
    selection_policy varchar(32) not null,
    status varchar(16) not null default 'PENDING',
    select_request_id uuid not null,
    resolution_request_id uuid,
    resolution_fingerprint varchar(64),
    selected_at timestamptz not null default now(),
    resolved_at timestamptz,
    constraint uk_draw_attempt_session_seq unique (session_id, sequence),
    constraint uk_draw_attempt_select_request unique (session_id, select_request_id),
    constraint uk_draw_attempt_resolve_request unique (session_id, resolution_request_id),
    constraint ck_draw_attempt_status check (status in ('PENDING','CONFIRMED','PASSED','VOIDED')),
    constraint ck_draw_attempt_status_time check (
      (status = 'PENDING' and resolved_at is null and resolution_request_id is null) or
      (status <> 'PENDING' and resolved_at is not null and resolution_request_id is not null)
    ),
    constraint ck_draw_attempt_positive check(sequence >= 1 and round_number >= 1)
);
create unique index uk_draw_attempt_one_pending on draw_attempts(session_id) where status = 'PENDING';
create index idx_draw_attempt_round on draw_attempts(session_id, round_number, status, student_id);

create table draw_attempt_score_links (
    draw_attempt_id uuid primary key references draw_attempts(id) on delete restrict,
    score_event_id uuid not null unique references score_events(id) on delete restrict
);
comment on table draw_attempts is 'Selections are not confirmed participation. State transition is explicit and auditable.';
