create table session_join_codes (
    id uuid primary key,
    session_id uuid not null unique references class_sessions(id) on delete cascade,
    code varchar(8) not null unique,
    active boolean not null default true,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

alter table session_participants
    add column access_token_hash varchar(64);

create unique index uk_session_participant_access_token_hash
    on session_participants(access_token_hash)
    where access_token_hash is not null;

create table buzzer_rounds (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    status varchar(20) not null,
    opened_at timestamptz not null default now(),
    closed_at timestamptz,
    created_at timestamptz not null default now()
);

create unique index uk_buzzer_open_round_per_session
    on buzzer_rounds(session_id)
    where status = 'OPEN';

create table buzzer_presses (
    id uuid primary key,
    round_id uuid not null references buzzer_rounds(id) on delete cascade,
    participant_id uuid not null references session_participants(id) on delete cascade,
    position integer not null,
    received_at timestamptz not null default now(),
    constraint uk_buzzer_press_round_participant unique (round_id, participant_id),
    constraint uk_buzzer_press_round_position unique (round_id, position)
);

create index idx_session_join_codes_code on session_join_codes(code);
create index idx_buzzer_rounds_session on buzzer_rounds(session_id, opened_at desc);
create index idx_buzzer_presses_round on buzzer_presses(round_id, position);
