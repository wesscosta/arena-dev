alter table interaction_definitions
    add column submission_policy varchar(30) not null default 'UPDATE_UNTIL_CLOSE';

alter table interaction_definitions
    add constraint ck_interaction_definitions_submission_policy
    check (submission_policy in ('ONE_SUBMISSION', 'UPDATE_UNTIL_CLOSE'));

create table interaction_responses (
    id uuid primary key,
    interaction_run_id uuid not null references interaction_runs(id) on delete cascade,
    participant_id uuid not null references session_participants(id) on delete cascade,
    response_json text not null,
    revision integer not null default 1,
    submitted_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uk_interaction_responses_run_participant
        unique (interaction_run_id, participant_id),
    constraint ck_interaction_responses_revision
        check (revision >= 1)
);

create index idx_interaction_responses_run
    on interaction_responses(interaction_run_id, submitted_at);

create index idx_interaction_responses_participant
    on interaction_responses(participant_id, submitted_at desc);

comment on table interaction_responses is
    'Raw participant responses. Evaluation is intentionally persisted separately.';
comment on column interaction_responses.revision is
    'Increments only when UPDATE_UNTIL_CLOSE accepts a changed payload; identical retries are idempotent.';
