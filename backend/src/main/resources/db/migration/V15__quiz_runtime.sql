create table quiz_rounds (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    question_id uuid not null references activity_questions(id) on delete restrict,
    status varchar(20) not null,
    opened_at timestamptz,
    locked_at timestamptz,
    revealed_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index uk_quiz_current_round_per_session
    on quiz_rounds(session_id)
    where status in ('READY', 'OPEN', 'LOCKED', 'REVEALED');

create index idx_quiz_rounds_session on quiz_rounds(session_id, created_at desc);
create index idx_quiz_rounds_question on quiz_rounds(question_id);

create table quiz_participant_answers (
    id uuid primary key,
    round_id uuid not null references quiz_rounds(id) on delete cascade,
    participant_id uuid not null references session_participants(id) on delete cascade,
    answer_json text not null,
    submitted_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_quiz_answer_round_participant unique (round_id, participant_id)
);

create index idx_quiz_answers_round on quiz_participant_answers(round_id, submitted_at);
create index idx_quiz_answers_participant on quiz_participant_answers(participant_id, submitted_at desc);
