create table interaction_shadow_observations (
    id uuid primary key,
    interaction_type varchar(30) not null,
    legacy_round_id uuid not null,
    interaction_run_id uuid references interaction_runs(id) on delete set null,
    run_status varchar(20),
    status varchar(20) not null,
    mismatches_json text not null default '[]',
    legacy_response_count bigint,
    observed_at timestamptz not null default now(),
    constraint ck_interaction_shadow_observations_type
        check (interaction_type in ('QUIZ', 'POLL', 'WORD_CLOUD')),
    constraint ck_interaction_shadow_observations_run_status
        check (run_status is null or run_status in ('CREATED', 'ACTIVE', 'CLOSED')),
    constraint ck_interaction_shadow_observations_status
        check (status in ('EQUIVALENT', 'MISMATCH', 'SYNC_ERROR')),
    constraint ck_interaction_shadow_observations_response_count
        check (legacy_response_count is null or legacy_response_count >= 0)
);

create index idx_interaction_shadow_observations_type_time
    on interaction_shadow_observations(interaction_type, observed_at desc);

create index idx_interaction_shadow_observations_round_time
    on interaction_shadow_observations(interaction_type, legacy_round_id, observed_at desc);

comment on table interaction_shadow_observations is
    'Durable v0.9 cutover evidence for strangler/shadow equivalence. Legacy ids intentionally have no foreign key so legacy tables can be retired later.';
