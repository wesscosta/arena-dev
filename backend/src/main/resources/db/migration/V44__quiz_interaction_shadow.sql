create table quiz_interaction_shadow_links (
    id uuid primary key,
    quiz_round_id uuid not null references quiz_rounds(id) on delete cascade,
    interaction_definition_id uuid not null references interaction_definitions(id) on delete restrict,
    interaction_run_id uuid not null references interaction_runs(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uk_quiz_interaction_shadow_round unique (quiz_round_id),
    constraint uk_quiz_interaction_shadow_run unique (interaction_run_id)
);

create index idx_quiz_interaction_shadow_definition
    on quiz_interaction_shadow_links(interaction_definition_id);

comment on table quiz_interaction_shadow_links is
    'Temporary strangler link between the legacy Quiz runtime and the v0.9 Interaction Core.';
