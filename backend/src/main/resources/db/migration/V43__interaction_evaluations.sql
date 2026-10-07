create table interaction_evaluations (
    id uuid primary key,
    response_id uuid not null references interaction_responses(id) on delete cascade,
    response_revision integer not null,
    outcome varchar(30) not null,
    score numeric(8, 4),
    evaluator_type varchar(30) not null,
    evaluator_version varchar(80) not null,
    details_json text not null default '{}',
    evaluated_at timestamptz not null default now(),
    constraint uk_interaction_evaluations_response unique (response_id),
    constraint ck_interaction_evaluations_revision check (response_revision >= 1),
    constraint ck_interaction_evaluations_outcome
        check (outcome in ('CORRECT', 'INCORRECT', 'PARTIAL', 'NOT_EVALUATED')),
    constraint ck_interaction_evaluations_evaluator_type
        check (evaluator_type in ('DETERMINISTIC')),
    constraint ck_interaction_evaluations_score
        check (score is null or (score >= 0 and score <= 1))
);

create index idx_interaction_evaluations_outcome
    on interaction_evaluations(outcome, evaluated_at);

comment on table interaction_evaluations is
    'Evaluation derived from an immutable response revision. Raw responses remain in interaction_responses.';
