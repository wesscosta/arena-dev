create table poll_rounds (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    prompt varchar(280) not null,
    status varchar(20) not null,
    live_results boolean not null default false,
    revealed_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index uk_poll_open_round_per_session
    on poll_rounds(session_id)
    where status in ('OPEN', 'REVEALED');

create index idx_poll_rounds_session
    on poll_rounds(session_id, created_at desc);

create table poll_options (
    id uuid primary key,
    round_id uuid not null references poll_rounds(id) on delete cascade,
    label varchar(160) not null,
    position integer not null,
    constraint uk_poll_option_round_position unique (round_id, position)
);

create index idx_poll_options_round
    on poll_options(round_id, position);

create table poll_votes (
    id uuid primary key,
    round_id uuid not null references poll_rounds(id) on delete cascade,
    participant_id uuid not null references session_participants(id) on delete cascade,
    option_id uuid not null references poll_options(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uk_poll_vote_round_participant unique (round_id, participant_id)
);

create index idx_poll_votes_round
    on poll_votes(round_id, created_at);
