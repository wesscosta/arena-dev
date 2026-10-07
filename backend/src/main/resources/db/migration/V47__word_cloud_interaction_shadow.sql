create table word_cloud_interaction_shadow_links (
    id uuid primary key,
    word_cloud_round_id uuid not null references word_cloud_rounds(id) on delete cascade,
    interaction_definition_id uuid not null references interaction_definitions(id) on delete restrict,
    interaction_run_id uuid not null references interaction_runs(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint uk_word_cloud_interaction_shadow_round unique (word_cloud_round_id),
    constraint uk_word_cloud_interaction_shadow_run unique (interaction_run_id)
);

create index idx_word_cloud_interaction_shadow_definition
    on word_cloud_interaction_shadow_links(interaction_definition_id);

comment on table word_cloud_interaction_shadow_links is
    'Temporary strangler link between legacy Word Cloud runtime and v0.9 Interaction Core.';
