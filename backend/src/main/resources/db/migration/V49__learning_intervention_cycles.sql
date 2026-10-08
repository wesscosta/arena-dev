-- v0.10: a pedagogical intervention links separate, immutable interaction runs.
create table learning_intervention_cycles (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    learning_target_id uuid not null references learning_targets(id) on delete restrict,
    baseline_run_id uuid not null references interaction_runs(id) on delete restrict,
    followup_run_id uuid references interaction_runs(id) on delete restrict,
    intervention_note varchar(2000),
    status varchar(20) not null default 'DIAGNOSED',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_learning_cycle_status check (status in ('DIAGNOSED', 'INTERVENED', 'VERIFIED')),
    constraint ck_learning_cycle_distinct_runs check (followup_run_id is null or baseline_run_id <> followup_run_id),
    constraint ck_learning_cycle_intervention_status check (status = 'DIAGNOSED' or intervention_note is not null),
    constraint ck_learning_cycle_verified check (status <> 'VERIFIED' or followup_run_id is not null),
    constraint uk_learning_cycle_baseline unique (baseline_run_id),
    constraint uk_learning_cycle_followup unique (followup_run_id)
);
create index idx_learning_cycles_session on learning_intervention_cycles(session_id, created_at desc);
comment on table learning_intervention_cycles is 'Links diagnostic run, documented teacher intervention and distinct follow-up run. Does not represent mastery.';
