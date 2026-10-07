create table poll_interaction_shadow_links (
    id uuid primary key,
    poll_round_id uuid not null references poll_rounds(id) on delete cascade,
    interaction_definition_id uuid not null references interaction_definitions(id) on delete restrict,
    interaction_run_id uuid not null references interaction_runs(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uk_poll_interaction_shadow_round unique (poll_round_id),
    constraint uk_poll_interaction_shadow_run unique (interaction_run_id)
);

create index idx_poll_interaction_shadow_definition
    on poll_interaction_shadow_links(interaction_definition_id);

comment on table poll_interaction_shadow_links is
    'Temporary strangler link between the legacy Poll runtime and the v0.9 Interaction Core.';
