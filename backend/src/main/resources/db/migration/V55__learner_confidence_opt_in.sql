-- Self-perception is NOT the evaluator confidence stored in learning_evidence.
-- No student identity or confidence is ever placed in score_events or ranking.
create table learner_confidence (
    run_id uuid not null references interaction_runs(id) on delete cascade,
    participant_id uuid not null references session_participants(id) on delete cascade,
    level varchar(8) not null check(level in ('LOW','MEDIUM','HIGH','SKIPPED')),
    recorded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint pk_learner_confidence primary key(run_id,participant_id)
);
create index idx_learner_confidence_participant on learner_confidence(participant_id);
comment on table learner_confidence is 'Optional student self-report, teacher receives aggregate only, never ranking/mastery.';
