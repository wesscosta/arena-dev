create table word_cloud_rounds (
    id uuid primary key,
    session_id uuid not null references class_sessions(id),
    prompt varchar(280) not null,
    status varchar(20) not null,
    live_reveal boolean not null default false,
    max_words_per_participant smallint not null default 1,
    revealed_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_word_cloud_round_status check (
        status in ('COLLECTING', 'REVEALED', 'CLOSED')
    ),
    constraint ck_word_cloud_round_max_words check (
        max_words_per_participant between 1 and 5
    )
);

create index idx_word_cloud_rounds_session_created
    on word_cloud_rounds(session_id, created_at desc);

create unique index uk_word_cloud_open_round_per_session
    on word_cloud_rounds(session_id)
    where status in ('COLLECTING', 'REVEALED');

create table word_cloud_submissions (
    id uuid primary key,
    round_id uuid not null references word_cloud_rounds(id) on delete cascade,
    participant_id uuid not null references session_participants(id),
    raw_text varchar(60) not null,
    normalized_text varchar(60) not null,
    created_at timestamptz not null default now()
);

create index idx_word_cloud_submissions_round
    on word_cloud_submissions(round_id, created_at);

create index idx_word_cloud_submissions_frequency
    on word_cloud_submissions(round_id, normalized_text);

create unique index uk_word_cloud_term_per_participant
    on word_cloud_submissions(round_id, participant_id, normalized_text);
